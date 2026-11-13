import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Th, Td } from '@/components/ui/table';
import { ResultBadge } from '@/components/StatusBadge';
import { fmtDateTime, cn } from '@/lib/utils';

const FILTERS = [['', 'All'], ['PASS', 'Pass'], ['FAIL', 'Fail'], ['RETAKE_LATER', 'Retake later']];

export default function AdminResults() {
  const [f, setF] = useState('');
  const { data, loading, error, reload } = useFetch(`/admin/results${f ? `?result=${f}` : ''}`);
  return (
    <>
      <PageHeader title="Interview results" description="Every recorded outcome, newest first." />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setF(k)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-medium', f === k ? 'border-transparent bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>{l}</button>)}
      </div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <Card>
          {data.results.length === 0 ? <EmptyState title="No results yet" /> : (
            <Table>
              <thead><tr><Th>Student</Th><Th>Track</Th><Th>Interviewed</Th><Th>Interviewer</Th><Th>Result</Th><Th>Feedback</Th></tr></thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id}>
                    <Td><p className="font-medium">{r.student.name}</p><p className="text-xs text-muted-foreground">{r.student.rollNo}</p></Td>
                    <Td>{r.student.track}</Td>
                    <Td className="whitespace-nowrap">{fmtDateTime(r.interviewAt)}</Td>
                    <Td>{r.interviewer}</Td>
                    <Td><div className="flex flex-col items-start gap-1"><ResultBadge result={r.result} />{r.student.malpracticeFlagged && <Badge tone="rose"><AlertTriangle className="h-3 w-3" />Badge nullified</Badge>}</div></Td>
                    <Td className="max-w-sm text-muted-foreground">{r.feedback ?? '—'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </>
  );
}
