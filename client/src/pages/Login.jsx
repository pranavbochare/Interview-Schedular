import { useState } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const DEMO = [
  { role: 'Student (eligible)', email: 'aarav@niat.edu' },
  { role: 'Student (booked)', email: 'diya@niat.edu' },
  { role: 'Student (passed)', email: 'vikram@niat.edu' },
  { role: 'Student (nullified)', email: 'arjun@niat.edu' },
  { role: 'Interviewer', email: 'rahul@grit.dev' },
  { role: 'Admin', email: 'admin@grit.dev' },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try { await login(email, password); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3"><div className="rounded-lg bg-white/15 p-2"><Ticket className="h-6 w-6" /></div><span className="text-xl font-bold">GRIT</span></div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Clear the skills.<br />Book the interview.<br />Earn your badge.</h2>
          <p className="mt-4 max-w-md text-indigo-200">One place for students to book interviews, interviewers to run their day, and the GRIT team to see who's ready.</p>
        </div>
        <p className="text-sm text-indigo-300">GRIT Interview Scheduling System</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your dashboard</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@niat.edu" /></div>
            <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in</Button>
          </form>
          <div className="mt-8 rounded-lg border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo accounts · password <code className="rounded bg-muted px-1">Password@123</code></p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword('Password@123'); }} className="rounded-md border px-2.5 py-2 text-left text-xs hover:bg-accent">
                  <span className="block font-medium">{d.role}</span><span className="text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
