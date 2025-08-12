"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface TicketAttachmentItem {
  id: string
  label: string | null
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export function TicketAttachments({ ticketId, items }: { ticketId: string; items: TicketAttachmentItem[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('ticket_id', ticketId)
      form.append('label', file.name)
      const res = await fetch('/api/tickets/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Upload échoué')
      }
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
      if (e.target) e.target.value = ''
    }
  }

  async function onDownload(attachmentId: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/download/${attachmentId}`)
      const j = await res.json()
      if (!res.ok || !j?.data?.download_url) throw new Error(j?.error || 'Lien introuvable')
      window.open(j.data.download_url, '_blank')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Pièces jointes</h3>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <span className="px-3 py-1 rounded bg-secondary">{loading ? 'Envoi…' : 'Ajouter un fichier'}</span>
          <input type="file" className="hidden" disabled={loading} onChange={onUpload} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="divide-y rounded border bg-card">
        {items.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Aucune pièce jointe</li>
        )}
        {items.map((it) => (
          <li key={it.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm">{it.label || 'Fichier'}</div>
              <div className="text-xs text-muted-foreground">
                {it.mime_type || 'application/octet-stream'} · {it.size_bytes ? `${Math.round((it.size_bytes as number) / 1024)} Ko` : '—'} · {new Date(it.created_at).toLocaleString()}
              </div>
            </div>
            <button onClick={() => onDownload(it.id)} className="text-sm px-2 py-1 rounded bg-primary text-white">
              Télécharger
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}


