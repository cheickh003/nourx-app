'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTicketMessagesRealtime } from '@/hooks/useRealtime'
import { replyTicket } from '@/app/actions/tickets'

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useTicketMessagesRealtime(ticketId, () => router.refresh())

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    const res = await replyTicket(ticketId, body, 'public')
    setLoading(false)
    if (!res.success) setErr(res.error || 'Erreur'); else setBody('')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Votre réponse</label>
        <textarea className="w-full border rounded px-3 py-2 min-h-24" value={body} onChange={e => setBody(e.target.value)} required />
      </div>
      <button disabled={loading} className="inline-flex items-center rounded bg-primary px-3 py-2 text-white disabled:opacity-50">{loading ? 'Envoi…' : 'Envoyer'}</button>
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  )
}


