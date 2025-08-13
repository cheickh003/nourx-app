import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, renderSimpleTemplate } from '@/lib/email/nodemailer'

interface TicketLite { id: string; subject: string; client_id: string }

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-cron-secret')
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json().catch(() => ({})) as { dueSoon?: TicketLite[]; overdue?: TicketLite[] }
    const dueSoon = Array.isArray(payload?.dueSoon) ? payload.dueSoon : []
    const overdue = Array.isArray(payload?.overdue) ? payload.overdue : []

    const admin = createAdminClient()

    async function processBatch(tickets: TicketLite[], type: 'pre' | 'over') {
      for (const t of tickets) {
        const { data: client } = await admin
          .from('clients')
          .select('contact_email')
          .eq('id', t.client_id)
          .single()
        const to = client?.contact_email
        if (!to) continue

        const subject = type === 'pre'
          ? `[NOURX] Rappel SLA: première réponse imminente`
          : `[NOURX] SLA dépassé: première réponse en retard`
    const html = renderSimpleTemplate(
      'Rappel SLA',
      `Ticket: <b>${t.subject}</b><br/>Type: ${type === 'pre' ? 'Pré-échéance' : 'Dépassement'}`,
      { preheader: 'Rappel automatique SLA' }
    )

        const res = await sendEmail({ to, subject, html })
        await admin.from('email_events').insert({
          ticket_id: t.id,
          event_type: 'sla.reminder',
          recipient: to,
          status: res.ok ? 'sent' : 'failed',
          provider_id: res.id ?? null,
          payload_excerpt: type,
        })
      }
    }

    await processBatch(dueSoon, 'pre')
    await processBatch(overdue, 'over')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('sla notify error', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


