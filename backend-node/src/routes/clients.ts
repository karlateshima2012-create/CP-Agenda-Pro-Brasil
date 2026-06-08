import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Listar clientes
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const { search } = req.query;

    const whereClause: any = { account_id: accountId };
    
    if (search && typeof search === 'string') {
      whereClause.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const clients = await prisma.client.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    res.json(clients);

  } catch (error) {
    console.error('List clients error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar cliente
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const { name, phone, email } = req.body;

    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });
    if (!name || !phone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });

    // Verifica se já existe com esse telefone na conta
    const existing = await prisma.client.findUnique({
      where: {
        account_id_phone: {
          account_id: accountId,
          phone
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Já existe um cliente com este telefone nesta conta' });
    }

    const client = await prisma.client.create({
      data: {
        account_id: accountId,
        name,
        phone,
        email: email || ''
      }
    });

    res.json(client);

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Deletar cliente
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const id = parseInt(req.params.id as string);

    await prisma.client.deleteMany({
      where: { id, account_id: accountId }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
