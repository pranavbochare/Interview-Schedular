import { useAuth } from '@/context/AuthContext';
import { useFetch } from '@/hooks/useFetch';
import { PageHeader, Spinner, ErrorState } from '@/components/common';
import StudentJourney from '@/components/StudentJourney';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch('/student/overview');
  return (
    <>
      <PageHeader title={`Hi ${user.name.split(' ')[0]} 👋`} description={`${user.student.college} · ${user.student.rollNo}`} />
      {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : <StudentJourney data={data} />}
    </>
  );
}
