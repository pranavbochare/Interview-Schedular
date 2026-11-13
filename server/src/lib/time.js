import { config } from './config.js';

// Server-written messages (notifications, errors) are formatted in one configured timezone, not the server's own.
const part = (d, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: config.timezone, ...opts }).format(d);

/** "Sat, 14 Nov at 9:00 AM" */
export const fmtWhen = (d) =>
  `${part(d, { weekday: 'short' })}, ${part(d, { day: 'numeric', month: 'short' })} at ${part(d, { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}`;

/** "14 Nov" */
export const fmtDay = (d) => part(d, { day: 'numeric', month: 'short' });
