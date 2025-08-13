import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CalendarDays, Blocks, Pencil, Send } from 'lucide-react'

export default async function AdminMilestoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: milestone, error } = await supabase
    .from('milestones')
    .select('*, projects ( name )')
    .eq('id', id)
    .maybeSingle()

  if (error || !milestone) return notFound()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/feuille-de-route">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{milestone.title}</h1>
          {milestone.description && (
            <p className="text-muted-foreground">{milestone.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Détails</CardTitle>
            <form action={async (formData) => {
              'use server'
              const { updateMilestone } = await import('@/app/actions/milestones')
              const title = String(formData.get('title') || '')
              const description = String(formData.get('description') || '')
              await updateMilestone(id, { title: title || undefined, description: description || undefined })
            }} className="flex items-center gap-2">
              <input name="title" defaultValue={milestone.title || ''} className="border px-2 py-1 rounded text-sm" />
              <input name="description" defaultValue={milestone.description || ''} className="border px-2 py-1 rounded text-sm w-56" />
              <Button size="sm" type="submit"><Pencil className="h-4 w-4" /></Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={
                milestone.status === 'done' ? 'default' :
                milestone.status === 'doing' ? 'secondary' :
                milestone.status === 'blocked' ? 'destructive' : 'outline'
              }>
                {milestone.status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Blocks className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Projet: {milestone.projects?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Créé le {new Date(milestone.created_at).toLocaleString('fr-FR')}</span>
            </div>
            {milestone.due_date && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Échéance {new Date(milestone.due_date).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Progression</CardTitle>
            <form action={async (formData) => {
              'use server'
              const { updateMilestone } = await import('@/app/actions/milestones')
              const positionStr = String(formData.get('position') || '')
              const position = positionStr ? Number(positionStr) : undefined
              await updateMilestone(id, { position })
            }} className="flex items-center gap-2">
              <input name="position" type="number" min={0} defaultValue={milestone.position} className="border px-2 py-1 rounded text-sm w-20" />
              <Button size="sm" type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Position actuelle: {milestone.position}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


