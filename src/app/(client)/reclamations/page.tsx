import { listTicketsForCurrentUser } from '@/app/actions/tickets'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ComposeTicket } from './compose-ticket'

export default async function ReclamationsPage() {
  const res = await listTicketsForCurrentUser()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // Chercher le premier client_id lié à l'utilisateur (pour MVP)
  const { data: membership } = await supabase
    .from('client_members')
    .select('client_id')
    .eq('user_id', user?.id || '')
    .maybeSingle()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Réclamations</h1>
        <p className="text-muted-foreground">Gestion de vos tickets et réclamations.</p>
      </div>

      {membership?.client_id && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-medium mb-2">Nouveau ticket</h2>
          <ComposeTicket clientId={membership.client_id} />
        </div>
      )}

      <div className="rounded-lg border bg-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Sujet</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Priorité</th>
              <th className="text-left p-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {res.success && res.data && res.data.length > 0 ? (
              res.data.map((t: {
                id: string;
                subject: string;
                status: string;
                created_at: string;
                priority?: { code?: string } | null;
              }) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/reclamations/${t.id}`} className="hover:underline">
                      {t.subject}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded bg-secondary px-2 py-1 text-xs capitalize">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 capitalize">{t.priority?.code ?? 'normal'}</td>
                  <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Aucune réclamation pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
