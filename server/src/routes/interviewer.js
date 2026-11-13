import { Router } from 'express';
import { z } from 'zod';
import { addDays, addMinutes, isAfter } from 'date-fns';
import { fmtDay, fmtWhen } from '../lib/time.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { badRequest, conflict, forbidden, notFound, wrap } from '../lib/errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { cancelBookingBySystem } from '../lib/bookingService.js';
import { notify } from '../lib/notify.js';

const router = Router();
router.use(authenticate, authorize('INTERVIEWER'));

const idParam = z.coerce.number().int().positive();

const slotInclude = {
  bookings: {
    where: { status: { in: ['BOOKED', 'COMPLETED', 'NO_SHOW'] } },
    include: { student: { include: { user: { select: { name: true, email: true } } } }, outcome: true },
  },
};

const shapeSlot = (s) => {
  const b = s.bookings?.[0] ?? null;
  return {
    id: s.id,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    status: s.status,
    booking: b && {
      id: b.id,
      status: b.status,
      student: {
        id: b.student.id,
        name: b.student.user.name,
        email: b.student.user.email,
        rollNo: b.student.rollNo,
        track: b.student.track,
        college: b.student.college,
        malpracticeFlagged: b.student.malpracticeFlagged,
      },
      outcome: b.outcome && { result: b.outcome.result, feedback: b.outcome.feedback, retakeAfter: b.outcome.retakeAfter },
    },
  };
};

router.get(
  '/slots',
  wrap(async (req, res) => {
    const q = z
      .object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() })
      .parse(req.query);
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        interviewerId: req.user.id,
        status: { not: 'CANCELLED' },
        ...(q.from || q.to ? { startsAt: { ...(q.from && { gte: q.from }), ...(q.to && { lt: q.to }) } } : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: slotInclude,
    });
    res.json({ slots: slots.map(shapeSlot) });
  }),
);

// Generates consecutive slots inside a window, e.g. 10:00-13:00 in 45 min blocks
const createSchema = z
  .object({
    rangeStart: z.coerce.date(),
    rangeEnd: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(120).default(45),
  })
  .refine((v) => isAfter(v.rangeEnd, v.rangeStart), { message: 'End time must be after start time', path: ['rangeEnd'] });

router.post(
  '/slots',
  wrap(async (req, res) => {
    const { rangeStart, rangeEnd, durationMinutes } = createSchema.parse(req.body);
    if (!isAfter(rangeStart, new Date())) throw badRequest('Availability must be in the future.');
    if (isAfter(rangeEnd, addDays(rangeStart, 1))) throw badRequest('A single window can span at most 24 hours.');

    const generated = [];
    for (let s = rangeStart; !isAfter(addMinutes(s, durationMinutes), rangeEnd); s = addMinutes(s, durationMinutes)) {
      generated.push({ startsAt: s, endsAt: addMinutes(s, durationMinutes) });
    }
    if (!generated.length) throw badRequest('The window is shorter than one interview slot.');
    if (generated.length > 24) throw badRequest('That would create more than 24 slots at once.');

    // Overlap check against my own live slots (cancelled ones don't block)
    const clash = await prisma.availabilitySlot.findFirst({
      where: {
        interviewerId: req.user.id,
        status: { not: 'CANCELLED' },
        startsAt: { lt: generated.at(-1).endsAt },
        endsAt: { gt: generated[0].startsAt },
      },
    });
    if (clash) {
      throw conflict(
        `This overlaps your existing slot on ${fmtWhen(clash.startsAt)}.`,
        'SLOT_OVERLAP',
      );
    }

    // Reuse CANCELLED rows with the same start (unique on interviewerId+startsAt)
    await prisma.$transaction(
      generated.map((g) =>
        prisma.availabilitySlot.upsert({
          where: { interviewerId_startsAt: { interviewerId: req.user.id, startsAt: g.startsAt } },
          update: { endsAt: g.endsAt, status: 'OPEN' },
          create: { interviewerId: req.user.id, ...g },
        }),
      ),
    );
    res.status(201).json({ created: generated.length });
  }),
);

router.delete(
  '/slots/:id',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const reason = z.object({ reason: z.string().trim().min(3).max(200).optional() }).parse(req.body ?? {}).reason;

    await prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id },
        include: { bookings: { where: { status: 'BOOKED' }, include: { slot: true } } },
      });
      if (!slot || slot.interviewerId !== req.user.id) throw notFound('Slot not found');
      if (slot.status === 'CANCELLED') return;

      const booking = slot.bookings[0];
      if (booking) {
        if (!reason) {
          throw conflict('A student has booked this slot. Give a reason to cancel it and notify them.', 'SLOT_BOOKED');
        }
        await cancelBookingBySystem(tx, booking, { reason: `Interviewer unavailable (${reason})`, keepSlot: false });
      } else {
        await tx.availabilitySlot.update({ where: { id }, data: { status: 'CANCELLED' } });
      }
    });
    res.json({ ok: true });
  }),
);

async function ownBooking(tx, bookingId, interviewerId) {
  const b = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { slot: true, student: true },
  });
  if (!b || b.slot.interviewerId !== interviewerId) throw notFound('Booking not found');
  if (b.status !== 'BOOKED') throw conflict('This interview is already closed.', 'NOT_ACTIVE');
  if (isAfter(b.slot.startsAt, new Date())) throw badRequest('You can record an outcome once the interview has started.', 'TOO_EARLY');
  return b;
}

const outcomeSchema = z
  .object({
    result: z.enum(['PASS', 'FAIL', 'RETAKE_LATER']),
    feedback: z.string().trim().max(2000).optional(),
    retakeAfter: z.coerce.date().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.result !== 'PASS' && (v.feedback?.length ?? 0) < 10) {
      ctx.addIssue({ code: 'custom', path: ['feedback'], message: 'Please add at least 10 characters of feedback for the student.' });
    }
  });

router.post(
  '/bookings/:id/outcome',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const input = outcomeSchema.parse(req.body);

    await prisma.$transaction(async (tx) => {
      const b = await ownBooking(tx, id, req.user.id);
      const student = await tx.studentProfile.findUnique({ where: { id: b.studentId } });
      if (student.malpracticeFlagged) {
        throw forbidden('This student has a malpractice flag. Contact an admin.');
      }

      const now = new Date();
      let retakeAfter = null;
      if (input.result === 'FAIL') retakeAfter = addDays(now, config.failCooldownDays);
      if (input.result === 'RETAKE_LATER') {
        retakeAfter = input.retakeAfter ?? addDays(now, config.failCooldownDays);
        if (!isAfter(retakeAfter, now)) throw badRequest('Retake date must be in the future.');
      }

      await tx.interviewOutcome.create({
        data: { bookingId: id, result: input.result, feedback: input.feedback || null, retakeAfter, recordedById: req.user.id },
      });
      await tx.booking.update({
        where: { id },
        data: { status: 'COMPLETED', activeSlotKey: null, activeStudentKey: null },
      });
      await tx.studentProfile.update({
        where: { id: b.studentId },
        data: { retakeAfter, ...(input.result === 'PASS' ? { badgeStatus: 'EARNED' } : {}) },
      });

      const copy = {
        PASS: ['You earned your badge!', `Congratulations! You cleared your ${student.track} interview and earned your Track Badge.`],
        FAIL: ['Interview result: not cleared', `You did not clear this attempt. You can book again from ${fmtDay(retakeAfter ?? now)}. Feedback: ${input.feedback}`],
        RETAKE_LATER: ['Retake later', `Your interviewer suggests a retake. You can book again from ${fmtDay(retakeAfter ?? now)}. Feedback: ${input.feedback}`],
      }[input.result];
      await notify(tx, student.userId, 'OUTCOME', copy[0], copy[1]);
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/bookings/:id/no-show',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    await prisma.$transaction(async (tx) => {
      const b = await ownBooking(tx, id, req.user.id);
      await tx.booking.update({
        where: { id },
        data: { status: 'NO_SHOW', activeSlotKey: null, activeStudentKey: null },
      });
      const student = await tx.studentProfile.findUnique({ where: { id: b.studentId } });
      await notify(tx, student.userId, 'BOOKING', 'You missed your interview', 'You did not join your interview slot. You can book a new slot whenever you are ready.');
    });
    res.json({ ok: true });
  }),
);

export default router;
