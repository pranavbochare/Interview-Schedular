import { addHours, isAfter } from 'date-fns';
import { config } from './config.js';

/**
 * Student journey states (derived, never stored, so they can't drift out of sync):
 *
 *  NOT_ELIGIBLE     skills still being cleared
 *  ELIGIBLE         all skills cleared, no interview booked (can book)
 *  BOOKED           interview slot held, in the future
 *  AWAITING_OUTCOME slot time has passed, interviewer hasn't recorded a result yet
 *  PASSED           badge earned
 *  FAILED           last attempt failed; cooling-off until retakeAfter, then ELIGIBLE again
 *  RETAKE_LATER     interviewer asked for another attempt after retakeAfter
 *  NULLIFIED        malpractice flagged, badge void, cannot book
 */
export function computeJourney(profile, activeBooking, lastOutcome, now = new Date()) {
  const base = { canBook: false, canCancel: false, reason: null, retakeAfter: profile.retakeAfter };

  if (profile.badgeStatus === 'NULLIFIED' || profile.malpracticeFlagged) {
    return { ...base, state: 'NULLIFIED', reason: 'Your badge was nullified after a malpractice flag.' };
  }
  if (profile.badgeStatus === 'EARNED') {
    return { ...base, state: 'PASSED' };
  }
  if (profile.skillsCleared < profile.skillsRequired) {
    return { ...base, state: 'NOT_ELIGIBLE', reason: 'Clear all required skills to unlock your interview.' };
  }
  if (activeBooking) {
    const started = !isAfter(activeBooking.slot.startsAt, now);
    const cutoffPassed = !isAfter(addHours(activeBooking.slot.startsAt, -config.bookingCutoffHours), now);
    return {
      ...base,
      state: started ? 'AWAITING_OUTCOME' : 'BOOKED',
      canCancel: !cutoffPassed,
      reason: cutoffPassed && !started ? `Changes close ${config.bookingCutoffHours}h before the interview.` : null,
    };
  }

  const waiting = profile.retakeAfter && isAfter(profile.retakeAfter, now);
  if (lastOutcome?.result === 'FAIL') {
    return {
      ...base,
      state: 'FAILED',
      canBook: !waiting,
      reason: waiting ? 'You can book again after the cooling-off period.' : null,
    };
  }
  if (lastOutcome?.result === 'RETAKE_LATER') {
    return {
      ...base,
      state: 'RETAKE_LATER',
      canBook: !waiting,
      reason: waiting ? 'You can book your retake after the date shown.' : null,
    };
  }
  return { ...base, state: 'ELIGIBLE', canBook: true };
}
