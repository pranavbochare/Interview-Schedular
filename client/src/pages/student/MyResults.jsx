import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, EmptyState } from '@/components/common';
import { Card } from '@/components/ui/card';
import { Table, Th, Td } from '@/components/ui/table';
import { BookingBadge, ResultBadge } from '@/components/StatusBadge';
import { fmtDateTime } from '@/lib/utils';

export default function MyResults() {
  const { data, loading, error, reload } = useFetch('/student/overview');
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const { history, journey, booking } = data;
  const rows = [...(booking ? [{ id: 'current', status: 'BOOKED', slot: booking.slot, outcome: null }] : []), ...history];
  return (
    <>
      <PageHeader title="My results" description="Every interview you've booked, and how it went." />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No interviews yet" hint={journey.state === 'NOT_ELIGIBLE' ? 'Clear all required skills to unlock your first interview.' : 'Book a slot from the Book interview page.'} />
        ) : (
          <Table>
            <thead><tr><Th>When</Th><Th>Interviewer</Th><Th>Status</Th><Th>Result</Th><Th>Feedback</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">{fmtDateTime(r.slot.startsAt)}</Td>
                  <Td>{r.slot.interviewer.name}</Td>
                  <Td><BookingBadge status={r.status} /></Td>
                  <Td>{r.outcome ? <ResultBadge result={r.outcome.result} /> : <span className="text-muted-foreground">{r.cancelReason ?? 'Pending'}</span>}</Td>
                  <Td className="max-w-xs text-muted-foreground">{r.outcome?.feedback ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
