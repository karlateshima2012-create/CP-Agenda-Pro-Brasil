import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

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

    const workingHours = typeof availability.working_hours === 'string'
      ? JSON.parse(availability.working_hours)
      : availability.working_hours;

    const jsDay = new Date(date + 'T12:00:00Z').getDay();
    const dayMap: Record<number, string> = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado', 0: 'domingo' };
    const dayName = dayMap[jsDay];

    const config = (workingHours as any[]).find(h => {
      const d = String(h.day).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      return d === dayName;
    });

    if (!config?.isWorking) return res.json([]);

    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const interval = availability.interval_minutes || 30;
    const startMin = toMin(config.startTime || '09:00');
    const endMin = toMin(config.endTime || '18:00');

    const baseSlots: number[] = [];
    if (config.timeType === 'fixed' && Array.isArray(config.fixedTimes)) {
      config.fixedTimes.forEach((t: string) => baseSlots.push(toMin(t)));
    } else {
      for (let cur = startMin; cur + totalSlot <= endMin; cur += interval) baseSlots.push(cur);
    }

    const startOfDay = new Date(`${date}T00:00:00-03:00`);
    const endOfDay = new Date(`${date}T23:59:59-03:00`);

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

    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayStr = nowBRT.toLocaleDateString('en-CA');
    const isToday = date === todayStr;
    const currentMin = nowBRT.getHours() * 60 + nowBRT.getMinutes();

    const times = baseSlots
      .filter(cur => !(isToday && cur <= currentMin + 15))
      .map(cur => {
        const timeStr = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
        const slotStart = new Date(`${date}T${timeStr}:00-03:00`).getTime();
        const slotEnd = slotStart + totalSlot * 60000;

        const busy = appointments.some(a => {
          const aStart = a.start_at.getTime();
          const aEnd = aStart + a.duration * 60000;
          return slotStart < aEnd && slotEnd > aStart;
        });

        const blocked = blockedDates.some(b => {
          if (!b.start_time) return true;
          const bStart = toMin(b.start_time.toISOString().substring(11, 16));
          const bEnd = b.end_time ? toMin(b.end_time.toISOString().substring(11, 16)) : bStart + interval;
          return cur < bEnd && cur + duration > bStart;
        });

        return { time: timeStr, isAvailable: !busy && !blocked };
      });

    res.json(times);
  } catch (error) {
    console.error('Slots error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
