import { createClient } from '@/lib/supabase/server';
import { getProjectStats } from '@/app/actions/projects';
import { ProjectStatsCards, RecentMilestones, RecentDocuments, RecentTasks } from '@/components/projects/project-stats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import Link from 'next/link';

async function getClientProject() {
  const supabase = await createClient();
  
  // Récupérer le premier projet du client (pour simplifier)
  // Dans une vraie app, on pourrait avoir une route dynamique /projet/[id]
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return projects?.[0] || null;
}

export default async function ProjetPage() {
  const project = await getClientProject();

  if (!project) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Aperçu Projet</h1>
          <p className="text-muted-foreground">
            Détails et suivi de votre projet en cours.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Aucun projet trouvé. Contactez votre administrateur pour la création de votre projet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats, error: statsError } = await getProjectStats(project.id);

  if (statsError || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Aperçu Projet</h1>
          <p className="text-muted-foreground">
            Détails et suivi de votre projet en cours.
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Erreur lors du chargement des données du projet: {statsError}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Aperçu Projet</h1>
        <p className="text-muted-foreground">
          Détails et suivi de votre projet en cours.
        </p>
      </div>

      {/* Informations générales du projet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{project.name}</CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {project.clients?.name}
                </span>
                {project.start_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Début: {format(new Date(project.start_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
                {project.end_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    Fin: {format(new Date(project.end_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </CardDescription>
            </div>
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
          </div>
        </CardHeader>
        {project.description && (
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Statistiques KPIs */}
      <ProjectStatsCards stats={stats} />

      {/* Accès rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Accès rapides</CardTitle>
          <CardDescription>
            Naviguez vers les différentes sections de votre projet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/taches">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="mr-2 h-4 w-4" />
                Tableau Kanban
              </Button>
            </Link>
            <Link href="/feuille-de-route">
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="mr-2 h-4 w-4" />
                Feuille de route
              </Button>
            </Link>
            <Link href="/documents">
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Documents
              </Button>
            </Link>
            <Link href="/reclamations">
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Support
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Contenu récent en colonnes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <RecentMilestones milestones={stats.recentMilestones} />
          <RecentTasks tasks={stats.recentTasks} />
        </div>
        <div>
          <RecentDocuments documents={stats.recentDocuments} />
        </div>
      </div>
    </div>
  );
}