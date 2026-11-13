import { useMemo, useState } from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { CalendarDays, List, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components/common';
import Calendar from '@/components/Calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { GateBanner, gateFor } from '@/components/BookGate';
import { fmtDateTime } from '@/lib/utils';

export default function BookInterview() {
  const toast = useToast();
  const overview = useFetch('/student/overview');
  const slotsQ = useFetch('/student/slots');
  const [view, setView] = useState('calendar');
  const [picked, setPicked] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reloadAll = () => { overview.reload(); slotsQ.reload(); };
  const slots = slotsQ.data?.slots ?? [];
  const data = overview.data;
  const gate = data ? gateFor(data) : null;
  const booking = data?.booking;
  const rescheduling = !!booking;

  const events = useMemo(() => slots.map((s) => ({
    id: String(s.id), title: s.interviewer.name, start: s.startsAt, end: s.endsAt,
    backgroundColor: '#6366f1', textColor: '#fff', extendedProps: { slot: s },
  })), [slots]);

  const byDay = useMemo(() => {
    const m = new Map();
    slots.forEach((s) => { const k = startOfDay(new Date(s.startsAt)).getTime(); m.set(k, [...(m.get(k) ?? []), s]); });
    return [...m.entries()];
  }, [slots]);

  const confirm = async () => {
    setBusy(true);
    try {
      if (rescheduling) {
        await api.post(`/student/bookings/${booking.id}/reschedule`, { slotId: picked.id });
        toast.success('Interview rescheduled', `Your new slot: ${fmtDateTime(picked.startsAt)} with ${picked.interviewer.name}.`);
      } else {
        await api.post('/student/bookings', { slotId: picked.id });
        toast.success('Interview confirmed', `You're booked with ${picked.interviewer.name} on ${fmtDateTime(picked.startsAt)}.`);
      }
      setPicked(null);
    } catch (e) {
      toast.error(e.code === 'SLOT_TAKEN' ? 'Slot no longer available' : 'Could not book', e.message);
      setPicked(null);
    } finally { setBusy(false); reloadAll(); }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await api.del(`/student/bookings/${booking.id}`);
      toast.success('Interview cancelled', 'Your slot was released. You can book a new one anytime.');
      setCancelOpen(false);
    } catch (e) { toast.error('Could not cancel', e.message); } finally { setBusy(false); reloadAll(); }
  };

  if (overview.loading || slotsQ.loading) return <Spinner />;
  if (overview.error) return <ErrorState error={overview.error} onRetry={reloadAll} />;

  const pick = (s) => gate.allowed ? setPicked(s) : toast.error('Booking unavailable', gate.body);

  return (
    <>
      <PageHeader title={rescheduling ? 'Reschedule interview' : 'Book your interview'} description="Live online interview · 45 minutes · times shown in your local timezone"
        actions={<div className="flex rounded-md border bg-card p-0.5">
          {[['calendar', CalendarDays, 'Calendar'], ['list', List, 'List']].map(([k, I, l]) => (
            <button key={k} onClick={() => setView(k)} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium ${view === k ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}><I className="h-4 w-4" />{l}</button>
          ))}
        </div>} />

      <div className="mb-4 space-y-3">
        <GateBanner gate={gate} />
        {booking && (
          <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm"><span className="font-semibold">Current booking:</span> {fmtDateTime(booking.slot.startsAt)} with {booking.slot.interviewer.name}</p>
            <Button variant="outline" size="sm" disabled={!data.journey.canCancel} onClick={() => setCancelOpen(true)}>Cancel booking</Button>
          </CardContent></Card>
        )}
      </div>

      {slots.length === 0 ? (
        <Card><EmptyState title="No open slots right now" hint="Interviewers haven't published availability yet. Check back soon." /></Card>
      ) : view === 'calendar' ? (
        <Card className={`p-3 sm:p-4 ${!gate.allowed ? 'opacity-60' : ''}`}>
          <Calendar events={events} onEventClick={(ev) => pick(ev.extendedProps.slot)} initialView="timeGridWeek" initialDate={slots[0].startsAt} height={620} />
        </Card>
      ) : (
        <div className="space-y-5">
          {byDay.map(([day, list]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{format(day, 'EEEE, d MMMM')}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <button key={s.id} disabled={!gate.allowed} onClick={() => pick(s)} className="rounded-lg border bg-card p-4 text-left shadow-sm transition hover:border-primary hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60">
                    <p className="text-lg font-semibold">{format(new Date(s.startsAt), 'h:mm a')}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><UserRound className="h-3.5 w-3.5" />{s.interviewer.name}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!picked} onOpenChange={(o) => !o && setPicked(null)} title={rescheduling ? 'Confirm reschedule' : 'Confirm your slot'} description="Please review the details before confirming.">
        {picked && (
          <div className="space-y-4">
            <div className="rounded-lg bg-accent/60 p-4 text-sm">
              <p className="text-base font-semibold">{fmtDateTime(picked.startsAt)} – {format(new Date(picked.endsAt), 'h:mm a')}</p>
              <p className="mt-1 text-muted-foreground">Interviewer: {picked.interviewer.name}</p>
              {rescheduling && <p className="mt-2 text-xs text-muted-foreground">Your current slot on {fmtDateTime(booking.slot.startsAt)} will be released.</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPicked(null)}>Back</Button>
              <Button onClick={confirm} disabled={busy}>{busy ? 'Confirming…' : rescheduling ? 'Confirm reschedule' : 'Confirm booking'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel your interview?" description="Your slot will be released for other students.">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep booking</Button>
          <Button variant="destructive" onClick={cancel} disabled={busy}>Cancel interview</Button>
        </div>
      </Modal>
    </>
  );
}
