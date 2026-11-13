import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';
import { addDays, subDays, addMinutes } from 'date-fns';

const PASSWORD = 'Password@123';

// Business hours are expressed in this UTC offset (default IST, +05:30) so demo slots look sensible
// regardless of the server's own timezone. Override with SEED_TZ_OFFSET_MINUTES.
const TZ_OFFSET = Number(process.env.SEED_TZ_OFFSET_MINUTES ?? 330);
const at = (day, h, m = 0) =>
  new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m) - TZ_OFFSET * 60000);

async function main() {
  console.log('Seeding...');
  await prisma.notification.deleteMany();
  await prisma.interviewOutcome.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const today = new Date();

  const mk = (name, email, role) =>
    prisma.user.create({ data: { name, email, role, passwordHash } });

  const admin = await mk('Meera Kapoor', 'admin@grit.dev', 'ADMIN');
  const interviewers = [
    await mk('Rahul Verma', 'rahul@grit.dev', 'INTERVIEWER'),
    await mk('Sneha Iyer', 'sneha@grit.dev', 'INTERVIEWER'),
    await mk('Karthik Rao', 'karthik@grit.dev', 'INTERVIEWER'),
  ];

  // ---- students ----
  // state: nei = not eligible yet, unbooked, booked, pass, fail, retake, nullified
  const roster = [
    ['Aarav Sharma', 'aarav@niat.edu', 'Full Stack Developer', 5, 'unbooked'],
    ['Diya Patel', 'diya@niat.edu', 'Full Stack Developer', 5, 'booked'],
    ['Rohan Mehta', 'rohan@niat.edu', 'Data Engineer', 4, 'unbooked'],
    ['Ishita Nair', 'ishita@niat.edu', 'AI Engineer', 5, 'booked'],
    ['Vikram Singh', 'vikram@niat.edu', 'Full Stack Developer', 5, 'pass'],
    ['Ananya Reddy', 'ananya@niat.edu', 'AI Engineer', 5, 'pass'],
    ['Karan Joshi', 'karan@niat.edu', 'Data Engineer', 4, 'fail'],
    ['Priya Menon', 'priya@niat.edu', 'Full Stack Developer', 5, 'retake'],
    ['Arjun Das', 'arjun@niat.edu', 'AI Engineer', 5, 'nullified'],
    ['Neha Gupta', 'neha@niat.edu', 'Data Engineer', 4, 'nei', 2],
    ['Sahil Khan', 'sahil@niat.edu', 'Full Stack Developer', 5, 'nei', 3],
    ['Tara Bose', 'tara@niat.edu', 'AI Engineer', 5, 'unbooked'],
    ['Yash Agarwal', 'yash@niat.edu', 'Full Stack Developer', 5, 'unbooked'],
    ['Meghna Pillai', 'meghna@niat.edu', 'Data Engineer', 4, 'booked'],
    ['Rhea Kulkarni', 'rhea@niat.edu', 'AI Engineer', 5, 'unbooked'],
    ['Dev Malhotra', 'dev@niat.edu', 'Full Stack Developer', 5, 'unbooked'],
  ];

  const colleges = ['NIAT Hyderabad', 'NIAT Pune', 'NIAT Bengaluru'];
  const students = {};
  for (let i = 0; i < roster.length; i++) {
    const [name, email, track, req, state, cleared] = roster[i];
    const user = await mk(name, email, 'STUDENT');
    const done = state === 'nei' ? cleared : req;
    students[state + '_' + email] = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        rollNo: `NIAT26${String(i + 101)}`,
        college: colleges[i % colleges.length],
        track,
        skillsRequired: req,
        skillsCleared: done,
        badgeStatus: state === 'nei' ? 'NOT_ELIGIBLE' : 'ELIGIBLE',
      },
    });
    students[state + '_' + email].state = state;
    students[state + '_' + email].userId = user.id;
  }
  const list = Object.values(students);
  const byState = (s) => list.filter((x) => x.state === s);

  // ---- future open slots: next 7 days, 3 interviewers ----
  const futureSlots = [];
  for (let d = 1; d <= 7; d++) {
    const day = addDays(today, d);
    if (day.getDay() === 0) continue;
    interviewers.forEach((iv, idx) => {
      const hours = idx === 0 ? [10, 11, 14, 15] : idx === 1 ? [11, 12, 16, 17] : [9, 10, 15];
      for (const h of hours) {
        futureSlots.push({ interviewerId: iv.id, startsAt: at(day, h), endsAt: at(day, h, 45) });
      }
    });
  }
  await prisma.availabilitySlot.createMany({ data: futureSlots });

  // helper to book a slot
  const book = async (student, slotData, { status = 'BOOKED', slotStatus = 'BOOKED' } = {}) => {
    const slot = await prisma.availabilitySlot.upsert({
      where: { interviewerId_startsAt: { interviewerId: slotData.interviewerId, startsAt: slotData.startsAt } },
      update: { status: slotStatus },
      create: { ...slotData, status: slotStatus },
    });
    return prisma.booking.create({
      data: {
        slotId: slot.id,
        studentId: student.id,
        status,
        activeSlotKey: status === 'BOOKED' ? slot.id : null,
        activeStudentKey: status === 'BOOKED' ? student.id : null,
      },
    });
  };

  // upcoming bookings
  const upcoming = [
    [byState('booked')[0], interviewers[0], addDays(today, 1), 10],
    [byState('booked')[1], interviewers[0], addDays(today, 1), 11],
    [byState('booked')[2], interviewers[1], addDays(today, 2), 12],
  ];
  for (const [st, iv, day, h] of upcoming) {
    await book(st, { interviewerId: iv.id, startsAt: at(day, h), endsAt: at(day, h, 45) });
  }

  // an interview that started a little while ago and is waiting for its outcome (interviewer can record it today)
  const justStarted = addMinutes(today, -20);
  await book(byState('unbooked')[4], { interviewerId: interviewers[0].id, startsAt: justStarted, endsAt: addMinutes(justStarted, 45) });
  const laterToday = addMinutes(today, 190);
  await book(byState('unbooked')[5], { interviewerId: interviewers[0].id, startsAt: laterToday, endsAt: addMinutes(laterToday, 45) });

  // past completed interviews with outcomes
  const past = [
    ['pass', 'PASS', 6, 0, 'Strong system design fundamentals and clean code. Great communication.'],
    ['pass', 'PASS', 5, 1, 'Excellent grasp of model evaluation and deployment trade-offs.'],
    ['fail', 'FAIL', 4, 2, 'Struggled with core data modelling and SQL joins. Revisit fundamentals.'],
    ['retake', 'RETAKE_LATER', 3, 0, 'Good start but ran out of time on the second problem. Retake after more practice.'],
  ];
  let pi = 0;
  for (const [state, result, daysAgo, ivIdx, feedback] of past) {
    const st = byState(state)[state === 'pass' ? pi++ : 0];
    const iv = interviewers[ivIdx];
    const day = subDays(today, daysAgo);
    const b = await book(
      st,
      { interviewerId: iv.id, startsAt: at(day, 11), endsAt: at(day, 11, 45) },
      { status: 'COMPLETED' },
    );
    const retakeAfter = result === 'FAIL' ? addDays(day, 7) : result === 'RETAKE_LATER' ? addDays(today, 5) : null;
    await prisma.interviewOutcome.create({
      data: { bookingId: b.id, result, feedback, retakeAfter, recordedById: iv.id },
    });
    const data = { retakeAfter };
    if (result === 'PASS') data.badgeStatus = 'EARNED';
    await prisma.studentProfile.update({ where: { id: st.id }, data });
    await prisma.notification.create({
      data: {
        userId: st.userId,
        type: 'OUTCOME',
        title: result === 'PASS' ? 'You earned your badge!' : result === 'FAIL' ? 'Interview result: not cleared' : 'Retake later',
        message: feedback,
      },
    });
  }

  // nullified: passed once, later flagged
  const nul = byState('nullified')[0];
  const nivday = subDays(today, 10);
  const nb = await book(
    nul,
    { interviewerId: interviewers[2].id, startsAt: at(nivday, 10), endsAt: at(nivday, 10, 45) },
    { status: 'COMPLETED' },
  );
  await prisma.interviewOutcome.create({
    data: { bookingId: nb.id, result: 'PASS', feedback: 'Cleared interview.', recordedById: interviewers[2].id },
  });
  await prisma.studentProfile.update({
    where: { id: nul.id },
    data: {
      badgeStatus: 'NULLIFIED',
      malpracticeFlagged: true,
      malpracticeFlaggedAt: subDays(today, 2),
      malpracticeNote: 'Plagiarism detected in contest submission for Skill 3.',
    },
  });
  await prisma.notification.create({
    data: {
      userId: nul.userId,
      type: 'MALPRACTICE',
      title: 'Your badge has been nullified',
      message: 'Plagiarism detected in contest submission for Skill 3.',
    },
  });

  // booking confirmations for upcoming
  for (const [st] of upcoming) {
    await prisma.notification.create({
      data: { userId: st.userId, type: 'BOOKING', title: 'Interview confirmed', message: 'Your interview slot is booked.' },
    });
  }

  console.log('Done.\n');
  console.log('Admin:       admin@grit.dev / ' + PASSWORD);
  console.log('Interviewer: rahul@grit.dev / ' + PASSWORD);
  console.log('Student:     aarav@niat.edu (eligible, unbooked) / ' + PASSWORD);
  console.log('Student:     diya@niat.edu (booked) / ' + PASSWORD);
  console.log('Student:     vikram@niat.edu (passed) / ' + PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
