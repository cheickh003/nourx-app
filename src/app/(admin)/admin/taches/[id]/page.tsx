import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTaskById } from '@/app/actions/tasks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays, User, ListChecks, Pencil, Trash2, Send } from 'lucide-react'

export default async function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const res = await getTaskById(id)
  if (!res.success || !res.data) return notFound()
  const task = res.data
  // Charger commentaires avec auteur
  const { data: comments } = await supabase
    .from('task_comments')
    .select('id, body, author:profiles(user_id, full_name, role), created_at')
    .eq('task_id', id)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/taches">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{task.title}</h1>
          {task.description && (
            <p className="text-muted-foreground">{task.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={
                task.status === 'done' ? 'default' :
                task.status === 'doing' ? 'secondary' :
                task.status === 'blocked' ? 'destructive' : 'outline'
              }>
                {task.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Priorité</span>
              <Badge variant={
                task.priority === 'urgent' ? 'destructive' :
                task.priority === 'high' ? 'secondary' : 'outline'
              }>
                {task.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Créée le {new Date(task.created_at).toLocaleString('fr-FR')}</span>
            </div>
            {task.assignee && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Assignée à {task.assignee.full_name || task.assignee.user_id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Checklist</CardTitle>
            <form action={async (formData) => {
              'use server'
              const { createChecklistItem } = await import('@/app/actions/task-checklist-items')
              const label = String(formData.get('label') || '')
              if (!label) return
              await createChecklistItem({ task_id: id, label })
            }} className="flex items-center gap-2">
              <input name="label" placeholder="Nouvel élément" className="border px-2 py-1 rounded text-sm" />
              <Button size="sm" type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          </CardHeader>
          <CardContent>
            {task.checklist_items && task.checklist_items.length > 0 ? (
              <ul className="space-y-2">
                {task.checklist_items.map(item => (
                  <li key={item.id} className="flex items-center justify-between gap-3 border rounded px-3 py-2">
                    <span className={item.is_done ? 'line-through text-muted-foreground' : ''}>{item.label}</span>
                    <div className="flex items-center gap-2">
                      <form action={async () => {
                        'use server'
                        const { updateChecklistItem } = await import('@/app/actions/task-checklist-items')
                        await updateChecklistItem(item.id, { is_done: !item.is_done })
                      }}>
                        <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
                      </form>
                      <form action={async () => {
                        'use server'
                        const { deleteChecklistItem } = await import('@/app/actions/task-checklist-items')
                        await deleteChecklistItem(item.id)
                      }}>
                        <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">Aucun élément de checklist.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Commentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={async (formData) => {
            'use server'
            const { createTaskComment } = await import('@/app/actions/task-comments')
            const body = String(formData.get('body') || '')
            if (!body) return
            await createTaskComment({ task_id: id, body })
          }} className="flex items-center gap-2">
            <textarea name="body" className="w-full border rounded p-2 text-sm" placeholder="Ajouter un commentaire..." />
            <Button type="submit" size="sm"><Send className="h-4 w-4" /></Button>
          </form>

          <ul className="space-y-3">
            {(comments || []).map((c: { id: string; body: string; created_at: string; author?: { user_id?: string; full_name?: string | null; role?: string } | { user_id?: string; full_name?: string | null; role?: string }[] }) => (
              <li key={c.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const author = Array.isArray(c.author) ? c.author[0] : c.author
                      const name = author?.full_name || author?.user_id
                      const role = author?.role
                      return `${new Date(c.created_at as string).toLocaleString('fr-FR')} · ${name ?? ''} · ${role ?? ''}`
                    })()}
                  </div>
                  <form action={async () => {
                    'use server'
                    const { deleteTaskComment } = await import('@/app/actions/task-comments')
                    await deleteTaskComment(c.id as unknown as string)
                  }}>
                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                  </form>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm">{String(c.body ?? '')}</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}


