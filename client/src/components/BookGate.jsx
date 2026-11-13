import { AlertTriangle, CheckCircle2, Clock, Lock, Info } from 'lucide-react';
import { fmtDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// What the booking screen says (and whether booking is allowed) for each journey state.
export function gateFor(data) {
  const { journey: j, booking } = data;
  switch (j.state) {
    case 'NOT_ELIGIBLE': return { allowed: false, tone: 'slate', icon: Lock, title: 'Booking is locked', body: j.reason };
    case 'NULLIFIED': return { allowed: false, tone: 'rose', icon: AlertTriangle, title: 'Booking disabled', body: 'Your badge was nullified after a malpractice flag, so you cannot book interviews.' };
    case 'PASSED': return { allowed: false, tone: 'emerald', icon: CheckCircle2, title: 'You already earned this badge', body: 'No further interviews are needed for this track.' };
    case 'AWAITING_OUTCOME': return { allowed: false, tone: 'amber', icon: Clock, title: 'Waiting for your result', body: 'Your interview has taken place. You can book again once the result is recorded, if a retake is needed.' };
    case 'BOOKED': return { allowed: j.canCancel, tone: 'blue', icon: Info, title: 'You have an interview booked', body: j.canCancel ? 'Pick another slot below to reschedule, or cancel your booking.' : j.reason };
    case 'FAILED':
    case 'RETAKE_LATER':
      return j.canBook
        ? { allowed: true, tone: 'indigo', icon: Info, title: 'You can book another attempt', body: 'Pick a slot below.' }
        : { allowed: false, tone: 'violet', icon: Clock, title: 'Booking opens soon', body: `You can book your next attempt from ${fmtDate(j.retakeAfter)}.` };
    default: return { allowed: true, tone: 'indigo', icon: Info, title: 'Choose a slot', body: 'All times are shown in your local timezone.' };
  }
}

const bg = { slate: 'bg-slate-50 text-slate-700 border-slate-200', rose: 'bg-rose-50 text-rose-900 border-rose-200', emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200', amber: 'bg-amber-50 text-amber-900 border-amber-200', blue: 'bg-blue-50 text-blue-800 border-blue-200', violet: 'bg-violet-50 text-violet-800 border-violet-200', indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200' };

export function GateBanner({ gate }) {
  const Icon = gate.icon;
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', bg[gate.tone])}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm"><p className="font-semibold">{gate.title}</p><p className="mt-0.5 opacity-90">{gate.body}</p></div>
    </div>
  );
}
