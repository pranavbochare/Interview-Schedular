import { Router } from 'express';
import { z } from 'zod';
import { addHours } from 'date-fns';
import { prisma } from '../lib/prisma.js';
import { config } from '../lib/config.js';
import { notFound, wrap } from '../lib/errors.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { computeJourney } from '../lib/journey.js';
import {
  activeBookingInclude,
  bookSlot,
  cancelByStudent,
  loadStudentContext,
  rescheduleBooking,
} from '../lib/bookingService.js';

const router = Router();
router.use(authenticate, authorize('STUDENT'));

const bookingShape = (b) => ({
  id: b.id,
  status: b.status,
  slot: {
    id: b.slot.id,
    startsAt: b.slot.startsAt,
    endsAt: b.slot.endsAt,
    interviewer: b.slot.interviewer,
  },
});

// Dashboard payload: eligibility, journey state, current booking, history
router.get(
  '/overview',
  wrap(async (req, res) => {
    const ctx = await loadStudentContext(prisma, req.user.student.id);
    const journey = computeJourney(ctx.profile, ctx.activeBooking, ctx.lastOutcome);
    const history = await prisma.booking.findMany({
      where: { studentId: ctx.profile.id, status: { not: 'BOOKED' } },
      orderBy: { createdAt: 'desc' },
      include: { ...activeBookingInclude, outcome: true },
    });
    const p = ctx.profile;
    res.json({
      profile: {
        rollNo: p.rollNo,
        college: p.college,
        track: p.track,
        skillsRequired: p.skillsRequired,
        skillsCleared: p.skillsCleared,
        badgeStatus: p.badgeStatus,
        malpracticeNote: p.malpracticeNote,
      },
      journey,
      booking: ctx.activeBooking ? bookingShape(ctx.activeBooking) : null,
      latestOutcome: ctx.lastOutcome
        ? { result: ctx.lastOutcome.result, feedback: ctx.lastOutcome.feedback, retakeAfter: ctx.lastOutcome.retakeAfter, at: ctx.lastOutcome.createdAt }
        : null,
      history: history.map((h) => ({
        ...bookingShape(h),
        cancelReason: h.cancelReason,
        outcome: h.outcome ? { result: h.outcome.result, feedback: h.outcome.feedback } : null,
      })),
      policy: { bookingCutoffHours: config.bookingCutoffHours },
    });
  }),
);

// Open, future, bookable slots
router.get(
  '/slots',
  wrap(async (req, res) => {
    const from = addHours(new Date(), config.bookingCutoffHours);
    const slots = await prisma.availabilitySlot.findMany({
      where: { status: 'OPEN', startsAt: { gt: from }, interviewer: { active: true } },
      orderBy: { startsAt: 'asc' },
      include: { interviewer: { select: { id: true, name: true } } },
    });
    res.json({ slots });
  }),
);

const idParam = z.coerce.number().int().positive();

router.post(
  '/bookings',
  wrap(async (req, res) => {
    const { slotId } = z.object({ slotId: idParam }).parse(req.body);
    const booking = await bookSlot(req.user.student, slotId);
    res.status(201).json({ booking: bookingShape(booking) });
  }),
);

router.patch(
  '/bookings/:id/reschedule',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { slotId } = z.object({ slotId: idParam }).parse(req.body);
    const booking = await rescheduleBooking(req.user.student, id, slotId);
    res.json({ booking: bookingShape(booking) });
  }),
);

router.delete(
  '/bookings/:id',
  wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    res.json(await cancelByStudent(req.user.student, id));
  }),
);

export default router;
