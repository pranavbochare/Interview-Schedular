import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, Award, CalendarCheck, CalendarClock, CheckCircle2, Clock, Lock, RefreshCw, XCircle, Check, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/common';
import { ResultBadge, StateBadge } from '@/components/StatusBadge';
import { KEY_MESSAGES } from '@/lib/journey';
import { fmtDate, fmtDateTime, cn } from '@/lib/utils';

// Presentational: renders the student dashboard from an /student/overview payload.
// `preview` disables navigation so the same component powers the Before / After screens.
const tones = {
  indigo: 'from-indigo-600 to-violet-600',
  blue: 'from-blue-600 to-indigo-600',
  amber: 'from-amber-500 to-orange-500',
  emerald: 'from-emerald-500 to-teal-600',
  red: 'from-red-500 to-rose-600',
  violet: 'from-violet-600 to-purple-700',
  rose: 'from-rose-700 to-red-900',
  slate: 'from-slate-500 to-slate-700',
};

export function heroFor(d) {
  const { journey: j, profile: p, booking, latestOutcome: o } = d;
  const when = booking && fmtDateTime(booking.slot.startsAt);
  switch (j.state) {
    case 'NOT_ELIGIBLE':
      return { tone: 'slate', icon: Lock, title: 'Keep going: your interview unlocks soon', body: `You have cleared ${p.skillsCleared} of ${p.skillsRequired} skills. Clear the rest to unlock your ${p.track} interview.` };
    case 'ELIGIBLE':
      return { tone: 'indigo', icon: CalendarCheck, title: "You're eligible. Book your interview", body: `You cleared all ${p.skillsRequired} skills for the ${p.track} badge. Pick a slot that suits you.`, cta: { to: '/student/book', label: 'Book a slot' } };
    case 'BOOKED':
      return { tone: 'blue', icon: CalendarClock, title: KEY_MESSAGES.confirmed.title, body: KEY_MESSAGES.confirmed.body(when, booking.slot.interviewer.name), cta: { to: '/student/book', label: 'Reschedule or cancel', variant: 'outline' } };
    case 'AWAITING_OUTCOME':
      return { tone: 'amber', icon: Clock, title: 'Interview done: result coming soon', body: `Your interview with ${booking.slot.interviewer.name} has taken place. Your interviewer will record the result shortly and you'll be notified.` };
    case 'PASSED':
      return { tone: 'emerald', icon: Award, title: KEY_MESSAGES.passed.title, body: KEY_MESSAGES.passed.body() };
    case 'FAILED':
      return { tone: 'red', icon: XCircle, title: 'You did not clear this attempt', body: j.retakeAfter && j.canBook === false ? `You can book again from ${fmtDate(j.retakeAfter)}. Use the feedback below to prepare.` : 'Your cooling-off period is over. You can book another attempt whenever you are ready.', cta: j.canBook ? { to: '/student/book', label: 'Book another attempt' } : undefined };
    case 'RETAKE_LATER':
      return { tone: 'violet', icon: RefreshCw, title: 'Retake later', body: j.retakeAfter && j.canBook === false ? `Your interviewer suggests a retake. You can book from ${fmtDate(j.retakeAfter)}.` : 'You can book your retake now.', cta: j.canBook ? { to: '/student/book', label: 'Book your retake' } : undefined };
    case 'NULLIFIED':
      return { tone: 'rose', icon: AlertTriangle, title: KEY_MESSAGES.nullified.title, body: KEY_MESSAGES.nullified.body(p.malpracticeNote ?? 'Malpractice was flagged on your account.') };
    default:
      return { tone: 'slate', icon: Clock, title: '', body: '' };
  }
}

const STEPS = ['Skills cleared', 'Slot booked', 'Interview', 'Result', 'Badge'];
function stepIndex(d) {
  switch (d.journey.state) {
    case 'NOT_ELIGIBLE': return 0;
    case 'ELIGIBLE': return 1;
    case 'BOOKED': return 2;
    case 'AWAITING_OUTCOME': return 3;
    case 'PASSED': return 5;
    case 'NULLIFIED': return 5;
    default: return 4; // failed / retake: result received
  }
}

function Stepper({ data }) {
  const idx = stepIndex(data);
  const bad = ['FAILED', 'NULLIFIED'].includes(data.journey.state);
  return (
    <ol className="flex items-start">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        const isBadgeStep = i === STEPS.length - 1;
        const failedHere = data.journey.state === 'NULLIFIED' && isBadgeStep;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cn('absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2', i <= idx ? 'bg-indigo-500' : 'bg-border')} />}
            <span className={cn('relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
              failedHere ? 'border-rose-700 bg-rose-700 text-white' : done ? 'border-indigo-600 bg-indigo-600 text-white' : current ? (bad ? 'border-red-500 bg-red-50 text-red-600' : 'border-indigo-600 bg-white text-indigo-600 ring-4 ring-indigo-100') : 'border-border bg-card text-muted-foreground')}>
              {failedHere ? '!' : done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn('mt-2 text-xs', done || current ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function StudentJourney({ data, preview = false }) {
  const { profile: p, journey: j, booking, latestOutcome: o, history } = data;
  const hero = heroFor(data);
  const Icon = hero.icon;
  const showResult = o && ['PASSED', 'FAILED', 'RETAKE_LATER', 'NULLIFIED'].includes(j.state);

  return (
    <div className="space-y-6">
      <div className={cn('relative overflow-hidden rounded-xl bg-gradient-to-r p-6 text-white shadow-lg sm:p-8', tones[hero.tone])}>
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="w-fit rounded-xl bg-white/20 p-3"><Icon className="h-7 w-7" /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{p.track} · Track Badge</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">{hero.title}</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-white/90">{hero.body}</p>
          </div>
          {hero.cta && (
            <Button asChild variant={hero.cta.variant === 'outline' ? 'outline' : 'default'} className={cn('shrink-0', hero.cta.variant === 'outline' ? 'border-white/40 bg-white/10 text-white hover:bg-white/20' : 'bg-white text-indigo-700 hover:bg-white/90 from-white to-white')}>
              {preview ? <span>{hero.cta.label} <ArrowRight className="h-4 w-4" /></span> : <Link to={hero.cta.to}>{hero.cta.label} <ArrowRight className="h-4 w-4" /></Link>}
            </Button>
          )}
        </div>
      </div>

      <Card><CardContent className="p-6"><Stepper data={data} /></CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Badge eligibility</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><StateBadge state={j.state} /><span className="text-xs text-muted-foreground">{p.rollNo}</span></div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">Skills cleared</span><span className="font-semibold">{p.skillsCleared} / {p.skillsRequired}</span></div>
              <Progress value={p.skillsCleared} max={p.skillsRequired} />
            </div>
            <div className={cn('flex items-center gap-2 rounded-md p-3 text-sm', p.badgeStatus === 'EARNED' ? 'bg-emerald-50 text-emerald-700' : p.badgeStatus === 'NULLIFIED' ? 'bg-rose-50 text-rose-800' : 'bg-muted text-muted-foreground')}>
              <Award className="h-4 w-4" />
              {p.badgeStatus === 'EARNED' ? 'Track Badge earned' : p.badgeStatus === 'NULLIFIED' ? 'Track Badge nullified' : 'Track Badge not earned yet'}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{booking ? 'Your interview' : showResult ? 'Interview result' : 'Interview'}</CardTitle></CardHeader>
          <CardContent>
            {booking && (
              <div className="flex flex-col gap-4 rounded-lg border bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-primary" />{fmtDateTime(booking.slot.startsAt)} – {format(new Date(booking.slot.endsAt), 'h:mm a')}</p>
                  <p className="flex items-center gap-2 text-muted-foreground"><UserRound className="h-4 w-4" />Interviewer: {booking.slot.interviewer.name}</p>
                </div>
                {j.state === 'BOOKED' && !j.canCancel && <p className="text-xs text-muted-foreground">{j.reason}</p>}
              </div>
            )}
            {!booking && showResult && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3"><ResultBadge result={o.result} /><span className="text-sm text-muted-foreground">Recorded {fmtDate(o.at)}</span></div>
                {o.feedback && <blockquote className="rounded-md border-l-4 border-indigo-300 bg-muted/60 p-4 text-sm"><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Interviewer feedback</p>{o.feedback}</blockquote>}
                {j.retakeAfter && !j.canBook && <p className="flex items-center gap-2 text-sm font-medium text-violet-700"><Clock className="h-4 w-4" />Next attempt opens {fmtDate(j.retakeAfter)}</p>}
                {j.state === 'NULLIFIED' && <p className="flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Your earlier result no longer counts toward a badge. Booking is disabled.</p>}
              </div>
            )}
            {!booking && !showResult && (
              <p className="py-6 text-center text-sm text-muted-foreground">{j.state === 'NOT_ELIGIBLE' ? 'Your interview appears here once you clear every required skill.' : 'No interview booked yet. Pick a slot to get started.'}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Interview history</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>{fmtDateTime(h.slot.startsAt)} <span className="text-muted-foreground">with {h.slot.interviewer.name}</span></span>
                  {h.outcome ? <ResultBadge result={h.outcome.result} /> : <span className="text-xs text-muted-foreground">{h.cancelReason ?? h.status}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
