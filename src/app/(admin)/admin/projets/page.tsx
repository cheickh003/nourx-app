import { getAllProjects } from '@/app/actions/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CalendarDays, Plus, Search, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { ProjectCreateForm } from '@/components/admin/project-create-form';
import { ProjectRowActions } from '@/components/admin/project-edit-actions';

export const dynamic = 'force-dynamic'

export default async function AdminProjetsPage() {
  const { data: projects, error } = await getAllProjects();

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Projets</h1>
          <p className="text-muted-foreground">
            Administration de tous les projets clients.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erreur lors du chargement des projets: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Projets</h1>
          <p className="text-muted-foreground">
            Administration de tous les projets clients.
          </p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau projet</DialogTitle>
            </DialogHeader>
            <ProjectCreateForm />
          </DialogContent>
        </Dialog>
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
                  placeholder="Rechercher par nom ou client..."
                  className="pl-8"
                />
              </div>
            </div>
            <Button variant="outline">Tous les statuts</Button>
            <Button variant="outline">Tous les clients</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tableau des projets */}
      <Card>
        <CardHeader>
          <CardTitle>Projets ({projects?.length || 0})</CardTitle>
          <CardDescription>
            Liste de tous les projets avec leurs informations principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Aucun projet créé pour le moment.</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer le premier projet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Créer un nouveau projet</DialogTitle>
                  </DialogHeader>
                  <ProjectCreateForm />
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de début</TableHead>
                  <TableHead>Date de fin</TableHead>
                  <TableHead>Créé le</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        {project.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {project.clients?.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === 'completed' ? 'default' :
                          project.status === 'active' ? 'secondary' :
                          project.status === 'on_hold' ? 'outline' : 'destructive'
                        }
                      >
                        {project.status === 'active' ? 'Actif' :
                         project.status === 'completed' ? 'Terminé' :
                         project.status === 'on_hold' ? 'En attente' : 'Annulé'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.start_date ? (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(project.start_date), 'd MMM yyyy', { locale: fr })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.end_date ? (
                        <div className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(project.end_date), 'd MMM yyyy', { locale: fr })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(project.created_at), 'd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/projets/${project.id}`}>
                            Voir
                          </Link>
                        </Button>
                        <ProjectRowActions project={{ id: project.id, name: project.name, description: project.description ?? null, status: String(project.status || ''), start_date: project.start_date ?? null, end_date: project.end_date ?? null }} />
                      </div>
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