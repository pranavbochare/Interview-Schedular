import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound, wrap } from '../lib/errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { computeJourney } from '../lib/journey.js';
import { activeBookingInclude, cancelBookingBySystem } from '../lib/bookingService.js';
import { notify } from '../lib/notify.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const idParam = z.coerce.number().int().positive();

// ---------- students ----------
const studentRows = async () => {
  const profiles = await prisma.studentProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, active: true } },
      bookings: {
        orderBy: { createdAt: 'desc' },
        include: { ...activeBookingInclude, outcome: true },
      },
    },
    orderBy: { rollNo: 'asc' },
  });
  return profiles.map((p) => {
    const active = p.bookings.find((b) => b.status === 'BOOKED') ?? null;
    const last = p.bookings.find((b) => b.outcome)?.outcome ?? null;
    const journey = computeJourney(p, active, last);
    return {
      id: p.id,
      name: p.user.name,
      email: p.user.email,
      active: p.user.active,
      rollNo: p.rollNo,
      college: p.college,
      track: p.track,
      skillsCleared: p.skillsCleared,
      skillsRequired: p.skillsRequired,
      badgeStatus: p.badgeStatus,
      malpracticeFlagged: p.malpracticeFlagged,
      malpracticeNote: p.malpracticeNote,
      state: journey.state,
      attempts: p.bookings.filter((b) => b.outcome).length,
      nextInterview: active && { startsAt: active.slot.startsAt, interviewer: active.slot.interviewer.name },
      lastResult: last?.result ?? null,
    };
  });
};

router.get(
  '/students',
  wrap(async (req, res) => {
    const q = z
      .object({ state: z.string().optional(), track: z.string().optional(), search: z.string().optional() })
      .parse(req.query);
    let rows = await studentRows();
    if (q.state) rows = rows.filter((r) => r.state === q.state);
    if (q.track) rows = rows.filter((r) => r.track === q.track);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((r) => [r.name, r.email, r.rollNo].some((v) => v.toLowerCase().includes(s)));
    }
    res.json({ students: rows });
  }),
);

router.get(
  '/stats',
  wrap(async (_req, res) => {
    const rows = await studentRows();
    const count = (s) => rows.filter((r) => r.state === s).length;
    const eligible = rows.filter((r) => !['NOT_ELIGIBLE', 'NULLIFIED', 'PASSED'].includes(r.state));
    const [openSlots, interviewers] = await Promise.all([
      prisma.availabilitySlot.count({ where: { status: 'OPEN', startsAt: { gt: new Date() } } }),
      prisma.user.count({ where: { role: 'INTERVIEWER', active: true } }),
    ]);
    res.json({
      totalStudents: rows.length,
      eligible: eligible.length,
      booked: count('BOOKED') + count('AWAITING_OUTCOME'),
      unbooked: rows.filter((r) => ['ELIGIBLE', 'FAILED', 'RETAKE_LATER'].includes(r.state)).length,
      passed: count('PASSED'),
      failed: count('FAILED'),
      retake: count('RETAKE_LATER'),
      nullified: count('NULLIFIED'),
      notEligible: count('NOT_ELIGIBLE'),
      openSlots,
      interviewers,
    });
  }),
);

const studentCreate = z.object({
  name: z.string().trim().min(2),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8),
  rollNo: z.string().trim().min(3),
  college: z.string().trim().min(2),
  track: z.string().trim().min(2),
  skillsRequired: z.coerce.number().int().min(1).max(20).default(5),
  skillsCleared: z.coerce.number().int().min(0).default(0),
});

router.post(
  '/students',
  wrap(async (req, res) => {
    const d = studentCreate.parse(req.body);
    if (d.skillsCleared > d.skillsRequired) throw badRequest('Cleared skills cannot exceed required skills.');
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw conflict('Email already in use', 'EMAIL_TAKEN');
    if (await prisma.studentProfile.findUnique({ where: { rollNo: d.rollNo } })) throw conflict('Roll number already exists', 'ROLL_TAKEN');
    const user = await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        role: 'STUDENT',
        passwordHash: await bcrypt.hash(d.password, 10),
        student: {
          create: {
            rollNo: d.rollNo,
            college: d.college,
            track: d.track,
            skillsRequired: d.skillsRequired,
            skillsCleared: d.skillsCleared,
          },
        },
      },
    });
    res.status(201).json({ id: user.id });
  }),
);

// Update skills cleared (eligibility is derived from cleared >= required)
router.patch(
  '/students/:id/skills',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { skillsCleared } = z.object({ skillsCleared: z.coerce.number().int().min(0) }).parse(req.body);
    const p = await prisma.studentProfile.findUnique({ where: { id } });
    if (!p) throw notFound('Student not found');
    if (skillsCleared > p.skillsRequired) throw badRequest('Cleared skills cannot exceed required skills.');
    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({ where: { id }, data: { skillsCleared } });
      if (skillsCleared >= p.skillsRequired && p.skillsCleared < p.skillsRequired) {
        await notify(tx, p.userId, 'ELIGIBILITY', "You're eligible for your interview", 'You have cleared every skill for your Track Badge. Book your interview slot now.');
      }
    });
    res.json({ ok: true });
  }),
);

// ---------- malpractice ----------
router.post(
  '/students/:id/malpractice',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { note } = z.object({ note: z.string().trim().min(5).max(500) }).parse(req.body);
    await prisma.$transaction(async (tx) => {
      const p = await tx.studentProfile.findUnique({ where: { id } });
      if (!p) throw notFound('Student not found');
      if (p.malpracticeFlagged) throw conflict('Student is already flagged.', 'ALREADY_FLAGGED');

      // Void any pending interview and free the slot for others
      const active = await tx.booking.findFirst({ where: { studentId: id, status: 'BOOKED' }, include: { slot: true } });
      if (active) {
        await cancelBookingBySystem(tx, active, { reason: 'malpractice flag', keepSlot: true, notifyStudent: false });
      }
      await tx.studentProfile.update({
        where: { id },
        data: { malpracticeFlagged: true, malpracticeNote: note, malpracticeFlaggedAt: new Date(), badgeStatus: 'NULLIFIED' },
      });
      await notify(tx, p.userId, 'MALPRACTICE', 'Your badge has been nullified', `${note}. Contact the GRIT team if you believe this is a mistake.`);
    });
    res.json({ ok: true });
  }),
);

router.delete(
  '/students/:id/malpractice',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    await prisma.$transaction(async (tx) => {
      const p = await tx.studentProfile.findUnique({ where: { id } });
      if (!p) throw notFound('Student not found');
      if (!p.malpracticeFlagged) throw conflict('Student is not flagged.', 'NOT_FLAGGED');
      const passed = await tx.interviewOutcome.count({ where: { result: 'PASS', booking: { studentId: id } } });
      await tx.studentProfile.update({
        where: { id },
        data: {
          malpracticeFlagged: false,
          malpracticeNote: null,
          malpracticeFlaggedAt: null,
          badgeStatus: passed ? 'EARNED' : p.skillsCleared >= p.skillsRequired ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
        },
      });
      await notify(tx, p.userId, 'MALPRACTICE', 'Your flag has been cleared', 'The malpractice flag on your account was reviewed and removed.');
    });
    res.json({ ok: true });
  }),
);

// ---------- interviewers ----------
router.get(
  '/interviewers',
  wrap(async (_req, res) => {
    const list = await prisma.user.findMany({
      where: { role: 'INTERVIEWER' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, active: true },
    });
    const now = new Date();
    const rows = await Promise.all(
      list.map(async (u) => ({
        ...u,
        openSlots: await prisma.availabilitySlot.count({ where: { interviewerId: u.id, status: 'OPEN', startsAt: { gt: now } } }),
        upcoming: await prisma.availabilitySlot.count({ where: { interviewerId: u.id, status: 'BOOKED', startsAt: { gt: now } } }),
        completed: await prisma.interviewOutcome.count({ where: { recordedById: u.id } }),
      })),
    );
    res.json({ interviewers: rows });
  }),
);

router.post(
  '/interviewers',
  wrap(async (req, res) => {
    const d = z
      .object({ name: z.string().trim().min(2), email: z.string().email().toLowerCase(), password: z.string().min(8) })
      .parse(req.body);
    if (await prisma.user.findUnique({ where: { email: d.email } })) throw conflict('Email already in use', 'EMAIL_TAKEN');
    const u = await prisma.user.create({
      data: { name: d.name, email: d.email, role: 'INTERVIEWER', passwordHash: await bcrypt.hash(d.password, 10) },
    });
    res.status(201).json({ id: u.id });
  }),
);

// Deactivating an interviewer cancels their upcoming bookings and tells the students
router.patch(
  '/interviewers/:id/active',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    let affected = 0;
    await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id } });
      if (!u || u.role !== 'INTERVIEWER') throw notFound('Interviewer not found');
      await tx.user.update({ where: { id }, data: { active } });
      if (!active) {
        const bookings = await tx.booking.findMany({
          where: { status: 'BOOKED', slot: { interviewerId: id, startsAt: { gt: new Date() } } },
          include: { slot: true },
        });
        for (const b of bookings) {
          await cancelBookingBySystem(tx, b, { reason: 'your interviewer is no longer available', keepSlot: false });
        }
        affected = bookings.length;
        await tx.availabilitySlot.updateMany({
          where: { interviewerId: id, status: 'OPEN', startsAt: { gt: new Date() } },
          data: { status: 'CANCELLED' },
        });
      }
    });
    res.json({ ok: true, cancelledBookings: affected });
  }),
);

// ---------- results ----------
router.get(
  '/results',
  wrap(async (req, res) => {
    const q = z.object({ result: z.enum(['PASS', 'FAIL', 'RETAKE_LATER']).optional() }).parse(req.query);
    const outcomes = await prisma.interviewOutcome.findMany({
      where: q.result ? { result: q.result } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        recordedBy: { select: { name: true } },
        booking: { include: { slot: true, student: { include: { user: { select: { name: true } } } } } },
      },
    });
    res.json({
      results: outcomes.map((o) => ({
        id: o.id,
        result: o.result,
        feedback: o.feedback,
        recordedAt: o.createdAt,
        interviewer: o.recordedBy.name,
        interviewAt: o.booking.slot.startsAt,
        student: {
          id: o.booking.student.id,
          name: o.booking.student.user.name,
          rollNo: o.booking.student.rollNo,
          track: o.booking.student.track,
          malpracticeFlagged: o.booking.student.malpracticeFlagged,
        },
      })),
    });
  }),
);

// All upcoming bookings across the team (calendar view)
router.get(
  '/schedule',
  wrap(async (_req, res) => {
    const bookings = await prisma.booking.findMany({
      where: { status: { in: ['BOOKED', 'COMPLETED'] } },
      include: { ...activeBookingInclude, student: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        startsAt: b.slot.startsAt,
        endsAt: b.slot.endsAt,
        interviewer: b.slot.interviewer.name,
        student: b.student.user.name,
        rollNo: b.student.rollNo,
      })),
    });
  }),
);

export default router;
