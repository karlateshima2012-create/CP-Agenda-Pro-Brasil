import { AvailabilityConfig, Service } from './types';

export const formatJapanPhone = (value: string | undefined | null) => {
  if (!value || typeof value !== 'string') return '';
  const nums = value.replace(/\D/g, '');
  if (!nums) return '';
  if (nums.startsWith('0')) {
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)} ${nums.slice(3)}`;
    return `${nums.slice(0, 3)} ${nums.slice(3, 7)} ${nums.slice(7, 11)}`;
  } else {
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 2)} ${nums.slice(2)}`;
    return `${nums.slice(0, 2)} ${nums.slice(2, 6)} ${nums.slice(6, 10)}`;
  }
};

export const normalizeForWhatsApp = (phone: string | undefined | null) => {
  if (!phone || typeof phone !== 'string') return '';
  let nums = phone.replace(/\D/g, '');
  if (!nums) return '';
  if (nums.startsWith('0')) nums = nums.substring(1);
  if (!nums.startsWith('81')) nums = '81' + nums;
  return nums;
};

export const DEFAULT_SERVICES: Service[] = [
  { id: 1, name: "Corte Masculino", description: "Corte moderno.", duration: 45, price: 3000 },
];

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  blockedDates: [],
  intervalMinutes: 30,
  availableMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  workingHours: [
    { day: 'segunda', name: 'Segunda-feira', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'terca', name: 'Terça-feira', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'quarta', name: 'Quarta-feira', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'quinta', name: 'Quinta-feira', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'sexta', name: 'Sexta-feira', isWorking: true, startTime: '09:00', endTime: '18:00' },
    { day: 'sabado', name: 'Sábado', isWorking: false, startTime: '09:00', endTime: '13:00' },
    { day: 'domingo', name: 'Domingo', isWorking: false, startTime: '09:00', endTime: '13:00' }
  ]
};

export const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

export const generateWhatsAppLink = (appointment: any, action: string) => {
  if (!appointment || !appointment.clientPhone) return '#';
  const phone = normalizeForWhatsApp(appointment.clientPhone);
  const date = new Date(appointment.startAt).toLocaleDateString('pt-BR', { timeZone: 'Asia/Tokyo' });
  const time = new Date(appointment.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
  
  let message = "";
  if (action === 'confirmed') message = `✅ Olá ${appointment.clientName}! Seu horário para *${appointment.serviceName}* foi *CONFIRMADO* para dia *${date}* às *${time}*.`;
  else if (action === 'rejected') message = `❌ Olá ${appointment.clientName}. Não poderemos atender dia *${date}* às *${time}*.`;
  
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};