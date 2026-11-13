import { useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, endOfDay, format, isToday, startOfDay } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, ClipboardCheck, Trash2, UserX, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResultBadge } from '@/components/StatusBadge';
import OutcomeModal from '@/components/OutcomeModal';
import RemoveSlotModal from '@/components/RemoveSlotModal';
import { fmtTime } from '@/lib/utils';

export default function InterviewerSchedule() {
  const toast = useToast();
  const [day, setDay] = useState(startOfDay(new Date()));
  const { data, loading, error, reload } = useFetch(`/interviewer/slots?from=${encodeURIComponent(startOfDay(day).toISOString())}&to=${encodeURIComponent(endOfDay(day).toISOString())}`);
  const [recording, setRecording] = useState(null);
  const [removing, setRemoving] = useState(null);

  const slots = data?.slots ?? [];
  const booked = slots.filter((s) => s.booking);
  const pending = booked.filter((s) => s.booking.status === 'BOOKED' && new Date(s.startsAt) <= new Date()).length;

  const noShow = async (s) => {
    try { await api.post(`/interviewer/bookings/${s.booking.id}/no-show`); toast.success('Marked as no-show', `${s.booking.student.name} has been notified.`); reload(); }
    catch (e) { toast.error('Could not update', e.message); }
  };

  return (
    <>
      <PageHeader title="Daily schedule" description="Your slots for the day. Record outcomes once an interview has started."
        actions={<Button asChild variant="soft"><Link to="/interviewer/availability"><CalendarPlus className="h-4 w-4" />Add availability</Link></Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, -1))} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="min-w-48 rounded-md border bg-card px-4 py-2 text-center text-sm font-semibold">{format(day, 'EEEE, d MMM yyyy')}{isToday(day) && <span className="ml-2 text-primary">· Today</span>}</div>
        <Button variant="outline" size="icon" onClick={() => setDay(addDays(day, 1))} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
        {!isToday(day) && <Button variant="ghost" size="sm" onClick={() => setDay(startOfDay(new Date()))}>Today</Button>}
        <div className="ml-auto flex gap-2 text-xs">
          <Badge tone="indigo">{slots.length} slots</Badge><Badge tone="blue">{booked.length} booked</Badge>{pending > 0 && <Badge tone="amber">{pending} need outcome</Badge>}
        </div>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : slots.length === 0 ? (
        <Card><EmptyState title="No slots on this day" hint="Open some availability so students can book interviews with you." icon={CalendarPlus} /></Card>
      ) : (
        <div className="space-y-3">
          {slots.map((s) => {
            const b = s.booking;
            const started = new Date(s.startsAt) <= new Date();
            const needsOutcome = b && b.status === 'BOOKED' && started;
            return (
              <Card key={s.id} className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${needsOutcome ? 'border-amber-300 ring-1 ring-amber-200' : ''}`}>
                <div className="w-32 shrink-0"><p className="text-lg font-bold">{fmtTime(s.startsAt)}</p><p className="text-xs text-muted-foreground">to {fmtTime(s.endsAt)}</p></div>
                <div className="min-w-0 flex-1">
                  {!b ? <p className="text-sm text-muted-foreground">Open: waiting for a student to book</p> : (
                    <div>
                      <p className="flex items-center gap-2 font-semibold">{b.student.name}{b.student.malpracticeFlagged && <Badge tone="rose"><AlertTriangle className="h-3 w-3" />Flagged</Badge>}</p>
                      <p className="text-sm text-muted-foreground">{b.student.rollNo} · {b.student.track} · {b.student.college}</p>
                      {b.outcome?.feedback && <p className="mt-1 text-sm text-muted-foreground">“{b.outcome.feedback}”</p>}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!b && <Badge tone="indigo">Open</Badge>}
                  {b?.status === 'BOOKED' && !started && <Badge tone="blue">Booked</Badge>}
                  {b?.status === 'NO_SHOW' && <Badge tone="amber">No-show</Badge>}
                  {b?.outcome && <ResultBadge result={b.outcome.result} />}
                  {needsOutcome && <>
                    <Button size="sm" onClick={() => setRecording(b)}><ClipboardCheck className="h-4 w-4" />Record outcome</Button>
                    <Button size="sm" variant="outline" onClick={() => noShow(s)}><UserX className="h-4 w-4" />No-show</Button>
                  </>}
                  {(!b || (b.status === 'BOOKED' && !started)) && <Button size="icon" variant="ghost" aria-label="Remove slot" onClick={() => setRemoving(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <OutcomeModal booking={recording} onClose={() => setRecording(null)} onDone={() => { setRecording(null); reload(); }} />
      <RemoveSlotModal slot={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); reload(); }} />
    </>
  );
}
