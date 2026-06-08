import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Atualizar perfil / conta (Dashboard)
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    const body = req.body;
    
    // Mapeamento de campos do frontend para o banco Prisma
    const data: any = {};
    if (body.companyName !== undefined) data.name = body.companyName;
    if (body.contactPhone !== undefined) data.owner_name = body.contactPhone; // mapped to owner_name
    if (body.primaryColor !== undefined) data.primary_color = body.primaryColor;
    if (body.secondaryColor !== undefined) data.secondary_color = body.secondaryColor;
    if (body.shortDescription !== undefined) data.short_description = body.shortDescription;
    if (body.servicesTitle !== undefined) data.services_title = body.servicesTitle;
    if (body.servicesSubtitle !== undefined) data.services_subtitle = body.servicesSubtitle;
    if (body.coverImage !== undefined) data.cover_image = body.coverImage;
    if (body.profileImage !== undefined) data.profile_image = body.profileImage;
    if (body.viewMode !== undefined) data.view_mode = body.viewMode;
    if (body.coverOpacity !== undefined) data.cover_opacity = body.coverOpacity;
    if (body.telegramBotToken !== undefined) data.telegram_bot_token = body.telegramBotToken;
    if (body.telegramChatId !== undefined) data.telegram_chat_id = body.telegramChatId;

    await prisma.account.update({
      where: { id: accountId },
      data
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Alterar Senha
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const hash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: hash,
        must_change_password: false
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar onboarding
router.post('/onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user?.accountId;
    const { seen } = req.body;

    await prisma.account.update({
      where: { id: accountId },
      data: { onboarding_seen: seen }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
