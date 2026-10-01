import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv } from '../env.js';

/**
 * Email yuborish (Gmail SMTP: smtp.gmail.com:465, TLS).
 * Transport instansiya xotirasida saqlanadi — serverless "warm" chaqiruvlarda qayta ishlatiladi.
 */
let transport: { key: string; value: Transporter } | null = null;

function getTransport(): Transporter {
  const { mail } = getEnv();
  const key = `${mail.host}:${mail.port}:${mail.secure}:${mail.user}`;
  if (!transport || transport.key !== key) {
    transport = {
      key,
      value: nodemailer.createTransport({
        host: mail.host,
        port: mail.port,
        secure: mail.secure,
        auth: { user: mail.user, pass: mail.pass },
        // Vercel funksiyasi maxDuration ichida tugashi uchun qisqa kutish vaqtlari
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 10_000,
      }),
    };
  }
  return transport.value;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const { mail } = getEnv();
  if (!mail.live || !mail.user) throw new Error('Email sozlanmagan (GMAIL_USER / GMAIL_APP_PASSWORD)');
  await getTransport().sendMail({
    from: { name: mail.fromName, address: mail.user },
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
