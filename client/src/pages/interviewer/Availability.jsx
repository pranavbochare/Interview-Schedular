import { useMemo, useState } from 'react';
import { addHours, format } from 'date-fns';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, Field } from '@/components/common';
import Calendar from '@/components/Calendar';
import RemoveSlotModal from '@/components/RemoveSlotModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';

const COLORS = { OPEN: '#6366f1', BOOKED: '#7c3aed' };
const dt = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

export default function Availability() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/interviewer/slots');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const slots = data?.slots ?? [];

  const events = useMemo(() => slots.map((s) => ({
    id: String(s.id), start: s.startsAt, end: s.endsAt,
    title: s.booking ? s.booking.student.name : 'Open',
    backgroundColor: s.booking ? COLORS.BOOKED : COLORS.OPEN, textColor: '#fff', extendedProps: { slot: s },
  })), [slots]);

  const openForm = (start = addHours(new Date(), 24), end) => {
    start = new Date(start); start.setMinutes(0, 0, 0);
    setFormError('');
    setForm({ start: dt(start), end: dt(end ?? addHours(start, 3)), duration: 45 });
  };

  const save = async () => {
    setBusy(true); setFormError('');
    try {
      const r = await api.post('/interviewer/slots', { rangeStart: new Date(form.start).toISOString(), rangeEnd: new Date(form.end).toISOString(), durationMinutes: Number(form.duration) });
      toast.success('Availability published', `${r.created} slot${r.created === 1 ? '' : 's'} are now open for booking.`);
      setForm(null); reload();
    } catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Availability" description="Drag on the calendar to open a window; it is split into interview slots. Click a slot to remove it."
        actions={<Button onClick={() => openForm()}><Plus className="h-4 w-4" />Add availability</Button>} />
      <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.OPEN }} />Open</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS.BOOKED }} />Booked</span>
      </div>
      <Card className="p-3 sm:p-4">
        <Calendar events={events} selectable onSelect={(i) => openForm(i.start, i.end)} onEventClick={(ev) => setRemoving(ev.extendedProps.slot)} height={640} />
      </Card>

      <Modal open={!!form} onOpenChange={(o) => !o && setForm(null)} title="Add availability" description="We'll split this window into back-to-back interview slots.">
        {form && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From"><Input type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
              <Field label="To"><Input type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            </div>
            <Field label="Slot length">
              <Select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                {[30, 45, 60].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </Select>
            </Field>
            {formError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Publishing…' : 'Publish slots'}</Button></div>
          </div>
        )}
      </Modal>
      <RemoveSlotModal slot={removing} onClose={() => setRemoving(null)} onDone={() => { setRemoving(null); reload(); }} />
    </>
  );
}
