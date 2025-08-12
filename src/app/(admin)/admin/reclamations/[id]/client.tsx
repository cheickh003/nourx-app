'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTicketMessagesRealtime } from '@/hooks/useRealtime'
import { replyTicket, changeTicketStatus, TicketStatus } from '@/app/actions/tickets'

export function ReplyForms({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [bodyPublic, setBodyPublic] = useState('')
  const [bodyInternal, setBodyInternal] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useTicketMessagesRealtime(ticketId, () => router.refresh())

  async function send(visibility: 'public' | 'internal', body: string) {
    setLoading(true)
    setErr(null)
    const res = await replyTicket(ticketId, body, visibility)
    setLoading(false)
    if (!res.success) setErr(res.error || 'Erreur')
    else {
      if (visibility === 'public') setBodyPublic('')
      else setBodyInternal('')
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form onSubmit={e => { e.preventDefault(); void send('public', bodyPublic) }} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Réponse publique</label>
          <textarea className="w-full border rounded px-3 py-2 min-h-24" value={bodyPublic} onChange={e => setBodyPublic(e.target.value)} required />
        </div>
        <button disabled={loading} className="inline-flex items-center rounded bg-primary px-3 py-2 text-white disabled:opacity-50">Envoyer</button>
      </form>

      <form onSubmit={e => { e.preventDefault(); void send('internal', bodyInternal) }} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Note interne</label>
          <textarea className="w-full border rounded px-3 py-2 min-h-24" value={bodyInternal} onChange={e => setBodyInternal(e.target.value)} required />
        </div>
        <button disabled={loading} className="inline-flex items-center rounded bg-secondary px-3 py-2 disabled:opacity-50">Ajouter</button>
      </form>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  )
}

export function StatusChanger({ ticketId, current }: { ticketId: string; current: string }) {
  const router = useRouter()
  const [value, setValue] = useState<TicketStatus>(current as TicketStatus)
  const [busy, setBusy] = useState(false)

  const statuses: TicketStatus[] = ['open','in_progress','waiting_customer','resolved','closed']

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value as TicketStatus
    setValue(v)
    setBusy(true)
    const res = await changeTicketStatus(ticketId, v)
    setBusy(false)
    if (res.success) router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm">Statut</label>
      <select className="border rounded px-2 py-1 capitalize" value={value} onChange={onChange} disabled={busy}>
        {statuses.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
      </select>
    </div>
  )
}


