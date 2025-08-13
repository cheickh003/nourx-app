import nodemailer from 'nodemailer'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

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
    console.warn('[email] SMTP non configuré — bascule en jsonTransport (aucun email réel ne sera envoyé)')
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
    const configuredFrom = process.env.SMTP_FROM || process.env.SMTP_USER || ''
    const from = /<.+?>/.test(configuredFrom)
      ? configuredFrom
      : configuredFrom
        ? `NOURX <${configuredFrom}>`
        : 'NOURX <no-reply@nourx.local>'
    const transporter = createTransport()
    const toList = Array.isArray(to) ? to : [to]
    const envelopeFrom = (from.match(/<(.+?)>/)?.[1] || configuredFrom || 'no-reply@nourx.local')
    // Joindre le logo en inline (cid) si disponible
    const attachments: Array<{ filename: string; content: Buffer; cid: string }> = []
    try {
      const logoPath = path.join(process.cwd(), 'public', 'CNourx.png')
      const logo = await readFile(logoPath)
      attachments.push({ filename: 'CNourx.png', content: logo, cid: 'nourx-logo' })
    } catch {
      // pas de logo en local (environnements serverless) → l'image peut ne pas s'afficher si src=cid
      // le template reste minimal même sans logo
    }

    const info = await transporter.sendMail({ from, to: toList, subject, html, envelope: { from: envelopeFrom, to: toList }, attachments })
    // Log minimal en prod et aperçu complet en mode jsonTransport
    const infoAny = info as unknown as { messageId?: string; message?: string }
    if (typeof infoAny?.message === 'string') {
      console.log('[email] Aperçu (jsonTransport):', infoAny.message)
    } else {
      console.log('[email] envoyé:', { to: toList, subject, id: infoAny?.messageId })
    }
    return { ok: true, id: infoAny?.messageId }
  } catch (error) {
    console.error('[email] nodemailer error:', error)
    return { ok: false, error: (error as Error).message }
  }
}

export function renderSimpleTemplate(
  title: string,
  content: string,
  options?: { preheader?: string; footer?: string }
) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || 'http://localhost:3000'
  const logoSrc = 'cid:nourx-logo'
  const preheader = options?.preheader || ''
  const footer = options?.footer || '© NOURX. Tous droits réservés.'

  // Layout e-mail minimaliste, compatible clients majeurs (Gmail/Outlook/Apple Mail)
  return `
  <div style="background-color:#f5f7fb;padding:24px 0;">
    <!-- Preheader (masqué) -->
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${preheader}</div>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:640px;background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.04);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial;">
      <tr>
        <td style="padding:28px 28px 16px 28px;border-bottom:1px solid #eef1f5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td align="left">
                <img src="${logoSrc}" alt="NOURX" width="120" style="display:block;height:auto;border:0;outline:none;text-decoration:none;filter:brightness(0);" />
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 0 28px;">
          <h1 style="margin:0 0 8px 0;font-size:20px;line-height:28px;color:#0f172a;font-weight:600;">${title}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 28px 28px 28px;color:#334155;font-size:14px;line-height:22px;">
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:18px 28px 24px 28px;border-top:1px solid #eef1f5;color:#64748b;font-size:12px;line-height:18px;">
          ${footer}
        </td>
      </tr>
    </table>

    <div style="text-align:center;color:#94a3b8;font-size:11px;line-height:16px;margin-top:12px;">
      Si vous n’êtes pas à l’origine de cet e-mail, vous pouvez l’ignorer.
    </div>
  </div>`
}


