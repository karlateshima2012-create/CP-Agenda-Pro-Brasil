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
      where: { accountId },
      orderBy: { id: 'asc' }
    });

    // Buscar Disponibilidade
    const availability = await prisma.availability.findUnique({
      where: { accountId }
    });

    // Buscar Bloqueios
    const blockedDates = await prisma.blockedDate.findMany({
      where: { accountId }
    });

    // Mesclar bloqueios na availability
    const availData = availability ? {
      ...availability,
      workingHours: typeof availability.workingHours === 'string' ? JSON.parse(availability.workingHours) : availability.workingHours,
      blockedDates: blockedDates
    } : null;

    // Buscar Agendamentos Ocupados (apenas do dia atual em diante)
    const now = new Date();
    // Subtrair um dia para garantir fuso
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const appointments = await prisma.appointment.findMany({
      where: {
        accountId,
        startAt: { gte: yesterday },
        status: { notIn: ['canceled', 'rejected'] }
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        duration: true,
        status: true,
        serviceIds: true
      }
    });

    // Formatar a resposta no padrão exato que o Frontend React/Vite espera
    res.json({
      profile: {
        id: user.account.id,
        name: user.account.name,
        contact_phone: user.account.contactPhone,
        status: user.account.status,
        plan_type: user.account.planType,
        plan_expires_at: user.account.planExpiresAt,
        primary_color: user.account.primaryColor,
        secondary_color: user.account.secondaryColor,
        short_description: user.account.shortDescription,
        services_title: user.account.servicesTitle,
        services_subtitle: user.account.servicesSubtitle,
        cover_image: user.account.coverImage,
        profile_image: user.account.profileImage,
        view_mode: user.account.viewMode,
        cover_opacity: user.account.coverOpacity,
        lifetime_appointments: user.account.lifetimeAppointments,
        created_at: user.account.createdAt
      },
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
        image_url: s.imageUrl
      })),
      availability: availData,
      appointments: appointments.map(a => ({
        id: a.id,
        start_at: a.startAt.toISOString(),
        end_at: a.endAt ? a.endAt.toISOString() : null,
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
