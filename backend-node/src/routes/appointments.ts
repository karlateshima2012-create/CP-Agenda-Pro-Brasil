import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';
import { sendTelegramMessage, buildAppointmentMessage } from '../lib/telegram.js';
import { dateInTZ, todayInTZ, validateBookingDate } from '../lib/scheduling.js';

const router = Router();

// Express 5 tipifica query params como string | string[] | ParsedQs | ParsedQs[]
function qstr(val: unknown): string | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? String(val[0]) : String(val);
}

// =======================================================
// ROTA PÚBLICA — criar agendamento
// =======================================================

router.post('/create', async (req, res) => {
  const {
    account_id, professional_id,
    serviceId, serviceName,
    startAt, duration,
    clientName, clientPhone: clientPhoneRaw, clientEmail
  } = req.body;

  const accId = account_id
    ? parseInt(account_id)
    : professional_id
      ? await (async () => {
          const u = await prisma.user.findUnique({ where: { id: parseInt(professional_id) }, select: { account_id: true } });
          return u?.account_id ?? null;
        })()
      : null;

  if (!accId) return res.status(400).json({ error: 'Conta não encontrada' });
  if (!startAt) return res.status(400).json({ error: 'Data/hora é obrigatória' });

  const svcId = parseInt(serviceId) || 0;
  const durationMin = parseInt(duration) || 30;

  // Buscar serviço da conta
  const svc = await prisma.service.findUnique({ where: { id: svcId }, select: { cleaning_buffer_min: true } });

  const tz = 'America/Sao_Paulo';
  const buffer = svc?.cleaning_buffer_min ?? 0;
  const totalMin = durationMin + buffer;

  const startDt = new Date(startAt);
  if (isNaN(startDt.getTime())) return res.status(400).json({ error: 'Data/hora inválida' });

  const endDt = new Date(startDt.getTime() + totalMin * 60000);

  // Validação de data no fuso do profissional
  const startDateStr = dateInTZ(startDt, tz);
  const bookingError = validateBookingDate(startAt, todayInTZ(tz), tz);
  if (bookingError) return res.status(400).json({ error: bookingError });

  const clientPhone = (clientPhoneRaw || '').replace(/\D/g, '');

  try {
    // Verificar data bloqueada
    const blockedDate = await prisma.blockedDate.findFirst({
      where: {
        account_id: accId,
        blocked_date: new Date(`${startDateStr}T00:00:00Z`),
        OR: [
          { start_time: null },
          {
            start_time: { lte: startDt },
            end_time: { gte: startDt }
          }
        ]
      }
    });

    if (blockedDate) {
      return res.status(400).json({ error: 'Este horário está bloqueado. Por favor, escolha outro.' });
    }

    // Verificar conflito de horário (transação protegida)
    const conflict = await prisma.appointment.findFirst({
      where: {
        account_id: accId,
        deleted_at: null,
        status: { notIn: ['canceled', 'rejected'] },
        start_at: { lt: endDt },
        end_datetime: { gt: startDt }
      }
    });

    if (conflict) {
      return res.status(409).json({ error: 'Este horário acabou de ser reservado. Por favor, escolha outro.' });
    }

    // Upsert cliente (CRM)
    if (clientPhone) {
      await prisma.client.upsert({
        where: { account_id_phone: { account_id: accId, phone: clientPhone } },
        update: { name: clientName || '', email: clientEmail || '' },
        create: { account_id: accId, name: clientName || '', phone: clientPhone, email: clientEmail || '' }
      });
    }

    // Inserir agendamento
    const appointment = await prisma.appointment.create({
      data: {
        account_id: accId,
        user_id: professional_id ? parseInt(professional_id) : null,
        client_name: clientName || '',
        client_email: clientEmail || '',
        client_phone: clientPhone,
        service_id: svcId,
        service_name: serviceName || '',
        start_at: startDt,
        end_datetime: endDt,
        duration: durationMin,
        status: 'pending'
      }
    });

    // Notificação Telegram (fora da transação — nunca quebra o fluxo)
    setImmediate(async () => {
      try {
        const acc = await prisma.account.findUnique({
          where: { id: accId },
          select: { telegram_bot_token: true, telegram_chat_id: true }
        });
        if (acc?.telegram_bot_token && acc?.telegram_chat_id) {
          const msg = buildAppointmentMessage(clientName || 'Cliente', clientPhoneRaw || '', serviceName || 'Serviço', startDt);
          await sendTelegramMessage(acc.telegram_bot_token, acc.telegram_chat_id, msg);
        }
      } catch { /* Notificação opcional — nunca falhar o request */ }
    });

    res.status(201).json({ id: appointment.id });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// =======================================================
// ROTAS PRIVADAS
// =======================================================

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const limit = Math.min(parseInt(qstr(req.query.limit) || '50'), 1000);
    const page = parseInt(qstr(req.query.page) || '1');
    const offset = (page - 1) * limit;
    const from = qstr(req.query.from);
    const to = qstr(req.query.to);
    const showDeleted = qstr(req.query.history) === 'true';

    const where: any = { account_id: accountId };
    if (!showDeleted) where.deleted_at = null;
    if (from) where.start_at = { ...where.start_at, gte: new Date(from) };
    if (to) where.start_at = { ...where.start_at, lte: new Date(to) };

    const [total, items] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        orderBy: { start_at: 'desc' },
        skip: offset,
        take: limit
      })
    ]);

    res.json({
      items: items.map(a => ({
        id: a.id,
        account_id: a.account_id,
        user_id: a.user_id,
        client_name: a.client_name,
        client_email: a.client_email,
        client_phone: a.client_phone,
        service_id: a.service_id,
        service_name: a.service_name,
        start_at: a.start_at.toISOString().replace('T', ' ').slice(0, 19),
        duration: a.duration,
        status: a.status,
        deleted_at: a.deleted_at,
        created_at: a.created_at ? a.created_at.toISOString().replace('T', ' ').slice(0, 19) : null,
        updated_at: a.updated_at ? a.updated_at.toISOString().replace('T', ' ').slice(0, 19) : null
      })),
      pagination: { total, page, limit, hasMore: offset + items.length < total }
    });
  } catch (error) {
    console.error('List appointments error:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const { status } = req.body;

    const current = await prisma.appointment.findFirst({
      where: { id, account_id: accountId, deleted_at: null }
    });
    if (!current) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // Contabilizar confirmações
    if (current.status !== 'confirmed' && status === 'confirmed') {
      await prisma.account.update({
        where: { id: accountId },
        data: { lifetime_appointments: { increment: 1 } }
      });
    }

    await prisma.appointment.update({ where: { id }, data: { status } });
    res.json({ msg: 'Status atualizado' });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

    await prisma.appointment.updateMany({
      where: { id, account_id: accountId, deleted_at: null },
      data: { deleted_at: new Date() }
    });

    res.json({ msg: 'Agendamento excluído (soft delete)' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

router.post('/bulk-delete', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const ids: number[] = req.body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Nenhum agendamento selecionado' });
    }

    const safeIds = ids.map(Number).filter(n => !isNaN(n) && n > 0);

    await prisma.appointment.updateMany({
      where: { id: { in: safeIds }, account_id: accountId, deleted_at: null },
      data: { deleted_at: new Date() }
    });

    res.json({ msg: `${safeIds.length} agendamentos excluídos.` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Erro ao excluir agendamentos' });
  }
});

export default router;
