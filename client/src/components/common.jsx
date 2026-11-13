import { Loader2, Inbox } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Spinner = ({ className }) => (
  <div className={cn('flex items-center justify-center py-16 text-muted-foreground', className)}>
    <Loader2 className="h-5 w-5 animate-spin" />
  </div>
);

export const EmptyState = ({ title, hint, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
    <div className="rounded-full bg-accent p-3 text-accent-foreground"><Icon className="h-5 w-5" /></div>
    <p className="font-medium">{title}</p>
    {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => (
  <Card className="border-red-200 p-6 text-sm text-red-700">
    {error?.message ?? 'Something went wrong.'}{' '}
    {onRetry && <button className="font-medium underline" onClick={onRetry}>Retry</button>}
  </Card>
);

export const StatCard = ({ label, value, icon: Icon, hint, tone = 'indigo' }) => {
  const tones = { indigo: 'bg-indigo-50 text-indigo-600', violet: 'bg-violet-50 text-violet-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-600' };
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn('rounded-lg p-3', tones[tone])}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground/80">{hint}</p>}
      </div>
    </Card>
  );
};

export const Progress = ({ value, max }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
);

export const Field = ({ label, error, children }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);
