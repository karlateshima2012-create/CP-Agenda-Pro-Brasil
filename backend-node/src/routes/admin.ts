import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Middleware local para validar se é super_admin
const requireSuperAdmin = (req: AuthRequest, res: any, next: any) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};

// Listar todos os perfis/usuários do sistema
router.get('/profiles', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        account: {
          include: {
            _count: {
              select: { appointments: true, services: true }
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      name: u.account.name,
      email: u.email,
      accountStatus: u.account.status,
      planType: u.account.plan_type,
      planExpiresAt: u.account.plan_expires_at,
      createdAt: u.account.created_at,
      servicesCount: u.account._count.services,
      appointmentsLast30Days: u.account._count.appointments,
      hasTelegram: !!u.account.telegram_bot_token,
      hasProfileImage: !!u.account.profile_image,
      hasCoverImage: !!u.account.cover_image,
      hasDescription: !!u.account.short_description
    }));

    res.json(mappedUsers);

  } catch (error) {
    console.error('List profiles error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar novo usuário e conta
router.post('/users', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { email, password, companyName, ownerName, contactPhone, planType, planExpiresAt } = req.body;

    if (!email || !password || !companyName || !ownerName) {
      return res.status(400).json({ error: 'Dados insuficientes' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está em uso' });
    }

    const hash = await bcrypt.hash(password, 10);

    const account = await prisma.account.create({
      data: {
        name: companyName,
        owner_name: ownerName,
        contact_phone: contactPhone || '',
        plan_type: planType || '6m',
        plan_expires_at: planExpiresAt ? new Date(planExpiresAt) : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        status: 'active'
      }
    });

    await prisma.user.create({
      data: {
        account_id: account.id,
        role: 'client',
        name: ownerName,
        email,
        password_hash: hash,
        must_change_password: true // Força a troca de senha no primeiro login
      }
    });

    res.json({ success: true, id: account.id });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar status da conta
router.patch('/profiles/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { accountStatus } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    await prisma.account.update({
      where: { id: user.account_id },
      data: { status: accountStatus }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Update profile status error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Renovar plano
router.post('/profiles/:id/renew', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const { months } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { account: true }
    });
    
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    let currentExpiry = user.account.plan_expires_at ? new Date(user.account.plan_expires_at) : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date(); // Se já expirou, renova a partir de hoje

    const newExpiry = new Date(currentExpiry.setMonth(currentExpiry.getMonth() + parseInt(months || 6)));

    await prisma.account.update({
      where: { id: user.account_id },
      data: { 
        plan_expires_at: newExpiry,
        status: 'active'
      }
    });

    res.json({ success: true, newExpiryDate: newExpiry.toISOString() });

  } catch (error) {
    console.error('Renew plan error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Excluir usuário permanentemente
router.delete('/users/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Excluir a conta (Isso exclui em cascata o usuário, serviços, etc, devido ao OnDelete: Cascade no Prisma)
    await prisma.account.delete({
      where: { id: user.account_id }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
