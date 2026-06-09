import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest, getJwtSecret } from '../middlewares/auth.js';
import { loginRateLimiter, forgotPasswordRateLimiter } from '../middlewares/rateLimiter.js';
import { sendMail, buildResetEmail } from '../lib/mail.js';

const router = Router();

router.post('/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { account: true }
    });

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, accountId: user.account_id, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
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

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { account: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

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
        contact_phone: user.account.contact_phone,
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

router.post('/forgot-password', forgotPasswordRateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  // Resposta vaga intencional — não revelar se o e-mail existe ou não
  const vague = { message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(vague);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_expires: expires }
    });

    const appUrl = process.env.APP_URL || `https://${process.env.HTTP_HOST || 'cpagendapro.creativeprintjp.com'}`;
    const resetLink = `${appUrl}/reset-password?code=${token}`;

    await sendMail(email, 'Recuperação de Senha - CP Agenda Pro', buildResetEmail(resetLink));

    res.json(vague);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.json(vague); // Nunca revelar erro interno ao público
  }
});

router.post('/reset-password', async (req, res) => {
  const { code, password } = req.body;

  if (!code || !password) {
    return res.status(400).json({ error: 'Código e nova senha são obrigatórios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        reset_token: code,
        reset_expires: { gt: new Date() }
      }
    });

    if (!user) return res.status(400).json({ error: 'Código inválido ou expirado' });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hash, reset_token: null, reset_expires: null }
    });

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
