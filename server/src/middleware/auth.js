import jwt from 'jsonwebtoken';
import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized, wrap } from '../lib/errors.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Verifies the JWT and loads the user (so deactivated accounts lose access immediately)
export const authenticate = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Session expired. Please sign in again.');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { student: true } });
  if (!user || !user.active) throw unauthorized('Account not found or deactivated');
  req.user = user;
  next();
});

// RBAC guard: authorize('ADMIN', 'INTERVIEWER')
export const authorize =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user.role) ? next() : next(forbidden());
