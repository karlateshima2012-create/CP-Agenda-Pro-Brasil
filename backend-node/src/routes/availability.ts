import { Router } from 'express';
import { prisma } from '../server.js';
import { toZonedTime } from 'date-fns-tz';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Obter disponibilidade (Admin Dashboard)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    const availability = await prisma.availability.findFirst({
      where: { account_id: accountId }
    });

    if (!availability) {
      return res.json({ workingHours: [], intervalMinutes: 30 });
    }

    res.json({
      workingHours: typeof availability.working_hours === 'string' 
        ? JSON.parse(availability.working_hours) 
        : availability.working_hours,
      intervalMinutes: availability.interval_minutes
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Salvar disponibilidade (Admin Dashboard)
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    const { workingHours, intervalMinutes } = req.body;

    const existing = await prisma.availability.findFirst({
      where: { account_id: accountId }
    });

    if (existing) {
      await prisma.availability.updateMany({
        where: { account_id: accountId },
        data: {
          working_hours: workingHours,
          interval_minutes: intervalMinutes || 30
        }
      });
    } else {
      await prisma.availability.create({
        data: {
          account_id: accountId,
          working_hours: workingHours,
          interval_minutes: intervalMinutes || 30
        }
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Motor de slots públicos

router.get('/slots/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { date, duration, buffer } = req.query; // date=YYYY-MM-DD, duration=min, buffer=min

    if (!date) return res.status(400).json({ error: 'Data é obrigatória' });
    
    const totalDuration = parseInt(duration as string) || 30;
    const totalBuffer = parseInt(buffer as string) || 0;
    const totalSlotDuration = totalDuration + totalBuffer;

    const accId = parseInt(accountId);

    // Buscar configurações de disponibilidade
    const availability = await prisma.availability.findFirst({
      where: { account_id: accId }
    });

    if (!availability) {
      return res.status(404).json({ error: 'Configuração de disponibilidade não encontrada' });
    }

    // Processar horários de trabalho
    const workingHours = typeof availability.working_hours === 'string' 
      ? JSON.parse(availability.working_hours) 
      : availability.working_hours;

    const jsDayOfWeek = new Date(date + 'T12:00:00Z').getDay();
    const jsDayToPtDay: Record<number, string> = {
      1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado', 0: 'domingo'
    };
    const dayName = jsDayToPtDay[jsDayOfWeek];

    const config = workingHours.find((h: any) => {
      const hDay = String(h.day).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return hDay === dayName || hDay === String(jsDayOfWeek);
    });

    if (!config || !config.isWorking) {
      return res.json([]);
    }

    let startTime = config.startTime || '09:00';
    let endTime = config.endTime || '18:00';
    if (totalDuration >= 1440) endTime = startTime;

    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const interval = availability.interval_minutes || 30;
    const times: { time: string, isAvailable: boolean }[] = [];
    const baseIntervalTimes: number[] = [];

    if (config.timeType === 'fixed' && config.fixedTimes && config.fixedTimes.length > 0) {
      config.fixedTimes.forEach((tStr: string) => baseIntervalTimes.push(toMin(tStr)));
    } else {
      let curr = toMin(startTime);
      const end = (totalDuration >= 1440) ? curr : toMin(endTime);
      while (curr <= end) {
        baseIntervalTimes.push(curr);
        if (totalDuration >= 1440) break;
        curr += interval;
      }
    }

    // Buscar agendamentos e bloqueios do dia
    const startOfDay = new Date(`${date}T00:00:00-03:00`);
    const endOfDay = new Date(`${date}T23:59:59-03:00`);

    const appointments = await prisma.appointment.findMany({
      where: {
        account_id: accId,
        start_at: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['canceled', 'rejected'] }
      }
    });

    const blockedDates = await prisma.blockedDate.findMany({
      where: {
        account_id: accId,
        blocked_date: new Date(`${date}T00:00:00Z`) // Ajuste conforme timezone DB
      }
    });

    // Fuso de SP para checar "isToday" e tempo passado
    const nowBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const todayStr = `${nowBRT.getFullYear()}-${String(nowBRT.getMonth()+1).padStart(2,'0')}-${String(nowBRT.getDate()).padStart(2,'0')}`;
    const isToday = date === todayStr;
    const currentMinutes = nowBRT.getHours() * 60 + nowBRT.getMinutes();

    const toTimestamp = (dStr: string) => new Date(dStr).getTime();

    for (const curr of baseIntervalTimes) {
      if (config.timeType !== 'fixed' && totalDuration < 1440 && (curr + totalSlotDuration) > toMin(endTime)) {
        break; 
      }
      if (isToday && curr <= currentMinutes + 15) {
        continue;
      }

      const timeStr = `${String(Math.floor(curr / 60)).padStart(2, '0')}:${String(curr % 60).padStart(2, '0')}`;
      const slotStartTimestamp = toTimestamp(`${date}T${timeStr}:00-03:00`);
      const slotEndTimestamp = slotStartTimestamp + (totalSlotDuration * 60000);

      const isBusy = appointments.some(a => {
        const apptStartTimestamp = a.start_at.getTime();
        const apptEndTimestamp = apptStartTimestamp + (a.duration * 60000);
        return (slotStartTimestamp < apptEndTimestamp && slotEndTimestamp > apptStartTimestamp);
      });

      const isBlockedInSlot = blockedDates.some(b => {
        if (!b.start_time) return true;
        const bStart = toMin(b.start_time.toISOString().substring(11, 16));
        const bEnd = b.end_time ? toMin(b.end_time.toISOString().substring(11, 16)) : bStart + interval;
        const slotStart = toMin(timeStr);
        const slotEnd = slotStart + totalDuration;
        return (slotStart < bEnd && slotEnd > bStart);
      });

      times.push({ time: timeStr, isAvailable: !isBusy && !isBlockedInSlot });
    }

    res.json(times);

  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
