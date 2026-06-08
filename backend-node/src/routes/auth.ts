import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Rota de Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Criar token
    const token = jwt.sign(
      { userId: user.id, accountId: user.account_id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        must_change_password: user.must_change_password,
        account_status: user.account.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota de Logout (Apenas responde com sucesso pois JWT é stateless)
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Recuperar dados da sessão atual
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { account: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        must_change_password: user.must_change_password,
        account_status: user.account.status
      },
      account: {
        id: user.account.id,
        name: user.account.name,
        contact_phone: user.account.owner_name, // Temporário, mapeando para não quebrar frontend
        status: user.account.status,
        plan_type: user.account.plan_type,
        plan_expires_at: user.account.plan_expires_at,
        primary_color: user.account.primary_color,
        secondary_color: user.account.secondary_color,
        short_description: user.account.short_description,
        services_title: user.account.services_title,
        services_subtitle: user.account.services_subtitle,
        cover_image: user.account.cover_image,
        profile_image: user.account.profile_image,
        view_mode: user.account.view_mode,
        cover_opacity: user.account.cover_opacity,
        telegram_bot_token: user.account.telegram_bot_token,
        telegram_chat_id: user.account.telegram_chat_id,
        lifetime_appointments: user.account.lifetime_appointments,
        onboarding_seen: user.account.onboarding_seen,
        created_at: user.account.created_at,
        invoices: user.account.invoices
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Recuperar senha (mock para compatibilidade imediata)
router.post('/forgot-password', async (req, res) => {
  res.json({ message: 'Se o email existir, um link de recuperação foi enviado.' });
});

export default router;
