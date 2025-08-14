import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FileText, Target, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getProjectStats } from '@/app/actions/projects'
import { DocumentUpload } from '@/components/documents/document-upload'
import { DocumentList } from '@/components/documents/document-list'
import { Document } from '@/types/database'

export const dynamic = 'force-dynamic'

async function getProjectFull(projectId: string) {
  const supabase = await createClient()

  const [{ data: project }, { data: tasks }, { data: milestones }, { data: documents }] = await Promise.all([
    supabase
      .from('projects')
      .select(`*, clients ( id, name )`)
      .eq('id', projectId)
      .single(),
    supabase
      .from('tasks')
      .select('id, title, status, priority, assigned_to, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('milestones')
      .select('id, title, status, due_date, position, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('documents')
      .select('id, label, mime_type, size_bytes, visibility, created_at, created_by, storage_bucket, storage_path')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return { project, tasks: tasks ?? [], milestones: milestones ?? [], documents: documents ?? [] }
}

export default async function AdminProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const [{ project, tasks, milestones, documents }, { data: stats }] = await Promise.all([
    getProjectFull(projectId),
    getProjectStats(projectId),
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/projets" className="text-sm text-muted-foreground hover:underline flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Retour
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-1">{project.name}</h1>
          <p className="text-muted-foreground">Client: {project.clients?.name ?? 'N/A'}</p>
        </div>
        <div className="text-right">
          <Badge
            variant={
              project.status === 'completed' ? 'default' : project.status === 'active' ? 'secondary' : project.status === 'on_hold' ? 'outline' : 'destructive'
            }
          >
            {project.status}
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tâches</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">{stats.completedTasks} terminées • {stats.progressPercentage}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jalons</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMilestones}</div>
              <p className="text-xs text-muted-foreground">{stats.completedMilestones} atteints</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">fichiers</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Documents */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Uploader un document</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentUpload projectId={projectId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documents récents</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents as Document[]} canEdit={true} />
          </CardContent>
        </Card>
      </div>

      {/* Jalons */}
      <Card>
        <CardHeader>
          <CardTitle>Jalons ({milestones.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun jalon.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.title}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === 'done' ? 'default' : m.status === 'doing' ? 'secondary' : m.status === 'blocked' ? 'destructive' : 'outline'}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.due_date ? format(new Date(m.due_date), 'd MMM yyyy', { locale: fr }) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(m.created_at), 'd MMM yyyy', { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tâches */}
      <Card>
        <CardHeader>
          <CardTitle>Tâches ({tasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tâche.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Créé le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'done' ? 'default' : t.status === 'doing' ? 'secondary' : t.status === 'blocked' ? 'destructive' : 'outline'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.priority === 'urgent' ? 'destructive' : t.priority === 'high' ? 'secondary' : 'outline'}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(t.created_at), 'd MMM yyyy', { locale: fr })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


