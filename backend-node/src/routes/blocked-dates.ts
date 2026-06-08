import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Listar bloqueios
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    const blocks = await prisma.blockedDate.findMany({
      where: { account_id: accountId },
      orderBy: { blocked_date: 'asc' }
    });

    res.json(blocks.map(b => ({
      id: b.id,
      date: b.blocked_date.toISOString().split('T')[0],
      start_time: b.start_time ? b.start_time.toISOString().substring(11, 16) : null,
      end_time: b.end_time ? b.end_time.toISOString().substring(11, 16) : null,
      reason: b.reason
    })));

  } catch (error) {
    console.error('List blocked dates error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar bloqueio
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    const { date, start_time, end_time, reason } = req.body;

    if (!date) return res.status(400).json({ error: 'A data é obrigatória' });

    // Converter para DateTime do Prisma
    const blockedDate = new Date(date);
    
    // Tratamento de horas (Time fields no prisma/mysql)
    const startTime = start_time ? new Date(`1970-01-01T${start_time}:00Z`) : null;
    const endTime = end_time ? new Date(`1970-01-01T${end_time}:00Z`) : null;

    const block = await prisma.blockedDate.create({
      data: {
        account_id: accountId,
        blocked_date: blockedDate,
        start_time: startTime,
        end_time: endTime,
        reason: reason || ''
      }
    });

    res.json({ success: true, id: block.id });

  } catch (error) {
    console.error('Create blocked date error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Deletar bloqueio
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const id = parseInt(req.params.id as string);

    await prisma.blockedDate.deleteMany({
      where: { id, account_id: accountId }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Delete blocked date error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
