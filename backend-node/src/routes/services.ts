import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { account_id: req.user!.accountId },
      orderBy: { sort_order: 'asc' }
    });

    res.json(services.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration_min,
      cleaning_buffer: s.cleaning_buffer_min ?? 0,
      price: Number(s.price),
      is_active: s.is_active,
      sort_order: s.sort_order,
      imageUrl: s.image_url ?? '',
      imageOpacity: s.image_opacity ?? 100,
      nameColor: s.name_color ?? null,
      descriptionColor: s.description_color ?? null
    })));
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const accountId = req.user!.accountId;
    const services: any[] = req.body;

    if (!Array.isArray(services)) return res.status(400).json({ error: 'Dados inválidos' });

    // IDs existentes que devem ser preservados
    const keepIds = services.filter(s => s.id).map(s => Number(s.id));

    // Remover serviços que não estão mais na lista (preserva IDs = histórico de agendamentos intacto)
    await prisma.service.deleteMany({
      where: {
        account_id: accountId,
        id: { notIn: keepIds.length > 0 ? keepIds : [0] }
      }
    });

    for (const [index, s] of services.entries()) {
      const data = {
        name: s.name || 'Serviço',
        description: s.description || '',
        duration_min: parseInt(s.duration) || 30,
        cleaning_buffer_min: parseInt(s.cleaning_buffer) || 0,
        price: parseFloat(s.price) || 0,
        is_active: s.is_active !== false,
        sort_order: index,
        image_url: s.imageUrl ?? s.image_url ?? null,
        image_opacity: s.imageOpacity ?? s.image_opacity ?? 100,
        name_color: s.nameColor ?? s.name_color ?? '#ffffff',
        description_color: s.descriptionColor ?? s.description_color ?? '#9ca3af'
      };

      if (s.id) {
        await prisma.service.update({ where: { id: Number(s.id) }, data });
      } else {
        await prisma.service.create({ data: { ...data, account_id: accountId } });
      }
    }

    res.json({ msg: 'Serviços atualizados' });
  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
