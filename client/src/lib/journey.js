import { addDays, subDays, addHours, addMinutes } from 'date-fns';

// Visual + copy metadata for every journey state returned by the API (journey.state)
export const STATE_META = {
  NOT_ELIGIBLE: { label: 'Not eligible yet', tone: 'slate' },
  ELIGIBLE: { label: 'Ready to book', tone: 'indigo' },
  BOOKED: { label: 'Interview booked', tone: 'blue' },
  AWAITING_OUTCOME: { label: 'Awaiting result', tone: 'amber' },
  PASSED: { label: 'Badge earned', tone: 'emerald' },
  FAILED: { label: 'Not cleared', tone: 'red' },
  RETAKE_LATER: { label: 'Retake later', tone: 'violet' },
  NULLIFIED: { label: 'Badge nullified', tone: 'rose' },
};

export const RESULT_META = {
  PASS: { label: 'Pass', tone: 'emerald' },
  FAIL: { label: 'Fail', tone: 'red' },
  RETAKE_LATER: { label: 'Retake later', tone: 'violet' },
};

export const BOOKING_META = {
  BOOKED: { label: 'Booked', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'emerald' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
  NO_SHOW: { label: 'No-show', tone: 'amber' },
};

// The three messages a student must never miss. Used on the dashboard and mirrored by server notifications.
export const KEY_MESSAGES = {
  confirmed: {
    title: 'Your interview is confirmed',
    body: (when, who) => `You're booked with ${who} on ${when}. You can reschedule or cancel up to 2 hours before the start.`,
  },
  passed: {
    title: 'You earned your badge!',
    body: () => 'Congratulations! You cleared your interview and your Track Badge is now yours.',
  },
  nullified: {
    title: 'Your badge has been nullified',
    body: (note) => `${note} If you think this is a mistake, contact the GRIT team.`,
  },
};

// ---- mock payloads for the Before / After screens (same shape as GET /student/overview) ----
const now = () => new Date();
const baseProfile = { rollNo: 'NIAT26101', college: 'NIAT Hyderabad', track: 'Full Stack Developer', skillsRequired: 5, skillsCleared: 5, badgeStatus: 'ELIGIBLE', malpracticeNote: null };
const interviewer = { id: 1, name: 'Rahul Verma' };
const slot = (start) => ({ id: 1, startsAt: start, endsAt: addMinutes(start, 45), interviewer });
const journey = (state, extra = {}) => ({ state, canBook: false, canCancel: false, reason: null, retakeAfter: null, ...extra });
const base = (over) => ({ profile: baseProfile, journey: journey('ELIGIBLE', { canBook: true }), booking: null, latestOutcome: null, history: [], policy: { bookingCutoffHours: 2 }, ...over });

export const SCENARIOS = {
  NOT_ELIGIBLE: { label: 'Skills in progress', data: () => base({ profile: { ...baseProfile, skillsCleared: 3, badgeStatus: 'NOT_ELIGIBLE' }, journey: journey('NOT_ELIGIBLE', { reason: 'Clear all required skills to unlock your interview.' }) }) },
  ELIGIBLE: { label: 'Before: eligible, not booked', data: () => base({}) },
  BOOKED: { label: 'Booked, interview upcoming', data: () => { const s = addHours(now(), 26); return base({ journey: journey('BOOKED', { canCancel: true }), booking: { id: 1, status: 'BOOKED', slot: slot(s) } }); } },
  AWAITING_OUTCOME: { label: 'Interview done, awaiting result', data: () => { const s = addMinutes(now(), -50); return base({ journey: journey('AWAITING_OUTCOME'), booking: { id: 1, status: 'BOOKED', slot: slot(s) } }); } },
  PASSED: { label: 'After: passed', data: () => base({ profile: { ...baseProfile, badgeStatus: 'EARNED' }, journey: journey('PASSED'), latestOutcome: { result: 'PASS', feedback: 'Strong system design fundamentals and clean code. Great communication.', retakeAfter: null, at: subDays(now(), 1) }, history: [{ id: 1, status: 'COMPLETED', slot: slot(subDays(now(), 1)), outcome: { result: 'PASS', feedback: 'Strong system design fundamentals and clean code. Great communication.' } }] }) },
  FAILED: { label: 'After: not cleared', data: () => { const r = addDays(now(), 6); return base({ journey: journey('FAILED', { retakeAfter: r, reason: 'You can book again after the cooling-off period.' }), profile: { ...baseProfile, retakeAfter: r }, latestOutcome: { result: 'FAIL', feedback: 'Struggled with data modelling and SQL joins. Revisit the fundamentals before retrying.', retakeAfter: r, at: subDays(now(), 1) }, history: [{ id: 1, status: 'COMPLETED', slot: slot(subDays(now(), 1)), outcome: { result: 'FAIL', feedback: 'Struggled with data modelling and SQL joins. Revisit the fundamentals before retrying.' } }] }); } },
  RETAKE_LATER: { label: 'After: retake later', data: () => { const r = addDays(now(), 4); return base({ journey: journey('RETAKE_LATER', { retakeAfter: r, reason: 'You can book your retake after the date shown.' }), profile: { ...baseProfile, retakeAfter: r }, latestOutcome: { result: 'RETAKE_LATER', feedback: 'Good start but ran out of time on the second problem. Practise timed problems and retake.', retakeAfter: r, at: subDays(now(), 1) }, history: [{ id: 1, status: 'COMPLETED', slot: slot(subDays(now(), 1)), outcome: { result: 'RETAKE_LATER', feedback: 'Good start but ran out of time on the second problem.' } }] }); } },
  NULLIFIED: { label: 'After: badge nullified', data: () => base({ profile: { ...baseProfile, badgeStatus: 'NULLIFIED', malpracticeNote: 'Plagiarism detected in your Skill 3 contest submission.' }, journey: journey('NULLIFIED', { reason: 'Your badge was nullified after a malpractice flag.' }), latestOutcome: { result: 'PASS', feedback: 'Cleared interview.', retakeAfter: null, at: subDays(now(), 9) }, history: [{ id: 1, status: 'COMPLETED', slot: slot(subDays(now(), 9)), outcome: { result: 'PASS', feedback: 'Cleared interview.' } }] }) },
};
