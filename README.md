# GRIT Interview Scheduling System

Students book Track Badge interviews, interviewers publish availability and record outcomes, and admins monitor the whole funnel. Three role-based dashboards, one API.

**Stack:** React + Vite · Tailwind · shadcn-style UI (Radix) · FullCalendar · date-fns · Node + Express · MySQL + Prisma · JWT + bcrypt (RBAC) · REST · Zod validation

## Quick start

Prerequisites: Node 20+, MySQL 8 (or MariaDB 10.11+) running locally.

```bash
# 1. Backend
cd server
cp .env.example .env          # edit DATABASE_URL / JWT_SECRET
npm install
npx prisma migrate deploy     # applies prisma/migrations (use `npx prisma migrate dev` while developing)
npx prisma generate
npm run db:seed               # realistic sample data
npm run dev                   # http://localhost:4000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api to :4000)
```

Create the database first if needed: `CREATE DATABASE grit_interviews CHARACTER SET utf8mb4;`

## Demo accounts (password `Password@123`)

| Role | Email | Shows |
|---|---|---|
| Student | aarav@niat.edu | eligible, not booked |
| Student | diya@niat.edu | booked (can reschedule/cancel) |
| Student | vikram@niat.edu | passed, badge earned |
| Student | priya@niat.edu / karan@niat.edu | retake later / failed (cooling-off) |
| Student | arjun@niat.edu | badge nullified (malpractice) |
| Student | neha@niat.edu | not eligible (2/4 skills) |
| Interviewer | rahul@grit.dev | has an interview awaiting outcome **today** |
| Admin | admin@grit.dev | all students, interviewers, results |

Seed data uses IST business hours (`SEED_TZ_OFFSET_MINUTES`, default 330). Server-written notification text uses `APP_TIMEZONE` (default `Asia/Kolkata`).

## Screens

- **Student:** dashboard (eligibility, journey stepper, booking, result + feedback, history) · book/reschedule/cancel (FullCalendar + list) · my results · **Before / After** (compare any two journey states side by side: home, booking screen, notification)
- **Interviewer:** daily schedule with outcome recording (Pass / Fail / Retake later) and no-show · availability calendar (drag to open a window, auto-split into slots) · bookings table
- **Admin:** overview (eligible, booked vs unbooked, funnel) · students (filters, add, edit skills, flag/clear malpractice) · interviewers (add, deactivate) · team calendar · results

## Journey states (derived, never stored)

`NOT_ELIGIBLE → ELIGIBLE → BOOKED → AWAITING_OUTCOME → PASSED | FAILED | RETAKE_LATER`, and `NULLIFIED` from anywhere via a malpractice flag. FAILED/RETAKE_LATER return to bookable after `retakeAfter`. See `WRITEUP.md`.

## Concurrency & integrity

- Slot claim is an atomic `updateMany WHERE status='OPEN'` inside a transaction.
- MySQL has no partial unique indexes, so `Booking.activeSlotKey` / `activeStudentKey` are set only while a booking is active and are `UNIQUE`: a slot can't be double-booked and a student can't hold two active bookings, even under races (tested).
- Reschedule releases the old slot and claims the new one in one transaction; failure rolls back.
- Cancellations by interviewer/admin/malpractice notify the student and free or cancel the slot.
- Malpractice flag nullifies the badge (even if earned), cancels the pending booking, blocks booking and outcome recording.

## API (all under `/api`, JWT bearer)

`POST /auth/login`, `GET /auth/me` · Student: `GET /student/overview|slots`, `POST /student/bookings`, `POST /student/bookings/:id/reschedule`, `DELETE /student/bookings/:id` · Interviewer: `GET|POST /interviewer/slots`, `DELETE /interviewer/slots/:id`, `POST /interviewer/bookings/:id/outcome|no-show` · Admin: `/admin/stats|students|interviewers|results|schedule`, `POST|DELETE /admin/students/:id/malpractice`, `PATCH /admin/students/:id/skills`, `PATCH /admin/interviewers/:id/active` · `GET|POST /notifications`

## Configuration (`server/.env`)

`FAIL_COOLDOWN_DAYS` (7) · `BOOKING_CUTOFF_HOURS` (2: no book/cancel/reschedule inside this window) · `JWT_EXPIRES_IN` · `CLIENT_ORIGIN` · `APP_TIMEZONE`

## Notes

- The Prisma client is generated with `engineType = "client"` and the MariaDB/MySQL driver adapter (`@prisma/adapter-mariadb`), so no native engine download is needed at runtime.
- Reset data any time: `npm run db:seed` (wipes and reseeds).
