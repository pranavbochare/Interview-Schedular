import { addHours, isAfter } from 'date-fns';
import { fmtWhen } from './time.js';
import { prisma } from './prisma.js';
import { config } from './config.js';
import { badRequest, conflict, forbidden, notFound } from './errors.js';
import { computeJourney } from './journey.js';
import { notify } from './notify.js';

const fmt = fmtWhen;

export const activeBookingInclude = {
  slot: { include: { interviewer: { select: { id: true, name: true } } } },
};

export async function loadStudentContext(db, studentId) {
  const profile = await db.studentProfile.findUnique({ where: { id: studentId } });
  if (!profile) throw notFound('Student profile not found');
  const activeBooking = await db.booking.findFirst({
    where: { studentId, status: 'BOOKED' },
    include: activeBookingInclude,
  });
  const lastOutcome = await db.interviewOutcome.findFirst({
    where: { booking: { studentId } },
    orderBy: { createdAt: 'desc' },
  });
  return { profile, activeBooking, lastOutcome };
}

function assertBookable(ctx, now) {
  const j = computeJourney(ctx.profile, ctx.activeBooking, ctx.lastOutcome, now);
  if (j.state === 'NULLIFIED') throw forbidden(j.reason);
  if (j.state === 'NOT_ELIGIBLE') throw forbidden(j.reason);
  if (j.state === 'PASSED') throw conflict('You have already earned this badge.', 'ALREADY_PASSED');
  return j;
}

function assertSlotUsable(slot, now) {
  if (!slot) throw notFound('Slot not found');
  if (slot.status !== 'OPEN') throw conflict('That slot was just taken. Please pick another.', 'SLOT_TAKEN');
  if (!isAfter(addHours(slot.startsAt, -config.bookingCutoffHours), now)) {
    throw badRequest(`Slots can only be booked at least ${config.bookingCutoffHours} hours in advance.`, 'TOO_LATE');
  }
}

/** Frees a booking's slot and clears its uniqueness keys. Runs inside a transaction. */
async function releaseBooking(tx, booking, { status, slotStatus, reason }) {
  await tx.booking.update({
    where: { id: booking.id },
    data: { status, cancelReason: reason ?? null, activeSlotKey: null, activeStudentKey: null },
  });
  await tx.availabilitySlot.update({ where: { id: booking.slotId }, data: { status: slotStatus } });
}

/** Atomically claims an open slot. The updateMany guard + UNIQUE keys make double-booking impossible. */
async function claimSlot(tx, slotId, studentId, rescheduledFromId = null) {
  const claimed = await tx.availabilitySlot.updateMany({
    where: { id: slotId, status: 'OPEN' },
    data: { status: 'BOOKED' },
  });
  if (claimed.count !== 1) throw conflict('That slot was just taken. Please pick another.', 'SLOT_TAKEN');
  return tx.booking.create({
    data: { slotId, studentId, rescheduledFromId, activeSlotKey: slotId, activeStudentKey: studentId },
    include: activeBookingInclude,
  });
}

export async function bookSlot(student, slotId) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const ctx = await loadStudentContext(tx, student.id);
    const j = assertBookable(ctx, now);
    if (ctx.activeBooking) throw conflict('You already have an interview booked. Reschedule it instead.', 'DUPLICATE_BOOKING');
    if (!j.canBook) throw conflict(j.reason, 'COOLING_OFF');

    const slot = await tx.availabilitySlot.findUnique({ where: { id: slotId } });
    assertSlotUsable(slot, now);
    const booking = await claimSlot(tx, slotId, student.id);

    const when = fmt(slot.startsAt);
    const iv = booking.slot.interviewer;
    await notify(tx, student.userId, 'BOOKING', 'Interview confirmed', `Your interview with ${iv.name} is booked for ${when}.`);
    await notify(tx, iv.id, 'BOOKING', 'New interview booked', `${ctx.profile.rollNo} booked ${when}.`);
    return booking;
  });
}

export async function rescheduleBooking(student, bookingId, newSlotId) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const old = await tx.booking.findUnique({ where: { id: bookingId }, include: activeBookingInclude });
    if (!old || old.studentId !== student.id) throw notFound('Booking not found');
    if (old.status !== 'BOOKED') throw conflict('This booking is no longer active.', 'NOT_ACTIVE');
    if (old.slotId === newSlotId) throw badRequest('You are already booked into this slot.');
    if (!isAfter(addHours(old.slot.startsAt, -config.bookingCutoffHours), now)) {
      throw badRequest(`Changes close ${config.bookingCutoffHours} hours before the interview.`, 'TOO_LATE');
    }
    const ctx = await loadStudentContext(tx, student.id);
    assertBookable(ctx, now);

    const slot = await tx.availabilitySlot.findUnique({ where: { id: newSlotId } });
    assertSlotUsable(slot, now);

    // Order matters: release first so the student's UNIQUE key is free, then claim.
    // If the claim fails the whole transaction rolls back and the old booking is untouched.
    await releaseBooking(tx, old, { status: 'CANCELLED', slotStatus: 'OPEN', reason: 'Rescheduled by student' });
    const booking = await claimSlot(tx, newSlotId, student.id, old.id);

    const when = fmt(slot.startsAt);
    await notify(tx, student.userId, 'BOOKING', 'Interview rescheduled', `Your interview is now ${when} with ${booking.slot.interviewer.name}.`);
    await notify(tx, old.slot.interviewer.id, 'BOOKING', 'Booking rescheduled away', `${ctx.profile.rollNo} moved from ${fmt(old.slot.startsAt)}. The slot is open again.`);
    if (booking.slot.interviewer.id !== old.slot.interviewer.id) {
      await notify(tx, booking.slot.interviewer.id, 'BOOKING', 'New interview booked', `${ctx.profile.rollNo} booked ${when}.`);
    }
    return booking;
  });
}

export async function cancelByStudent(student, bookingId) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId }, include: activeBookingInclude });
    if (!b || b.studentId !== student.id) throw notFound('Booking not found');
    if (b.status !== 'BOOKED') throw conflict('This booking is no longer active.', 'NOT_ACTIVE');
    if (!isAfter(addHours(b.slot.startsAt, -config.bookingCutoffHours), now)) {
      throw badRequest(`Changes close ${config.bookingCutoffHours} hours before the interview.`, 'TOO_LATE');
    }
    await releaseBooking(tx, b, { status: 'CANCELLED', slotStatus: 'OPEN', reason: 'Cancelled by student' });
    await notify(tx, student.userId, 'BOOKING', 'Interview cancelled', `Your interview on ${fmt(b.slot.startsAt)} was cancelled. You can book a new slot anytime.`);
    await notify(tx, b.slot.interviewer.id, 'BOOKING', 'Booking cancelled', `${student.rollNo} cancelled ${fmt(b.slot.startsAt)}. The slot is open again.`);
    return { ok: true };
  });
}

/**
 * Used when the interviewer/admin removes a booked slot, deactivates an interviewer,
 * or a malpractice flag voids a student's pending interview.
 * `keepSlot` = true reopens the slot, false marks it CANCELLED.
 */
export async function cancelBookingBySystem(tx, booking, { reason, keepSlot, notifyStudent = true }) {
  await releaseBooking(tx, booking, {
    status: 'CANCELLED',
    slotStatus: keepSlot ? 'OPEN' : 'CANCELLED',
    reason,
  });
  if (notifyStudent) {
    const profile = await tx.studentProfile.findUnique({ where: { id: booking.studentId } });
    await notify(
      tx,
      profile.userId,
      'BOOKING',
      'Interview cancelled',
      `Your interview on ${fmt(booking.slot.startsAt)} was cancelled: ${reason}. Please book a new slot.`,
    );
  }
}
