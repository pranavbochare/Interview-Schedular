import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { Spinner } from '@/components/common';
import Login from '@/pages/Login';
import StudentDashboard from '@/pages/student/Dashboard';
import BookInterview from '@/pages/student/BookInterview';
import MyResults from '@/pages/student/MyResults';
import JourneyPreview from '@/pages/student/JourneyPreview';
import InterviewerSchedule from '@/pages/interviewer/Schedule';
import Availability from '@/pages/interviewer/Availability';
import InterviewerBookings from '@/pages/interviewer/Bookings';
import AdminOverview from '@/pages/admin/Overview';
import AdminStudents from '@/pages/admin/Students';
import AdminInterviewers from '@/pages/admin/Interviewers';
import AdminSchedule from '@/pages/admin/Schedule';
import AdminResults from '@/pages/admin/Results';

const HOME = { STUDENT: '/student', INTERVIEWER: '/interviewer', ADMIN: '/admin' };

// Client-side RBAC: the server enforces the same rules, this just keeps people on their own screens
function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

function Shell() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={HOME[user.role]} replace /> : <Login />} />
      <Route element={<Shell />}>
        <Route path="/student" element={<RequireRole role="STUDENT"><StudentDashboard /></RequireRole>} />
        <Route path="/student/book" element={<RequireRole role="STUDENT"><BookInterview /></RequireRole>} />
        <Route path="/student/results" element={<RequireRole role="STUDENT"><MyResults /></RequireRole>} />
        <Route path="/student/journey-preview" element={<RequireRole role="STUDENT"><JourneyPreview /></RequireRole>} />

        <Route path="/interviewer" element={<RequireRole role="INTERVIEWER"><InterviewerSchedule /></RequireRole>} />
        <Route path="/interviewer/availability" element={<RequireRole role="INTERVIEWER"><Availability /></RequireRole>} />
        <Route path="/interviewer/bookings" element={<RequireRole role="INTERVIEWER"><InterviewerBookings /></RequireRole>} />

        <Route path="/admin" element={<RequireRole role="ADMIN"><AdminOverview /></RequireRole>} />
        <Route path="/admin/students" element={<RequireRole role="ADMIN"><AdminStudents /></RequireRole>} />
        <Route path="/admin/interviewers" element={<RequireRole role="ADMIN"><AdminInterviewers /></RequireRole>} />
        <Route path="/admin/schedule" element={<RequireRole role="ADMIN"><AdminSchedule /></RequireRole>} />
        <Route path="/admin/results" element={<RequireRole role="ADMIN"><AdminResults /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? HOME[user.role] : '/login'} replace />} />
    </Routes>
  );
}
