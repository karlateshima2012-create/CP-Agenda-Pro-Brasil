import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465');
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASSWORD || '';

  if (!user || !pass) {
    throw new Error('SMTP_USER e SMTP_PASSWORD não configurados no .env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    const transporter = createTransport();
    const from = `${process.env.SMTP_FROM_NAME || 'CP Agenda Pro'} <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

    await transporter.sendMail({ from, to, subject, html, text: html.replace(/<[^>]+>/g, '') });
  } catch (err) {
    console.error('[Mail] Erro ao enviar e-mail:', err);
  }
}

export function buildWelcomeEmail(ownerName: string, email: string, password: string, loginUrl: string): string {
  return `
<div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 15px; overflow: hidden;">
  <div style="background: #25aae1; padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo ao CP Agenda Pro!</h1>
  </div>
  <div style="padding: 30px;">
    <p>Olá, <strong>${ownerName}</strong>,</p>
    <p>Sua plataforma de agendamentos foi configurada com sucesso. Agora você já pode organizar seus horários e serviços de forma profissional.</p>
    <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 15px 0; font-weight: bold; color: #1e293b;">Suas Credenciais de Acesso:</p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>E-mail:</strong> <span style="color: #25aae1;">${email}</span></p>
      <p style="margin: 8px 0; font-size: 14px;"><strong>Senha Temporária:</strong> <span style="color: #25aae1;">${password}</span></p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background: #25aae1; color: white; padding: 15px 35px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">ACESSAR MEU PAINEL</a>
    </div>
    <p style="font-size: 13px; color: #64748b;"><strong>Importante:</strong> Por segurança, o sistema solicitará a alteração desta senha no seu primeiro acesso.</p>
  </div>
  <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
    © ${new Date().getFullYear()} CP Agenda Pro. Todos os direitos reservados.
  </div>
</div>`;
}

export function buildResetEmail(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
    <div style="background:#fff; padding: 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
      <h1 style="color: #333; margin: 0; font-size: 24px;">Recuperação de Senha</h1>
    </div>
    <div style="padding: 40px 30px; color: #333; line-height: 1.6;">
      <p style="font-size: 18px; margin-top: 0;">Olá,</p>
      <p>Você solicitou a redefinição de senha para sua conta no <strong>CP Agenda Pro</strong>.</p>
      <p>Para criar uma nova senha, clique no botão abaixo:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="display: inline-block; background-color: #25aae1; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Minha Senha</a>
      </div>
      <p style="margin-bottom: 5px;">Ou copie e cole este link no navegador:</p>
      <span style="color: #25aae1; word-break: break-all; font-size: 13px;">${resetLink}</span>
      <br><br>
      <p style="color: #666; font-size: 14px;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #888;">
      © ${new Date().getFullYear()} CP Agenda Pro. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`;
}
