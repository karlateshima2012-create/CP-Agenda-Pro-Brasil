import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { generalRateLimiter } from './middlewares/rateLimiter.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import meRoutes from './routes/me.js';
import servicesRoutes from './routes/services.js';
import clientsRoutes from './routes/clients.js';
import blockedDatesRoutes from './routes/blocked-dates.js';
import availabilityRoutes from './routes/availability.js';
import appointmentsRoutes from './routes/appointments.js';
import publicRoutes from './routes/public.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não está definido no .env. Abortando.');
  process.exit(1);
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map(o => o.trim());

const app = express();
export const prisma = new PrismaClient();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origem não permitida: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(generalRateLimiter);

// Wrapper de resposta: normaliza para { ok: true, data: ... } ou { ok: false, error: ... }
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    if ('ok' in (body ?? {})) return originalJson(body);

    if (res.statusCode >= 400) {
      return originalJson({ ok: false, error: body?.error || body?.message || 'Erro desconhecido' });
    }
    if (body?.success === true) {
      const { success, ...rest } = body;
      return originalJson({ ok: true, data: Object.keys(rest).length ? rest : {} });
    }
    return originalJson({ ok: true, data: body });
  };
  next();
});

app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/blocked-dates', blockedDatesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
