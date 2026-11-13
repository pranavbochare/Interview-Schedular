import { cn } from '@/lib/utils';

export const Table = ({ className, ...p }) => (
  <div className="w-full overflow-x-auto"><table className={cn('w-full text-sm', className)} {...p} /></div>
);
export const Th = ({ className, ...p }) => <th className={cn('whitespace-nowrap border-b bg-muted/60 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)} {...p} />;
export const Td = ({ className, ...p }) => <td className={cn('border-b px-4 py-3 align-middle', className)} {...p} />;
