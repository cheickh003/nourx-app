import { createClient } from '@/lib/supabase/server'
import { getTicketWithMessages } from '@/app/actions/tickets'
import { TicketAttachments } from '@/components/tickets/attachments'
import { ReplyForms, StatusChanger } from './client'

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const res = await getTicketWithMessages(id)
  if (!res.success || !res.data) return <div className="p-6">Ticket introuvable</div>

  const { ticket, messages } = res.data
  const { data: attachments } = await supabase
    .from('ticket_attachments')
    .select('id, label, mime_type, size_bytes, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: false })
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">Statut: <span className="capitalize">{ticket.status}</span></p>
        </div>
        <StatusChanger ticketId={ticket.id} current={ticket.status} />
      </div>

      <div className="rounded-lg border bg-card">
        <ul className="divide-y">
          {messages.map((m: {
            id: string;
            created_at: string;
            body: string;
            visibility: 'public' | 'internal';
            author?: { full_name?: string | null; user_id?: string } | null;
          }) => (
            <li key={m.id} className="p-4">
              <div className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleString()} · {m.author?.full_name || m.author?.user_id} · <span className="uppercase text-xs">{m.visibility}</span></div>
              <div className="mt-1 whitespace-pre-wrap">{m.body}</div>
            </li>
          ))}
          {messages.length === 0 && <li className="p-6 text-center text-muted-foreground">Aucun message</li>}
        </ul>
      </div>

      <TicketAttachments ticketId={ticket.id} items={attachments || []} />

      <ReplyForms ticketId={ticket.id} />
    </div>
  )
}
