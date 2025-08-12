'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { renderSimpleTemplate, sendEmail } from '@/lib/email/nodemailer'

export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'

export interface CreateTicketData {
  client_id: string
  project_id?: string
  category_id?: string
  priority_id?: string
  subject: string
  message?: string
}

export async function createTicket(data: CreateTicketData) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { success: false, error: 'Non authentifié' }

  // Calcul SLA basique à l'insert (optionnel: via trigger SQL)
  let firstDue: string | null = null
  let resolveDue: string | null = null

  if (data.priority_id) {
    const { data: prio } = await supabase
      .from('ticket_priorities')
      .select('response_sla_minutes, resolve_sla_minutes')
      .eq('id', data.priority_id)
      .maybeSingle()

    if (prio) {
      const now = new Date()
      firstDue = new Date(now.getTime() + prio.response_sla_minutes * 60_000).toISOString()
      resolveDue = new Date(now.getTime() + prio.resolve_sla_minutes * 60_000).toISOString()
    }
  }

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      client_id: data.client_id,
      project_id: data.project_id ?? null,
      category_id: data.category_id ?? null,
      priority_id: data.priority_id ?? null,
      subject: data.subject,
      first_response_due_at: firstDue,
      resolve_due_at: resolveDue,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error || !ticket) {
    console.error('createTicket error', error)
    return { success: false, error: 'Erreur lors de la création du ticket' }
  }

  if (data.message && data.message.trim().length > 0) {
    await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        author_id: auth.user.id,
        body: data.message.trim(),
        visibility: 'public',
      })
  }

  // Email: accusé de réception client + alerte admin (MVP)
  try {
    // Récupérer email du client principal si disponible
    const { data: client } = await supabase
      .from('clients')
      .select('contact_email')
      .eq('id', data.client_id)
      .single()

    const subject = `[NOURX] Ticket créé: ${ticket.subject}`
    const html = renderSimpleTemplate('Ticket créé', `Votre ticket a été créé.<br/>Sujet: <b>${ticket.subject}</b>.<br/>Réf: ${ticket.id}`)
    const to = client?.contact_email || 'no-reply@nourx.local'
    await sendEmail({ to, subject, html })
  } catch (err) {
    console.warn('email ticket.created non bloquant', err)
  }

  revalidatePath('/reclamations')
  revalidatePath('/admin/reclamations')
  return { success: true, data: ticket }
}

export async function replyTicket(ticketId: string, body: string, visibility: 'public' | 'internal' = 'public') {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { success: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, author_id: auth.user.id, body, visibility })

  if (error) {
    console.error('replyTicket error', error)
    return { success: false, error: 'Erreur lors de l\'envoi du message' }
  }

  // Notification e-mail simple si public
  if (visibility === 'public') {
    try {
      // Récupérer ticket + client email
      const { data: t } = await supabase
        .from('tickets')
        .select('subject, client_id')
        .eq('id', ticketId)
        .single()

      if (t) {
        const { data: client } = await supabase
          .from('clients')
          .select('contact_email')
          .eq('id', t.client_id)
          .single()

        const to = client?.contact_email || ''
        if (to) {
          const subject = `[NOURX] Nouveau message sur votre ticket: ${t.subject}`
          const html = renderSimpleTemplate('Nouveau message', body.replace(/\n/g, '<br/>'))
          const res = await sendEmail({ to, subject, html })
          if (res.ok) {
            await supabase.from('email_events').insert({ ticket_id: ticketId, event_type: 'ticket.message.created', recipient: to, status: 'sent', provider_id: res.id ?? null, payload_excerpt: body.slice(0, 200) })
          } else {
            await supabase.from('email_events').insert({ ticket_id: ticketId, event_type: 'ticket.message.created', recipient: to, status: 'failed', payload_excerpt: res.error?.slice(0, 200) })
          }
        }
      }
    } catch (err) {
      console.warn('email ticket.message.created non bloquant', err)
    }
  }

  revalidatePath(`/reclamations`)
  revalidatePath(`/admin/reclamations`)
  return { success: true }
}

export async function changeTicketStatus(ticketId: string, status: TicketStatus) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { success: false, error: 'Non authentifié' }

  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId)

  if (error) {
    console.error('changeTicketStatus error', error)
    return { success: false, error: 'Erreur lors du changement de statut' }
  }

  // Email template changement de statut (client)
  try {
    const { data: t } = await supabase
      .from('tickets')
      .select('subject, client_id')
      .eq('id', ticketId)
      .single()
    if (t) {
      const { data: client } = await supabase
        .from('clients')
        .select('contact_email')
        .eq('id', t.client_id)
        .single()
      const to = client?.contact_email || ''
      if (to) {
        const subject = `[NOURX] Statut mis à jour: ${t.subject}`
        const html = renderSimpleTemplate('Changement de statut', `Le ticket <b>${t.subject}</b> est maintenant: <b>${status}</b>.`)
        const res = await sendEmail({ to, subject, html })
        await supabase.from('email_events').insert({ ticket_id: ticketId, event_type: 'ticket.status.changed', recipient: to, status: res.ok ? 'sent' : 'failed', provider_id: res.id ?? null, payload_excerpt: status })
      }
    }
  } catch (err) {
    console.warn('email ticket.status.changed non bloquant', err)
  }

  revalidatePath(`/reclamations`)
  revalidatePath(`/admin/reclamations`)
  return { success: true }
}

export async function listTicketsForCurrentUser() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { success: false, error: 'Non authentifié' }

  const { data: rows, error } = await supabase
    .from('tickets')
    .select(`
      *,
      category:ticket_categories(label),
      priority:ticket_priorities(code)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listTickets error', error)
    return { success: false, error: 'Erreur lors de la récupération des tickets' }
  }
  return { success: true, data: rows ?? [] }
}

export async function getTicketWithMessages(ticketId: string) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return { success: false, error: 'Non authentifié' }

  const { data: ticket, error: tErr } = await supabase
    .from('tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (tErr || !ticket) {
    return { success: false, error: 'Ticket introuvable' }
  }

  const { data: messages, error: mErr } = await supabase
    .from('ticket_messages')
    .select('*, author:profiles(user_id, full_name, role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (mErr) {
    console.error('getTicketWithMessages messages error', mErr)
    return { success: false, error: 'Erreur lors du chargement des messages' }
  }

  return { success: true, data: { ticket, messages: messages ?? [] } }
}


