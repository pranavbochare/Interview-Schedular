import { useState } from 'react';
import { addDays, format } from 'date-fns';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/common';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'PASS', label: 'Pass', hint: 'Student earns the badge', icon: CheckCircle2, on: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { value: 'FAIL', label: 'Fail', hint: '7-day cooling-off', icon: XCircle, on: 'border-red-500 bg-red-50 text-red-800' },
  { value: 'RETAKE_LATER', label: 'Retake later', hint: 'Pick a retake date', icon: RefreshCw, on: 'border-violet-500 bg-violet-50 text-violet-800' },
];

// Records Pass / Fail / Retake Later for a booking. `booking` = { id, student: { name, rollNo } }
export default function OutcomeModal({ booking, onClose, onDone }) {
  const toast = useToast();
  const [result, setResult] = useState('PASS');
  const [feedback, setFeedback] = useState('');
  const [retakeAfter, setRetakeAfter] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await api.post(`/interviewer/bookings/${booking.id}/outcome`, {
        result,
        feedback: feedback || undefined,
        retakeAfter: result === 'RETAKE_LATER' ? new Date(`${retakeAfter}T09:00:00`).toISOString() : undefined,
      });
      toast.success('Outcome recorded', `${booking.student.name} has been notified.`);
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal open={!!booking} onOpenChange={(o) => !o && onClose()} title="Record interview outcome" description={booking ? `${booking.student.name} · ${booking.student.rollNo} · ${booking.student.track}` : ''}>
      {booking && (
        <div className="space-y-4">
          {booking.student.malpracticeFlagged && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">This student has a malpractice flag. Outcomes cannot be recorded; contact an admin.</p>}
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => (
              <button key={o.value} type="button" onClick={() => setResult(o.value)} className={cn('rounded-lg border-2 p-3 text-left transition', result === o.value ? o.on : 'border-border hover:bg-muted')}>
                <o.icon className="mb-1.5 h-5 w-5" /><p className="text-sm font-semibold">{o.label}</p><p className="text-xs opacity-80">{o.hint}</p>
              </button>
            ))}
          </div>
          {result === 'RETAKE_LATER' && <Field label="Student may retake from"><Input type="date" min={format(addDays(new Date(), 1), 'yyyy-MM-dd')} value={retakeAfter} onChange={(e) => setRetakeAfter(e.target.value)} /></Field>}
          <Field label={result === 'PASS' ? 'Feedback (optional)' : 'Feedback for the student (required)'}>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, and what should they work on?" maxLength={2000} />
          </Field>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={busy || booking.student.malpracticeFlagged}>{busy ? 'Saving…' : 'Save outcome'}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
