import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { unauthorized, wrap } from '../lib/errors.js';
import { authenticate, signToken } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  student: u.student
    ? { id: u.student.id, rollNo: u.student.rollNo, track: u.student.track, college: u.student.college }
    : null,
});

router.post(
  '/login',
  wrap(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email }, include: { student: true } });
    // same message for unknown email and wrong password: no account enumeration
    const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) throw unauthorized('Invalid email or password');
    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get(
  '/me',
  authenticate,
  wrap(async (req, res) => res.json({ user: publicUser(req.user) })),
);

export default router;
