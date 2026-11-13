import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, Field } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Table, Th, Td } from '@/components/ui/table';

export default function AdminInterviewers() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/interviewers');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [toggling, setToggling] = useState(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true); setFormError('');
    try { await api.post('/admin/interviewers', form); toast.success('Interviewer added'); setAdding(false); setForm({ name: '', email: '', password: '' }); reload(); }
    catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      const r = await api.patch(`/admin/interviewers/${toggling.id}/active`, { active: !toggling.active });
      toast.success(toggling.active ? 'Interviewer deactivated' : 'Interviewer reactivated', r.cancelledBookings ? `${r.cancelledBookings} booking(s) cancelled and students notified.` : undefined);
      setToggling(null); reload();
    } catch (e) { toast.error('Action failed', e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Interviewers" description="Manage the interview team and their load." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add interviewer</Button>} />
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <Card>
          <Table>
            <thead><tr><Th>Interviewer</Th><Th>Status</Th><Th>Open slots</Th><Th>Upcoming bookings</Th><Th>Interviews done</Th><Th /></tr></thead>
            <tbody>
              {data.interviewers.map((i) => (
                <tr key={i.id}>
                  <Td><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.email}</p></Td>
                  <Td><Badge tone={i.active ? 'emerald' : 'slate'}>{i.active ? 'Active' : 'Inactive'}</Badge></Td>
                  <Td>{i.openSlots}</Td><Td>{i.upcoming}</Td><Td>{i.completed}</Td>
                  <Td className="text-right"><Button size="sm" variant={i.active ? 'outline' : 'soft'} onClick={() => setToggling(i)}>{i.active ? 'Deactivate' : 'Reactivate'}</Button></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal open={adding} onOpenChange={setAdding} title="Add interviewer" description="They can sign in and publish availability straight away.">
        <div className="space-y-4">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Temporary password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" /></Field>
          {formError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add} disabled={busy}>Add interviewer</Button></div>
        </div>
      </Modal>

      <Modal open={!!toggling} onOpenChange={(o) => !o && setToggling(null)} title={toggling?.active ? 'Deactivate interviewer?' : 'Reactivate interviewer?'} description={toggling?.name}>
        <p className="text-sm text-muted-foreground">{toggling?.active ? `They lose access. Their ${toggling.upcoming} upcoming booking(s) will be cancelled and those students notified to rebook. Open slots are removed.` : 'They can sign in again and publish new availability.'}</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setToggling(null)}>Cancel</Button><Button variant={toggling?.active ? 'destructive' : 'default'} onClick={toggle} disabled={busy}>Confirm</Button></div>
      </Modal>
    </>
  );
}
