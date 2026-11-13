import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';

export const notFoundHandler = (_req, res) => res.status(404).json({ error: 'Route not found' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  // Prisma unique-constraint violation: the race-condition safety net for double bookings
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'That slot was just taken. Please pick another.', code: 'SLOT_TAKEN' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
};
