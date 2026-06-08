import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth, AuthRequest } from '../middlewares/auth.js';

const router = Router();

// Listar todos os serviços da conta
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const services = await prisma.service.findMany({
      where: { account_id: req.user?.accountId },
      orderBy: { sort_order: 'asc' }
    });

    res.json(services.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration: s.duration_min, // O frontend espera `duration`
      price: Number(s.price),
      is_active: s.is_active,
      sort_order: s.sort_order,
      image_url: s.image_url,
      image_opacity: s.image_opacity,
      name_color: s.name_color,
      description_color: s.description_color
    })));

  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Atualizar a lista completa de serviços (Salvar tudo)
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const services = req.body;
    const accountId = req.user?.accountId;

    if (!accountId) return res.status(401).json({ error: 'Não autorizado' });

    // Para simplificar: deletamos todos e recriamos (ou fazemos upsert)
    // Upsert manual:
    const existingIds = services.filter((s: any) => s.id).map((s: any) => s.id);
    
    // Deletar os que não estão na lista
    await prisma.service.deleteMany({
      where: {
        account_id: accountId,
        id: { notIn: existingIds.length > 0 ? existingIds : [0] }
      }
    });

    // Criar ou atualizar
    for (const [index, s] of services.entries()) {
      const data = {
        name: s.name,
        description: s.description || '',
        duration_min: parseInt(s.duration) || 30,
        price: parseFloat(s.price) || 0,
        is_active: s.is_active !== undefined ? s.is_active : true,
        sort_order: index,
        image_url: s.image_url || '',
        image_opacity: s.image_opacity || 100,
        name_color: s.name_color || '#ffffff',
        description_color: s.description_color || '#9ca3af'
      };

      if (s.id) {
        await prisma.service.update({
          where: { id: s.id },
          data
        });
      } else {
        await prisma.service.create({
          data: {
            ...data,
            account_id: accountId
          }
        });
      }
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

export default router;
