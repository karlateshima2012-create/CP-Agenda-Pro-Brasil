import { Router } from 'express';
import { prisma } from '../server.js';

const router = Router();

router.get('/profile/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id as string);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { account: true }
    });

    if (!user?.account) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    const acc = user.account;

    // Conta inativa: retornar apenas status, sem expor dados
    if (acc.status !== 'active') {
      return res.json({
        profile: { status: acc.status, name: acc.name },
        services: [],
        availability: { workingHours: [], blockedDates: [], intervalMinutes: 30, availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12] },
        appointments: []
      });
    }

    const [services, availability, blockedDates, appointments] = await Promise.all([
      prisma.service.findMany({
        where: { account_id: acc.id, is_active: true },
        orderBy: { sort_order: 'asc' }
      }),
      prisma.availability.findFirst({ where: { account_id: acc.id } }),
      prisma.blockedDate.findMany({
        where: { account_id: acc.id },
        orderBy: { blocked_date: 'asc' }
      }),
      prisma.appointment.findMany({
        where: {
          account_id: acc.id,
          deleted_at: null,
          start_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          status: { notIn: ['canceled', 'rejected'] }
        },
        select: { start_at: true, end_datetime: true, duration: true, status: true }
      })
    ]);

    const workingHours = availability?.working_hours
      ? (typeof availability.working_hours === 'string'
          ? JSON.parse(availability.working_hours)
          : availability.working_hours)
      : [];

    const availableMonths = (availability as any)?.available_months
      ? (typeof (availability as any).available_months === 'string'
          ? JSON.parse((availability as any).available_months)
          : (availability as any).available_months)
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    res.json({
      profile: {
        id: acc.id,
        name: acc.name,
        contact_phone: acc.contact_phone,
        status: acc.status,
        plan_type: acc.plan_type,
        primary_color: acc.primary_color,
        secondary_color: acc.secondary_color,
        short_description: acc.short_description,
        services_title: acc.services_title,
        services_subtitle: acc.services_subtitle,
        cover_image: acc.cover_image,
        profile_image: acc.profile_image,
        view_mode: acc.view_mode,
        cover_opacity: acc.cover_opacity,
        lifetime_appointments: acc.lifetime_appointments,
        created_at: acc.created_at
      },
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration_min,
        cleaning_buffer: s.cleaning_buffer_min ?? 0,
        price: Number(s.price),
        image_url: s.image_url,
        image_opacity: s.image_opacity,
        name_color: s.name_color,
        description_color: s.description_color,
        imageUrl: s.image_url ?? '',
        imageOpacity: s.image_opacity ?? 100,
        nameColor: s.name_color,
        descriptionColor: s.description_color
      })),
      availability: {
        workingHours,
        blockedDates: blockedDates.map(b => ({
          id: b.id,
          date: b.blocked_date.toISOString().split('T')[0],
          startTime: b.start_time ? b.start_time.toISOString().substring(11, 16) : null,
          endTime: b.end_time ? b.end_time.toISOString().substring(11, 16) : null,
          reason: b.reason
        })),
        intervalMinutes: availability?.interval_minutes ?? 30,
        availableMonths
      },
      appointments: appointments.map(a => ({
        startAt: a.start_at.toISOString(),
        endAt: (a as any).end_datetime ? (a as any).end_datetime.toISOString() : null,
        duration: a.duration,
        status: a.status
      }))
    });
  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).json({ error: 'Erro interno ao buscar perfil' });
  }
});

export default router;
