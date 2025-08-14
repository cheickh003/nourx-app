import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Search, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MilestonePageActions } from './milestone-page-actions';
import { MilestoneCreateDialog } from '@/components/admin/milestone-create-dialog';

export const dynamic = 'force-dynamic'

async function getAllMilestones() {
  const supabase = await createClient();
  
  const { data: milestones, error } = await supabase
    .from('milestones')
    .select(`
      *,
      projects (
        id,
        name,
        clients (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return milestones || [];
}

async function getMilestoneStats() {
  const supabase = await createClient();
  
  const { data: allMilestones } = await supabase
    .from('milestones')
    .select('id, status');
  
  const total = allMilestones?.length || 0;
  const completed = allMilestones?.filter(m => m.status === 'done').length || 0;
  const inProgress = allMilestones?.filter(m => m.status === 'doing').length || 0;
  const todo = allMilestones?.filter(m => m.status === 'todo').length || 0;
  const blocked = allMilestones?.filter(m => m.status === 'blocked').length || 0;

  return { total, completed, inProgress, todo, blocked };
}

export default async function AdminFeuilleDeRoutePage() {
  const [milestones, stats] = await Promise.all([
    getAllMilestones(),
    getMilestoneStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feuille de route globale</h1>
          <p className="text-muted-foreground">
            Administration de tous les jalons clients.
          </p>
        </div>
        <MilestoneCreateDialog />
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
            <p className="text-xs text-muted-foreground">jalons</p>
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
            <CardTitle className="text-sm font-medium">Atteints</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">terminés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bloqués</CardTitle>
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
            <Button variant="outline">Tous les projets</Button>
            <Button variant="outline">Toutes les échéances</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des jalons */}
      <Card>
        <CardHeader>
          <CardTitle>Jalons ({milestones.length})</CardTitle>
          <CardDescription>
            Liste de tous les jalons avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucun jalon trouvé.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jalon</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((milestone) => (
                  <TableRow key={milestone.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{milestone.title}</div>
                        {milestone.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {milestone.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {milestone.projects?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {milestone.projects?.clients?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          milestone.status === 'done' ? 'default' :
                          milestone.status === 'doing' ? 'secondary' :
                          milestone.status === 'blocked' ? 'destructive' : 'outline'
                        }
                      >
                        {milestone.status === 'todo' ? 'À faire' :
                         milestone.status === 'doing' ? 'En cours' :
                         milestone.status === 'done' ? 'Atteint' : 'Bloqué'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {milestone.due_date ? (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(milestone.due_date), 'd MMM yyyy', { locale: fr })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-center">#{milestone.position}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(milestone.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <MilestonePageActions milestone={milestone} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
