import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';
import {
  nowInTZ, dateInTZ, getDayConfig, getBaseSlots,
  filterPastSlots, buildSlotList, WorkingHourConfig
} from '../lib/scheduling.js';

const router = Router();

function qstr(val: unknown): string | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? String(val[0]) : String(val);
}

// GET — retorna configuração de disponibilidade + bloqueios
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;

    const [availability, blocked] = await Promise.all([
      prisma.availability.findFirst({ where: { account_id: accountId } }),
      prisma.blockedDate.findMany({
        where: { account_id: accountId },
        orderBy: { blocked_date: 'asc' }
      })
    ]);

    const blockedDates = blocked.map(b => ({
      id: b.id,
      date: b.blocked_date.toISOString().split('T')[0],
      startTime: b.start_time ? b.start_time.toISOString().substring(11, 16) : null,
      endTime: b.end_time ? b.end_time.toISOString().substring(11, 16) : null,
      reason: b.reason
    }));

    if (!availability) {
      return res.json({
        workingHours: [],
        blockedDates,
        intervalMinutes: 30,
        availableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      });
    }

    const workingHours = typeof availability.working_hours === 'string'
      ? JSON.parse(availability.working_hours)
      : availability.working_hours;

    const availableMonths = availability.available_months
      ? (typeof availability.available_months === 'string'
          ? JSON.parse(availability.available_months)
          : availability.available_months)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    res.json({
      workingHours,
      blockedDates,
      intervalMinutes: availability.interval_minutes ?? 30,
      availableMonths
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// PUT — salva disponibilidade + sincroniza bloqueios
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const { workingHours, intervalMinutes, blockedDates, availableMonths } = req.body;

    const whJson = JSON.stringify(workingHours ?? []);
    const amJson = JSON.stringify(availableMonths ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const interval = parseInt(intervalMinutes) || 30;

    const existing = await prisma.availability.findFirst({ where: { account_id: accountId } });

    if (existing) {
      await prisma.availability.update({
        where: { id: existing.id },
        data: { working_hours: whJson, interval_minutes: interval, available_months: amJson }
      });
    } else {
      await prisma.availability.create({
        data: { account_id: accountId, working_hours: whJson, interval_minutes: interval, available_months: amJson }
      });
    }

    // Sincronizar bloqueios: apaga todos e reinsere
    if (Array.isArray(blockedDates)) {
      await prisma.blockedDate.deleteMany({ where: { account_id: accountId } });

      for (const b of blockedDates) {
        if (!b.date) continue;
        await prisma.blockedDate.create({
          data: {
            account_id: accountId,
            blocked_date: new Date(b.date),
            start_time: b.startTime ? new Date(`1970-01-01T${b.startTime}:00Z`) : null,
            end_time: b.endTime ? new Date(`1970-01-01T${b.endTime}:00Z`) : null,
            reason: b.reason || ''
          }
        });
      }
    }

    res.json({ msg: 'Disponibilidade atualizada' });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// GET slots — motor público de horários disponíveis
router.get('/slots/:accountId', async (req, res) => {
  try {
    const accId = parseInt(req.params.accountId as string);
    const date = qstr(req.query.date);
    const duration = parseInt(qstr(req.query.duration) || '30');
    const buffer = parseInt(qstr(req.query.buffer) || '0');

    if (!date) return res.status(400).json({ error: 'Data é obrigatória' });

    const totalSlot = duration + buffer;

    const availability = await prisma.availability.findFirst({ where: { account_id: accId } });
    if (!availability) return res.status(404).json({ error: 'Disponibilidade não configurada' });

    const tz = 'America/Sao_Paulo';

    const workingHours = (typeof availability.working_hours === 'string'
      ? JSON.parse(availability.working_hours)
      : availability.working_hours) as WorkingHourConfig[];

    const interval = availability.interval_minutes || 30;
    const config = getDayConfig(workingHours, date);
    if (!config?.isWorking) return res.json([]);

    const baseSlots = getBaseSlots(config, interval, totalSlot);

    // Buscar agendamentos do dia no fuso do profissional
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay   = new Date(`${date}T23:59:59Z`);

    const [appointments, blockedDates] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          account_id: accId,
          deleted_at: null,
          start_at: { gte: startOfDay, lte: endOfDay },
          status: { notIn: ['canceled', 'rejected'] }
        }
      }),
      prisma.blockedDate.findMany({
        where: { account_id: accId, blocked_date: new Date(`${date}T00:00:00Z`) }
      })
    ]);

    const now = nowInTZ(tz);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const filteredSlots = filterPastSlots(baseSlots, date, dateInTZ(new Date(), tz), currentMin);

    const times = buildSlotList(filteredSlots, date, totalSlot, appointments, blockedDates, interval, tz);

    res.json(times);
  } catch (error) {
    console.error('Slots error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
