import { Router } from 'express';
import { prisma } from '../server.js';

const router = Router();

// Rota vital que alimenta a tela de agendamento público do cliente
router.get('/profile/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Buscar o User e a Account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true }
    });

    if (!user || !user.account) {
      return res.status(404).json({ error: 'Perfil público não encontrado' });
    }

    const accountId = user.account.id;

    // Buscar Serviços
    const services = await prisma.service.findMany({
      where: { account_id: accountId },
      orderBy: { id: 'asc' }
    });

    // Buscar Disponibilidade
    const availability = await prisma.availability.findFirst({
      where: { account_id: accountId }
    });

    // Buscar Bloqueios
    const blockedDates = await prisma.blockedDate.findMany({
      where: { account_id: accountId }
    });

    // Mesclar bloqueios na availability
    const availData = availability ? {
      ...availability,
      workingHours: typeof availability.working_hours === 'string' ? JSON.parse(availability.working_hours) : availability.working_hours,
      blockedDates: blockedDates
    } : null;

    // Buscar Agendamentos Ocupados (apenas do dia atual em diante)
    const now = new Date();
    // Subtrair um dia para garantir fuso
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const appointments = await prisma.appointment.findMany({
      where: {
        account_id: accountId,
        start_at: { gte: yesterday },
        status: { notIn: ['canceled', 'rejected'] }
      },
      select: {
        id: true,
        start_at: true,
        duration: true,
        status: true,
        service_id: true
      }
    });

    // Formatar a resposta no padrão exato que o Frontend React/Vite espera
    res.json({
      profile: {
        id: user.account.id,
        name: user.account.name,
        contact_phone: user.account.owner_name,
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
        lifetime_appointments: user.account.lifetime_appointments,
        created_at: user.account.created_at
      },
      services: services.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration_min,
        price: s.price,
        image_url: s.image_url
      })),
      availability: availData,
      appointments: appointments.map((a: any) => ({
        id: a.id,
        start_at: a.start_at.toISOString(),
        duration: a.duration,
        status: a.status
      }))
    });

  } catch (error) {
    console.error('Error fetching public profile:', error);
    res.status(500).json({ error: 'Erro interno ao buscar perfil' });
  }
});

export default router;
