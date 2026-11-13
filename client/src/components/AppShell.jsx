import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, GitCompare, LayoutDashboard, LogOut, Menu, Trophy, UserCog, Users, X, Ticket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV = {
  STUDENT: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/book', label: 'Book interview', icon: CalendarCheck },
    { to: '/student/results', label: 'My results', icon: Trophy },
    { to: '/student/journey-preview', label: 'Before / After', icon: GitCompare },
  ],
  INTERVIEWER: [
    { to: '/interviewer', label: 'Daily schedule', icon: CalendarClock, end: true },
    { to: '/interviewer/availability', label: 'Availability', icon: CalendarDays },
    { to: '/interviewer/bookings', label: 'Bookings', icon: ClipboardList },
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/interviewers', label: 'Interviewers', icon: UserCog },
    { to: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/admin/results', label: 'Results', icon: Trophy },
  ],
};
const ROLE_LABEL = { STUDENT: 'Student', INTERVIEWER: 'Interviewer', ADMIN: 'Admin' };

function Notifications() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const load = () => api.get('/notifications').then(setData).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) await load();
  };
  const markAll = async () => { await api.post('/notifications/read-all'); load(); };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Notifications" className="relative">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">{data.unread}</span>}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {data.unread > 0 && <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">Mark all read</button>}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {data.notifications.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>}
              {data.notifications.map((n) => (
                <div key={n.id} className={cn('border-b px-4 py-3 last:border-0', !n.read && 'bg-accent/60')}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {NAV[user.role].map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-white/15 text-white' : 'text-indigo-100/80 hover:bg-white/10 hover:text-white')}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-6 py-6 text-white">
      <div className="rounded-lg bg-white/15 p-2"><Ticket className="h-5 w-5" /></div>
      <div>
        <p className="font-bold leading-none">GRIT</p>
        <p className="text-xs text-indigo-200">Interview Scheduler</p>
      </div>
    </div>
  );

  const sidebarClass = 'bg-gradient-to-b from-indigo-700 via-indigo-800 to-violet-900';

  return (
    <div className="min-h-screen">
      <aside className={cn('fixed inset-y-0 left-0 z-20 hidden w-64 flex-col lg:flex', sidebarClass)}>{brand}{nav}
        <div className="m-3 rounded-lg bg-white/10 p-3 text-xs text-indigo-100">Signed in as <span className="font-semibold text-white">{ROLE_LABEL[user.role]}</span></div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <aside className={cn('relative flex h-full w-64 flex-col', sidebarClass)}>
            <button className="absolute right-3 top-4 text-white" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
            {brand}{nav}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-4 backdrop-blur sm:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <Notifications />
            <div className="ml-2 hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{user.student ? user.student.rollNo : ROLE_LABEL[user.role]}</p>
            </div>
            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-semibold text-white">{user.name[0]}</div>
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => { logout(); navigate('/login'); }}><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
