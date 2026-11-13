import { useMemo, useState } from 'react';
import { AlertTriangle, Plus, Search, ShieldCheck, ShieldAlert, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState, Field, Progress } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Modal } from '@/components/ui/dialog';
import { Table, Th, Td } from '@/components/ui/table';
import { ResultBadge, StateBadge } from '@/components/StatusBadge';
import { fmtDateTime, cn } from '@/lib/utils';

const GROUPS = {
  all: ['All', () => true],
  eligible: ['Eligible', (s) => !['NOT_ELIGIBLE', 'NULLIFIED', 'PASSED'].includes(s.state)],
  booked: ['Booked', (s) => ['BOOKED', 'AWAITING_OUTCOME'].includes(s.state)],
  unbooked: ['Eligible, not booked', (s) => ['ELIGIBLE', 'FAILED', 'RETAKE_LATER'].includes(s.state)],
  passed: ['Passed', (s) => s.state === 'PASSED'],
  nullified: ['Nullified', (s) => s.state === 'NULLIFIED'],
};
const EMPTY = { name: '', email: '', password: '', rollNo: '', college: 'NIAT Hyderabad', track: 'Full Stack Developer', skillsRequired: 5, skillsCleared: 0 };
const TRACKS = ['Full Stack Developer', 'Data Engineer', 'AI Engineer'];

export default function AdminStudents() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/students');
  const [group, setGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const [flagging, setFlagging] = useState(null);
  const [note, setNote] = useState('');
  const [skills, setSkills] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => (data?.students ?? []).filter(GROUPS[group][1]).filter((s) => !track || s.track === track)
    .filter((s) => !search || [s.name, s.email, s.rollNo].some((v) => v.toLowerCase().includes(search.toLowerCase()))), [data, group, track, search]);
  const counts = useMemo(() => Object.fromEntries(Object.entries(GROUPS).map(([k, [, f]]) => [k, (data?.students ?? []).filter(f).length])), [data]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { await fn(); toast.success(ok); reload(); return true; } catch (e) { toast.error('Action failed', e.message); return false; } finally { setBusy(false); }
  };

  const addStudent = async () => {
    setBusy(true); setFormError('');
    try { await api.post('/admin/students', form); toast.success('Student added'); setAdding(false); setForm(EMPTY); reload(); }
    catch (e) { setFormError(e.message); } finally { setBusy(false); }
  };

  const flag = async () => { if (await run(() => api.post(`/admin/students/${flagging.id}/malpractice`, { note }), 'Malpractice flag applied. Badge nullified.')) { setFlagging(null); setNote(''); } };
  const saveSkills = async () => { if (await run(() => api.patch(`/admin/students/${skills.id}/skills`, { skillsCleared: Number(skills.value) }), 'Skills updated')) setSkills(null); };

  return (
    <>
      <PageHeader title="Students" description="Eligibility, booking status, results and malpractice flags." actions={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add student</Button>} />

      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(GROUPS).map(([k, [l]]) => <button key={k} onClick={() => setGroup(k)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium', group === k ? 'border-transparent bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>{l} <span className="ml-1 opacity-70">{counts[k]}</span></button>)}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, email or roll no" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={track} onChange={(e) => setTrack(e.target.value)}><option value="">All tracks</option>{TRACKS.map((t) => <option key={t}>{t}</option>)}</Select>
      </div>

      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <Card>
          {rows.length === 0 ? <EmptyState title="No students match" hint="Try a different filter." /> : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Track</Th><Th>Skills</Th><Th>Status</Th><Th>Interview</Th><Th>Last result</Th><Th /></tr></thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <Td><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.rollNo} · {s.email}</p></Td>
                    <Td>{s.track}</Td>
                    <Td className="w-36"><div className="mb-1 text-xs font-medium">{s.skillsCleared}/{s.skillsRequired}</div><Progress value={s.skillsCleared} max={s.skillsRequired} /></Td>
                    <Td><StateBadge state={s.state} />{s.malpracticeFlagged && <p title={s.malpracticeNote} className="mt-1 flex items-center gap-1 text-xs text-rose-700"><AlertTriangle className="h-3 w-3" />Flagged</p>}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{s.nextInterview ? <>{fmtDateTime(s.nextInterview.startsAt)}<br /><span className="text-xs">{s.nextInterview.interviewer}</span></> : '—'}</Td>
                    <Td>{s.lastResult ? <ResultBadge result={s.lastResult} /> : '—'}</Td>
                    <Td>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Edit skills cleared" onClick={() => setSkills({ id: s.id, name: s.name, value: s.skillsCleared, max: s.skillsRequired })}><Pencil className="h-4 w-4" /></Button>
                        {s.malpracticeFlagged
                          ? <Button size="icon" variant="ghost" title="Clear malpractice flag" disabled={busy} onClick={() => run(() => api.del(`/admin/students/${s.id}/malpractice`), 'Flag cleared')}><ShieldCheck className="h-4 w-4 text-emerald-600" /></Button>
                          : <Button size="icon" variant="ghost" title="Flag malpractice" onClick={() => setFlagging(s)}><ShieldAlert className="h-4 w-4 text-red-500" /></Button>}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}

      <Modal open={adding} onOpenChange={setAdding} title="Add student" description="Creates a student account with a temporary password.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Roll number"><Input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Temporary password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" /></Field>
          <Field label="College"><Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} /></Field>
          <Field label="Track"><Select value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>{TRACKS.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Skills required"><Input type="number" min={1} value={form.skillsRequired} onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })} /></Field>
          <Field label="Skills cleared"><Input type="number" min={0} value={form.skillsCleared} onChange={(e) => setForm({ ...form, skillsCleared: e.target.value })} /></Field>
        </div>
        {formError && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={addStudent} disabled={busy}>Add student</Button></div>
      </Modal>

      <Modal open={!!flagging} onOpenChange={(o) => !o && setFlagging(null)} title="Flag malpractice" description={flagging ? `${flagging.name} (${flagging.rollNo})` : ''}>
        <p className="mb-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">This nullifies the student's badge (even if already earned), cancels any pending interview and blocks future bookings. The student is notified with the note below.</p>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was found? (shown to the student)" />
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setFlagging(null)}>Cancel</Button><Button variant="destructive" disabled={busy || note.trim().length < 5} onClick={flag}>Flag &amp; nullify badge</Button></div>
      </Modal>

      <Modal open={!!skills} onOpenChange={(o) => !o && setSkills(null)} title="Update skills cleared" description={skills?.name}>
        {skills && <>
          <Field label={`Skills cleared (max ${skills.max})`}><Input type="number" min={0} max={skills.max} value={skills.value} onChange={(e) => setSkills({ ...skills, value: e.target.value })} /></Field>
          <p className="mt-2 text-xs text-muted-foreground">Reaching the maximum makes the student eligible and notifies them.</p>
          <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setSkills(null)}>Cancel</Button><Button onClick={saveSkills} disabled={busy}>Save</Button></div>
        </>}
      </Modal>
    </>
  );
}
