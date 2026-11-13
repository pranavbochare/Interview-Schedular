import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export const cn = (...inputs) => twMerge(clsx(inputs));
export const fmtDateTime = (d) => format(new Date(d), "EEE, d MMM · h:mm a");
export const fmtDate = (d) => format(new Date(d), 'EEE, d MMM yyyy');
export const fmtTime = (d) => format(new Date(d), 'h:mm a');
