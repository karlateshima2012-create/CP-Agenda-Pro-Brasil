import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middlewares/auth.js';
import { sendMail, buildWelcomeEmail } from '../lib/mail.js';

const router = Router();

// Todos os endpoints admin exigem auth + role admin/super_admin
router.use(requireAuth, requireAdmin);

// Listar todos os perfis com métricas
router.get('/profiles', async (_req: AuthRequest, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: { role: 'client' },
      include: {
        account: {
          include: {
            _count: {
              select: {
                services: { where: { is_active: true } }
              }
            }
          }
        }
      },
      orderBy: { id: 'desc' }
    });

    const profiles = await Promise.all(users.map(async u => {
      const [appts30d, lastAppt] = await Promise.all([
        prisma.appointment.count({
          where: {
            account_id: u.account_id,
            deleted_at: null,
            status: { notIn: ['canceled', 'rejected'] },
            start_at: { gte: thirtyDaysAgo }
          }
        }),
        prisma.appointment.findFirst({
          where: { account_id: u.account_id, status: 'confirmed', deleted_at: null },
          orderBy: { start_at: 'desc' },
          select: { start_at: true }
        })
      ]);

      return {
        id: String(u.id),
        email: u.email,
        role: u.role,
        companyName: u.account.name,
        ownerName: u.account.owner_name,
        contactPhone: u.account.contact_phone,
        accountStatus: u.account.status,
        planType: u.account.plan_type,
        planExpiresAt: u.account.plan_expires_at,
        createdAt: u.account.created_at,
        lastAccessAt: u.account.last_access_at,
        lastAppointmentAt: lastAppt?.start_at ?? null,
        appointmentCount: u.account.lifetime_appointments,
        appointmentsLast30Days: appts30d,
        servicesCount: u.account._count.services,
        hasTelegram: !!(u.account.telegram_bot_token),
        hasProfileImage: !!(u.account.profile_image),
        hasCoverImage: !!(u.account.cover_image),
        hasDescription: !!(u.account.short_description),
        invoices: u.account.invoices ?? []
      };
    }));

    res.json(profiles);
  } catch (error) {
    console.error('List profiles error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar perfil de um usuário
router.patch('/profiles/:id', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const data = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const fieldMap: Record<string, string> = {
      companyName: 'name',
      ownerName: 'owner_name',
      contactPhone: 'contact_phone',
      accountStatus: 'status',
      planType: 'plan_type',
      planExpiresAt: 'plan_expires_at',
      invoices: 'invoices'
    };

    const accountData: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const col = fieldMap[key] ?? key;
      if (Object.values(fieldMap).includes(col)) {
        accountData[col] = val;
      }
    }

    if (Object.keys(accountData).length > 0) {
      await prisma.account.update({ where: { id: user.account_id }, data: accountData });
    }

    if (data.email && data.email !== user.email) {
      const exists = await prisma.user.findFirst({ where: { email: data.email, id: { not: userId } } });
      if (exists) return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      await prisma.user.update({ where: { id: userId }, data: { email: data.email } });
    }

    res.json({ msg: 'Perfil atualizado' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Renovar plano
router.post('/profiles/:id/renew', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);
    const months = parseInt(req.body.months) || 1;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { account: true } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const base = user.account.plan_expires_at && user.account.plan_expires_at > new Date()
      ? user.account.plan_expires_at
      : new Date();

    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + months);

    await prisma.account.update({
      where: { id: user.account_id },
      data: { plan_expires_at: newExpiry, status: 'active' }
    });

    res.json({ newExpiryDate: newExpiry.toISOString() });
  } catch (error) {
    console.error('Renew plan error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Criar novo usuário/conta
router.post('/users', async (req: AuthRequest, res) => {
  try {
    const { email, password, companyName, ownerName, contactPhone, planType } = req.body;

    const required = ['email', 'password', 'companyName', 'ownerName'];
    for (const f of required) {
      if (!req.body[f]) return res.status(422).json({ error: `Campo obrigatório ausente: ${f}` });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(422).json({ error: 'E-mail inválido.' });
    }
    if ((password as string).length < 8) {
      return res.status(422).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'E-mail já cadastrado.' });

    const monthsMap: Record<string, number> = { '12m': 12, '6m': 6, '3m': 3, '1m': 1 };
    const months = monthsMap[planType] ?? 6;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const account = await prisma.account.create({
      data: {
        name: companyName,
        owner_name: ownerName,
        contact_phone: contactPhone || '',
        plan_type: planType || '6m',
        plan_expires_at: expiresAt,
        status: 'active'
      }
    });

    await prisma.user.create({
      data: {
        account_id: account.id,
        role: 'client',
        name: ownerName,
        email,
        password_hash: await bcrypt.hash(password, 10),
        must_change_password: true
      }
    });

    // E-mail de boas-vindas (assíncrono — não bloqueia a resposta)
    setImmediate(async () => {
      try {
        const appUrl = process.env.APP_URL || `https://cpagendapro.creativeprintjp.com`;
        const html = buildWelcomeEmail(ownerName, email, password, appUrl);
        await sendMail(email, 'Sua Agenda Profissional está pronta! - CP Agenda Pro', html);
      } catch (err) {
        console.error('[Admin] Falha ao enviar e-mail de boas-vindas:', err);
      }
    });

    res.json({ id: account.id });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Excluir usuário e conta (CASCADE apaga tudo)
router.delete('/users/:id', async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id as string);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Profissional não encontrado.' });

    await prisma.account.delete({ where: { id: user.account_id } });

    res.json({ msg: 'Profissional excluído com sucesso.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao excluir profissional.' });
  }
});

export default router;
