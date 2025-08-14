import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Search, User, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TasksPageActions } from './tasks-page-actions';
import { TaskCreateDialog } from '@/components/admin/task-create-dialog';
export const dynamic = 'force-dynamic'

async function getTasksPage(page: number, pageSize: number) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const query = supabase
    .from('tasks')
    .select(`
      *,
      projects (
        id,
        name,
        clients (
          id,
          name
        )
      ),
      profiles!tasks_assigned_to_fkey (
        user_id,
        first_name,
        last_name
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data || [], total: count || 0 }
}

async function getTaskStats() {
  const supabase = await createClient();
  
  // Statistiques générales
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, status');
  
  const total = allTasks?.length || 0;
  const completed = allTasks?.filter(t => t.status === 'done').length || 0;
  const inProgress = allTasks?.filter(t => t.status === 'doing').length || 0;
  const todo = allTasks?.filter(t => t.status === 'todo').length || 0;
  const blocked = allTasks?.filter(t => t.status === 'blocked').length || 0;

  return { total, completed, inProgress, todo, blocked };
}

export default async function AdminTachesPage({ searchParams }: { searchParams?: Promise<{ page?: string; size?: string }> }) {
  const { page = '1', size = '25' } = (await searchParams) || {}
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(5, parseInt(size || '25', 10) || 25))
  const [{ rows, total }, stats] = await Promise.all([getTasksPage(pageNum, pageSize), getTaskStats()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Tâches</h1>
          <p className="text-muted-foreground">
            Administration de toutes les tâches clients.
          </p>
        </div>
        <TaskCreateDialog />
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">tâches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À faire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todo}</div>
            <p className="text-xs text-muted-foreground">à commencer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">en travail</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminées</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">complètes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloquées</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">en attente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par titre, projet ou client..."
                  className="pl-8"
                />
              </div>
            </div>
            <Button variant="outline">Tous les statuts</Button>
            <Button variant="outline">Toutes les priorités</Button>
            <Button variant="outline">Tous les projets</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des tâches */}
      <Card>
        <CardHeader>
          <CardTitle>Tâches ({total})</CardTitle>
          <CardDescription>
            Liste de toutes les tâches avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucune tâche trouvée.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {task.projects?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.projects?.clients?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          task.status === 'done' ? 'default' :
                          task.status === 'doing' ? 'secondary' :
                          task.status === 'blocked' ? 'destructive' : 'outline'
                        }
                      >
                        {task.status === 'todo' ? 'À faire' :
                         task.status === 'doing' ? 'En cours' :
                         task.status === 'done' ? 'Terminé' : 'Bloqué'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          task.priority === 'urgent' ? 'destructive' :
                          task.priority === 'high' ? 'secondary' : 'outline'
                        }
                      >
                        {task.priority === 'low' ? 'Basse' :
                         task.priority === 'normal' ? 'Normale' :
                         task.priority === 'high' ? 'Haute' : 'Urgente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.profiles ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {task.profiles.first_name?.[0]}{task.profiles.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {task.profiles.first_name} {task.profiles.last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Non assignée</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(task.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TasksPageActions task={task} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {total > pageSize && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">Page {pageNum} / {Math.ceil(total / pageSize)}</span>
              <div className="flex items-center gap-2">
                <a className="btn btn-sm border px-3 py-1 rounded" href={`?page=${Math.max(1, pageNum - 1)}&size=${pageSize}`}>Précédent</a>
                <a className="btn btn-sm border px-3 py-1 rounded" href={`?page=${pageNum + 1}&size=${pageSize}`}>Suivant</a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}