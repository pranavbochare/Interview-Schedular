import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { wrap } from '../lib/errors.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  wrap(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ notifications: items, unread: items.filter((n) => !n.read).length });
  }),
);

router.post(
  '/read-all',
  wrap(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ ok: true });
  }),
);

router.post(
  '/:id/read',
  wrap(async (req, res) => {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: true } });
    res.json({ ok: true });
  }),
);

export default router;
