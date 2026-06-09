import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Atualizar perfil / conta
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const body = req.body;

    const data: Record<string, any> = {};
    if (body.companyName       !== undefined) data.name               = body.companyName;
    if (body.contactPhone      !== undefined) data.contact_phone      = body.contactPhone;
    if (body.primaryColor      !== undefined) data.primary_color      = body.primaryColor;
    if (body.secondaryColor    !== undefined) data.secondary_color    = body.secondaryColor;
    if (body.shortDescription  !== undefined) data.short_description  = body.shortDescription;
    if (body.servicesTitle     !== undefined) data.services_title     = body.servicesTitle;
    if (body.servicesSubtitle  !== undefined) data.services_subtitle  = body.servicesSubtitle;
    if (body.coverImage        !== undefined) data.cover_image        = body.coverImage;
    if (body.profileImage      !== undefined) data.profile_image      = body.profileImage;
    if (body.viewMode          !== undefined) data.view_mode          = body.viewMode;
    if (body.coverOpacity      !== undefined) data.cover_opacity      = body.coverOpacity;
    if (body.telegramBotToken  !== undefined) data.telegram_bot_token = body.telegramBotToken;
    if (body.telegramChatId    !== undefined) data.telegram_chat_id   = body.telegramChatId;
    if (body.timezone          !== undefined) data.timezone           = body.timezone;

    if (Object.keys(data).length > 0) {
      await prisma.account.update({ where: { id: accountId }, data });
    }

    res.json({ msg: 'Perfil atualizado' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Alterar senha
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;

    if (!password || (password as string).length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres' });
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { password_hash: await bcrypt.hash(password, 10), must_change_password: false }
    });

    res.json({ msg: 'Senha atualizada' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Registrar onboarding visto
router.post('/onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    await prisma.account.update({
      where: { id: req.user!.accountId },
      data: { onboarding_seen: req.body.seen === true }
    });
    res.json({ msg: 'Onboarding atualizado' });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Registrar último acesso (throttle: só atualiza se passou mais de 1 hora)
router.post('/ping', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const acc = await prisma.account.findUnique({
      where: { id: accountId },
      select: { last_access_at: true }
    });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!acc?.last_access_at || acc.last_access_at < oneHourAgo) {
      await prisma.account.update({
        where: { id: accountId },
        data: { last_access_at: new Date() }
      });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
