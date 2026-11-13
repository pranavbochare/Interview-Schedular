import { useMemo, useState } from 'react';
import { subDays, addDays } from 'date-fns';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Th, Td } from '@/components/ui/table';
import { BookingBadge, ResultBadge } from '@/components/StatusBadge';
import OutcomeModal from '@/components/OutcomeModal';
import { fmtDateTime, cn } from '@/lib/utils';

const FILTERS = [['upcoming', 'Upcoming'], ['pending', 'Needs outcome'], ['done', 'Completed'], ['all', 'All']];

export default function InterviewerBookings() {
  const range = useMemo(() => `from=${encodeURIComponent(subDays(new Date(), 60).toISOString())}&to=${encodeURIComponent(addDays(new Date(), 60).toISOString())}`, []);
  const { data, loading, error, reload } = useFetch(`/interviewer/slots?${range}`);
  const [filter, setFilter] = useState('upcoming');
  const [recording, setRecording] = useState(null);

  const rows = useMemo(() => {
    const now = new Date();
    return (data?.slots ?? []).filter((s) => s.booking).filter((s) => {
      const b = s.booking, started = new Date(s.startsAt) <= now;
      if (filter === 'upcoming') return b.status === 'BOOKED' && !started;
      if (filter === 'pending') return b.status === 'BOOKED' && started;
      if (filter === 'done') return b.status !== 'BOOKED';
      return true;
    }).sort((a, b) => (filter === 'done' || filter === 'all' ? new Date(b.startsAt) - new Date(a.startsAt) : new Date(a.startsAt) - new Date(b.startsAt)));
  }, [data, filter]);

  return (
    <>
      <PageHeader title="Bookings" description="Everyone who has booked time with you (last and next 60 days)." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium', filter === k ? 'border-transparent bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>{l}</button>)}
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <Card>
          {rows.length === 0 ? <EmptyState title="Nothing here" hint="No bookings match this filter." /> : (
            <Table>
              <thead><tr><Th>When</Th><Th>Student</Th><Th>Track</Th><Th>Status</Th><Th>Result</Th><Th /></tr></thead>
              <tbody>
                {rows.map((s) => {
                  const b = s.booking, needs = b.status === 'BOOKED' && new Date(s.startsAt) <= new Date();
                  return (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap">{fmtDateTime(s.startsAt)}</Td>
                      <Td><p className="flex items-center gap-2 font-medium">{b.student.name}{b.student.malpracticeFlagged && <Badge tone="rose"><AlertTriangle className="h-3 w-3" />Flagged</Badge>}</p><p className="text-xs text-muted-foreground">{b.student.rollNo}</p></Td>
                      <Td>{b.student.track}</Td>
                      <Td><BookingBadge status={b.status} /></Td>
                      <Td>{b.outcome ? <ResultBadge result={b.outcome.result} /> : '—'}</Td>
                      <Td className="text-right">{needs && <Button size="sm" onClick={() => setRecording(b)}><ClipboardCheck className="h-4 w-4" />Record</Button>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      )}
      <OutcomeModal booking={recording} onClose={() => setRecording(null)} onDone={() => { setRecording(null); reload(); }} />
    </>
  );
}
