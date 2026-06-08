import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
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

const app = express();
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (res.statusCode >= 400) {
      if (body && typeof body === 'object' && !('ok' in body)) {
        body.ok = false;
      }
      return originalJson.call(this, body);
    }
    if (body && typeof body === 'object' && !('ok' in body)) {
      // Remove o success: true redundante se houver
      if (body.success === true) delete body.success;
      return originalJson.call(this, { ok: true, data: body });
    }
    return originalJson.call(this, body);
  };
  next();
});


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CP Agenda Pro Brasil - Node.js API is running' });
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/me', meRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/blocked-dates', blockedDatesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentsRoutes);
// app.use('/api/appointments', appointmentRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
