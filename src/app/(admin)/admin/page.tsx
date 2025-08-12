import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, CheckCircle, FileText, Target, Users } from 'lucide-react'
import Link from 'next/link'

async function getAdminDashboardData() {
  const supabase = await createClient()

  const [{ data: projects }, { data: tasks }, { data: clients }, { data: documents }] = await Promise.all([
    supabase.from('projects').select('id, name, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('clients').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('documents').select('id, label, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const [projectsCount, tasksCount, clientsCount, documentsCount] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }),
    supabase.from('tasks').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
  ])

  return {
    latest: {
      projects: projects ?? [],
      tasks: tasks ?? [],
      clients: clients ?? [],
      documents: documents ?? [],
    },
    counts: {
      projects: projectsCount.count ?? 0,
      tasks: tasksCount.count ?? 0,
      clients: clientsCount.count ?? 0,
      documents: documentsCount.count ?? 0,
    },
  }
}

export default async function AdminHomePage() {
  const data = await getAdminDashboardData()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d&apos;ensemble des activités</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.counts.projects}</div>
            <p className="text-xs text-muted-foreground">projets actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.counts.tasks}</div>
            <p className="text-xs text-muted-foreground">tâches au total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.counts.clients}</div>
            <p className="text-xs text-muted-foreground">comptes clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.counts.documents}</div>
            <p className="text-xs text-muted-foreground">fichiers stockés</p>
          </CardContent>
        </Card>
      </div>

      {/* Derniers éléments */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Projets récents</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/projets">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.latest.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet</p>
              ) : (
                data.latest.projects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <Badge variant={p.status === 'active' ? 'secondary' : 'outline'}>{p.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Tâches récentes</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/taches">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.latest.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune tâche</p>
              ) : (
                data.latest.tasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.title}</span>
                    <Badge variant={t.status === 'done' ? 'default' : t.status === 'doing' ? 'secondary' : 'outline'}>{t.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Clients récents</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/clients">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.latest.clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun client</p>
              ) : (
                data.latest.clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{c.name}</span>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Documents récents</CardTitle>
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/documents">Voir tout</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.latest.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun document</p>
              ) : (
                data.latest.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.label}</span>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


