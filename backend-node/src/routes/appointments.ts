import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// =======================================================
// ROTAS PÚBLICAS (NÃO REQUER AUTH)
// =======================================================

router.post('/create', async (req, res) => {
  try {
    const { 
      professional_id, service_id, service_name, 
      client_name, client_email, client_phone, 
      date, time, duration 
    } = req.body;

    const accountId = parseInt(professional_id);

    // Salvar ou atualizar cliente silenciosamente
    let client = await prisma.client.findUnique({
      where: {
        account_id_phone: {
          account_id: accountId,
          phone: client_phone
        }
      }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          account_id: accountId,
          name: client_name,
          phone: client_phone,
          email: client_email || ''
        }
      });
    }

    const startAt = new Date(`${date}T${time}:00-03:00`);

    const appointment = await prisma.appointment.create({
      data: {
        account_id: accountId,
        client_name,
        client_email: client_email || '',
        client_phone,
        service_id: parseInt(service_id) || 0,
        service_name: service_name || '',
        start_at: startAt,
        duration: parseInt(duration),
        status: 'pending'
      }
    });

    res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});


// =======================================================
// ROTAS PRIVADAS (REQUER AUTH)
// =======================================================

// Listar agendamentos do admin
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    // Implementação de paginação/limites caso enviem ?limit=1000
    const limit = parseInt(req.query.limit as string) || 500;

    const appointments = await prisma.appointment.findMany({
      where: { account_id: accountId },
      orderBy: { start_at: 'desc' },
      take: limit
    });

    res.json({
      items: appointments.map(a => ({
        id: a.id,
        account_id: a.account_id,
        user_id: a.user_id,
        client_name: a.client_name,
        client_email: a.client_email,
        client_phone: a.client_phone,
        service_id: a.service_id,
        service_name: a.service_name,
        start_at: a.start_at.toISOString().replace('T', ' '), // Retornando no formato que o Frontend esperava
        duration: a.duration,
        status: a.status,
        created_at: a.created_at ? a.created_at.toISOString().replace('T', ' ') : null,
        updated_at: a.updated_at ? a.updated_at.toISOString().replace('T', ' ') : null
      }))
    });
  } catch (error) {
    console.error('List appointments error:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// Atualizar status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const id = parseInt(req.params.id as string);
    const { status } = req.body;

    await prisma.appointment.updateMany({
      where: { id, account_id: accountId },
      data: { status }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Deletar agendamento único
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const id = parseInt(req.params.id as string);

    await prisma.appointment.deleteMany({
      where: { id, account_id: accountId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

// Deletar em massa
router.post('/bulk-delete', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    await prisma.appointment.deleteMany({
      where: {
        id: { in: ids },
        account_id: accountId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Bulk delete appointments error:', error);
    res.status(500).json({ error: 'Erro ao excluir agendamentos' });
  }
});

export default router;
