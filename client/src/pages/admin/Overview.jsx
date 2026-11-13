import { Link } from 'react-router-dom';
import { AlertTriangle, Award, CalendarCheck, CalendarX, Users, UserCheck, Ban, Clock } from 'lucide-react';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState, StatCard, EmptyState } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StateBadge } from '@/components/StatusBadge';
import { fmtDateTime } from '@/lib/utils';

function Bar({ label, value, total, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(value / total) * 100}%` : 0 }} /></div>
    </div>
  );
}

export default function AdminOverview() {
  const stats = useFetch('/admin/stats');
  const students = useFetch('/admin/students');
  const loading = stats.loading || students.loading;
  if (loading) return <Spinner />;
  if (stats.error || students.error) return <ErrorState error={stats.error ?? students.error} onRetry={() => { stats.reload(); students.reload(); }} />;
  const s = stats.data;
  const unbooked = students.data.students.filter((x) => ['ELIGIBLE', 'FAILED', 'RETAKE_LATER'].includes(x.state));
  const upcoming = students.data.students.filter((x) => x.nextInterview).sort((a, b) => new Date(a.nextInterview.startsAt) - new Date(b.nextInterview.startsAt));

  return (
    <>
      <PageHeader title="Admin overview" description="Who is eligible, who has booked, and how interviews are going." actions={<Button asChild variant="soft"><Link to="/admin/students">Manage students</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total students" value={s.totalStudents} tone="indigo" />
        <StatCard icon={UserCheck} label="Eligible for interview" value={s.eligible} tone="violet" hint={`${s.notEligible} still clearing skills`} />
        <StatCard icon={CalendarCheck} label="Booked" value={s.booked} tone="blue" />
        <StatCard icon={CalendarX} label="Eligible, not booked" value={s.unbooked} tone="amber" />
        <StatCard icon={Award} label="Badges earned" value={s.passed} tone="emerald" />
        <StatCard icon={Clock} label="Open slots ahead" value={s.openSlots} tone="blue" hint={`${s.interviewers} active interviewers`} />
        <StatCard icon={Ban} label="Retake / not cleared" value={s.retake + s.failed} tone="red" />
        <StatCard icon={AlertTriangle} label="Nullified (malpractice)" value={s.nullified} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Eligible students: booking status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bar label="Booked" value={s.booked} total={s.booked + s.unbooked} color="bg-gradient-to-r from-indigo-500 to-violet-500" />
            <Bar label="Not booked" value={s.unbooked} total={s.booked + s.unbooked} color="bg-amber-400" />
            <div className="border-t pt-4">
              <Bar label="Funnel: earned badge" value={s.passed} total={s.totalStudents} color="bg-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Eligible but not booked ({unbooked.length})</CardTitle></CardHeader>
          <CardContent>
            {unbooked.length === 0 ? <EmptyState title="Everyone eligible has booked" /> : (
              <ul className="divide-y">
                {unbooked.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span><span className="font-medium">{u.name}</span> <span className="text-muted-foreground">· {u.rollNo} · {u.track}</span></span><StateBadge state={u.state} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Upcoming interviews</CardTitle></CardHeader>
        <CardContent>
          {upcoming.length === 0 ? <EmptyState title="No upcoming interviews" /> : (
            <ul className="divide-y">
              {upcoming.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium">{u.name} <span className="font-normal text-muted-foreground">· {u.track}</span></span>
                  <span className="text-muted-foreground">{fmtDateTime(u.nextInterview.startsAt)} with {u.nextInterview.interviewer}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
