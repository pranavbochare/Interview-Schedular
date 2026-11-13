import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const base = 'h-10 w-full rounded-md border bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
export const Input = forwardRef(({ className, ...p }, ref) => <input ref={ref} className={cn(base, className)} {...p} />);
Input.displayName = 'Input';
export const Select = forwardRef(({ className, ...p }, ref) => <select ref={ref} className={cn(base, 'pr-8', className)} {...p} />);
Select.displayName = 'Select';
export const Textarea = forwardRef(({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, 'h-auto min-h-[90px] py-2', className)} {...p} />);
Textarea.displayName = 'Textarea';
export const Label = ({ className, ...p }) => <label className={cn('mb-1.5 block text-sm font-medium', className)} {...p} />;
