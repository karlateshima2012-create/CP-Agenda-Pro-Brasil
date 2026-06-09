import https from 'https';

export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 5000
    };

    const req = https.request(options, () => resolve());
    req.on('error', () => resolve()); // Nunca deixar notificação quebrar o fluxo principal
    req.on('timeout', () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

export function buildAppointmentMessage(
  clientName: string,
  clientPhone: string,
  serviceName: string,
  startAt: Date
): string {
  const date = startAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = startAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  return `<b>🔔 Novo Agendamento!</b>\n\n` +
    `👤 <b>Cliente:</b> ${clientName}\n` +
    `📞 <b>Telefone:</b> ${clientPhone}\n` +
    `✂️ <b>Serviço:</b> ${serviceName}\n` +
    `📅 <b>Data:</b> ${date} às ${time}`;
}
