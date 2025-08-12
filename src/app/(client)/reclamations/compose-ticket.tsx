'use client'

import { useState, FormEvent } from 'react'
import { createTicket } from '@/app/actions/tickets'

export function ComposeTicket({ clientId, projectId }: { clientId: string; projectId?: string }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOk(false)
    const res = await createTicket({ client_id: clientId, project_id: projectId, subject, message })
    setLoading(false)
    if (!res.success) setError(res.error || 'Erreur'); else setOk(true)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm mb-1">Sujet</label>
        <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm mb-1">Message</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border rounded px-3 py-2 min-h-24" required />
      </div>
      <button disabled={loading} className="inline-flex items-center rounded bg-primary px-3 py-2 text-white disabled:opacity-50">
        {loading ? 'Envoi…' : 'Créer le ticket'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Ticket créé.</p>}
    </form>
  )
}


