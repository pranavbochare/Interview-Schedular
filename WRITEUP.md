# GRIT Interview Scheduling: Write-up

## 1. States
| State | Entered when | Leaves when |
|---|---|---|
| Not eligible | skills cleared < required | admin/system marks last skill cleared → Eligible (student notified) |
| Eligible | all skills cleared, no booking | student books → Booked |
| Booked | active booking, slot in future | student cancels → Eligible; reschedule → Booked; slot starts → Awaiting outcome; interviewer removes slot/deactivated → Eligible (notified) |
| Awaiting outcome | slot start passed, no outcome | interviewer records result, or marks no-show → Eligible |
| Passed | outcome = Pass | malpractice flag → Nullified |
| Failed | outcome = Fail | after cooling-off (7 days) can book → Booked |
| Retake later | outcome = Retake later | after interviewer-chosen date can book → Booked |
| Nullified | malpractice flagged | admin clears flag → recomputed (Passed / Eligible / Not eligible) |

States are computed from profile + active booking + last outcome, so they cannot drift.

## 2. Edge cases and assumptions
Handled: two students racing for one slot (one wins, other gets "slot just taken"); duplicate booking (blocked, offer reschedule); reschedule into a taken slot (rolls back, old booking kept); cancel/reschedule within 2h of start (blocked); interviewer overlapping own slots (rejected); interviewer removing a booked slot (reason required, student notified, slot cancelled); deactivated interviewer (future bookings cancelled, students notified); outcome before start (rejected), twice (rejected), Fail/Retake without feedback (rejected); no-show; malpractice on a passed student (badge nullified), on a booked student (booking cancelled, slot reopened), by clearing (restored); passed students cannot rebook; deactivated users lose access immediately.
Assumptions: 45-minute slots; one active booking per student; one track per student; any interviewer may evaluate any student; cooling-off 7 days after Fail; a no-show does not count as an attempt; malpractice flags are set by admins only; times stored UTC, shown in viewer's timezone.
Open questions: attempt limit? Should no-shows carry a penalty? Should interviewers be matched to tracks? Reminders by email/WhatsApp?

## 3. Data model
`User(id, name, email*, passwordHash, role, active)` · `StudentProfile(userId*, rollNo*, college, track, skillsRequired, skillsCleared, badgeStatus, malpracticeFlagged/Note/At, retakeAfter)` · `AvailabilitySlot(interviewerId, startsAt, endsAt, status; unique(interviewerId,startsAt))` · `Booking(slotId, studentId, status, rescheduledFromId, cancelReason, activeSlotKey*, activeStudentKey*)` · `InterviewOutcome(bookingId*, result, feedback, retakeAfter, recordedById)` · `Notification(userId, type, title, message, read)`. `*` = unique. Full schema: `server/prisma/schema.prisma`.

## 5. Three key student messages
1. **Booking confirmed:** "Your interview is confirmed. You're booked with Rahul Verma on Sat, 14 Nov · 10:00 AM. You can reschedule or cancel up to 2 hours before the start."
2. **Passed:** "You earned your badge! Congratulations! You cleared your interview and your Track Badge is now yours."
3. **Nullified:** "Your badge has been nullified. Plagiarism detected in your Skill 3 contest submission. If you think this is a mistake, contact the GRIT team."

## 6. Before / After
In the app: student sidebar → **Before / After** (home, booking screen and notification for every state), plus real dashboards for aarav (before), diya (booked), vikram (passed), arjun (nullified).
