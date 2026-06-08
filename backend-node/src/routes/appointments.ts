import { Router } from 'express';
import { prisma } from '../server.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Criar novo agendamento público (sem auth)
router.post('/public', async (req, res) => {
  try {
    const { 
      accountId, serviceIds, date, time, 
      clientName, clientEmail, clientPhone, clientInstagram, 
      totalDuration, totalPrice 
    } = req.body;

    // Criar/buscar cliente
    let client = await prisma.client.findFirst({
      where: { accountId, phone: clientPhone }
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          accountId,
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          instagram: clientInstagram
        }
      });
    }

    // Calcular datas
    const startAt = new Date(`${date}T${time}:00-03:00`);
    const endAt = new Date(startAt.getTime() + totalDuration * 60000);

    // Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        accountId,
        clientId: client.id,
        serviceIds: JSON.stringify(serviceIds),
        startAt,
        endAt,
        duration: totalDuration,
        totalPrice,
        status: 'pending'
      }
    });

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// Listar agendamentos do admin (requer auth)
router.get('/', requireAuth, async (req, res) => {
  try {
    const accountId = req.user?.accountId;
    const appointments = await prisma.appointment.findMany({
      where: { accountId },
      include: { client: true },
      orderBy: { startAt: 'desc' }
    });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

export default router;
