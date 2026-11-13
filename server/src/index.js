import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './lib/config.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import interviewerRoutes from './routes/interviewer.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
app.use(helmet());
app.use(cors({
  origin: config.clientOrigin,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/interviewer', interviewerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => console.log(`GRIT API running on http://localhost:${config.port}`));
