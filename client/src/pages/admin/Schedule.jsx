import { useMemo } from 'react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import Calendar from '@/components/Calendar';
import { Card } from '@/components/ui/card';

const COLORS = ['#6366f1', '#7c3aed', '#2563eb', '#a855f7', '#0ea5e9'];

export default function AdminSchedule() {
  const { data, loading, error, reload } = useFetch('/admin/schedule');
  const { events, legend } = useMemo(() => {
    const names = [...new Set((data?.bookings ?? []).map((b) => b.interviewer))];
    const color = (n) => COLORS[names.indexOf(n) % COLORS.length];
    return {
      legend: names.map((n) => [n, color(n)]),
      events: (data?.bookings ?? []).map((b) => ({ id: String(b.id), title: `${b.student} · ${b.interviewer.split(' ')[0]}`, start: b.startsAt, end: b.endsAt, backgroundColor: b.status === 'COMPLETED' ? '#94a3b8' : color(b.interviewer), textColor: '#fff' })),
    };
  }, [data]);

  return (
    <>
      <PageHeader title="Team schedule" description="Every booked interview across all interviewers. Grey = completed." />
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">{legend.map(([n, c]) => <span key={n} className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{n}</span>)}</div>
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : <Card className="p-3 sm:p-4"><Calendar events={events} height={680} /></Card>}
    </>
  );
}
