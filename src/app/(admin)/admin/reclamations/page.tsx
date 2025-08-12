import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminReclamationsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('tickets')
    .select('*, priority:ticket_priorities(code), category:ticket_categories(label)')
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion des Réclamations</h1>
        <p className="text-muted-foreground">Administration de toutes les réclamations.</p>
      </div>

      <div className="rounded-lg border bg-card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Sujet</th>
              <th className="text-left p-3">Client</th>
              <th className="text-left p-3">Catégorie</th>
              <th className="text-left p-3">Priorité</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {rows && rows.length > 0 ? (
              rows.map((t: {
                id: string;
                subject: string;
                client_id: string;
                status: string;
                created_at: string;
                priority?: { code?: string } | null;
                category?: { label?: string } | null;
              }) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/admin/reclamations/${t.id}`} className="hover:underline">
                      {t.subject}
                    </Link>
                  </td>
                  <td className="p-3">{t.client_id.slice(0, 8)}…</td>
                  <td className="p-3">{t.category?.label ?? '-'}</td>
                  <td className="p-3 capitalize">{t.priority?.code ?? 'normal'}</td>
                  <td className="p-3 capitalize">{t.status}</td>
                  <td className="p-3">{new Date(t.created_at).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Aucun ticket.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
