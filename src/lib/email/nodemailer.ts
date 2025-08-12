import nodemailer from 'nodemailer'

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
}

function createTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'

  if (!host || !user || !pass) {
    // Mode développement: console fallback
    return nodemailer.createTransport({ jsonTransport: true })
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
}

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const from = process.env.SMTP_FROM || 'NOURX <no-reply@nourx.local>'
    const transporter = createTransport()
    const info = await transporter.sendMail({ from, to, subject, html })
    return { ok: true, id: info.messageId }
  } catch (error) {
    console.error('[email] nodemailer error:', error)
    return { ok: false, error: (error as Error).message }
  }
}

export function renderSimpleTemplate(title: string, content: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,-apple-system;max-width:600px;margin:auto;padding:24px">
    <h2 style="margin:0 0 12px 0">${title}</h2>
    <div style="color:#111827">${content}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="color:#6b7280;font-size:12px">NOURX</p>
  </div>`
}


