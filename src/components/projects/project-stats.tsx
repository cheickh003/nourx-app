'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle, FileText, Target, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProjectStats } from '@/app/actions/projects';

interface ProjectStatsProps {
  stats: ProjectStats;
}

export function ProjectStatsCards({ stats }: ProjectStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progression</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.progressPercentage}%</div>
          <Progress value={stats.progressPercentage} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.completedTasks} / {stats.totalTasks} tâches terminées
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tâches</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTasks}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedTasks} terminées
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Jalons</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMilestones}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedMilestones} atteints
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          <p className="text-xs text-muted-foreground">
            fichiers attachés
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RecentMilestones({ milestones }: { milestones: ProjectStats['recentMilestones'] }) {
  if (milestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jalons récents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun jalon pour ce projet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jalons récents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{milestone.title}</p>
                {milestone.due_date && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(milestone.due_date), 'd MMM yyyy', { locale: fr })}
                  </p>
                )}
              </div>
              <Badge 
                variant={
                  milestone.status === 'done' ? 'default' :
                  milestone.status === 'doing' ? 'secondary' :
                  milestone.status === 'blocked' ? 'destructive' : 'outline'
                }
              >
                {milestone.status === 'todo' ? 'À faire' :
                 milestone.status === 'doing' ? 'En cours' :
                 milestone.status === 'done' ? 'Terminé' : 'Bloqué'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentDocuments({ documents }: { documents: ProjectStats['recentDocuments'] }) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documents récents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun document pour ce projet.</p>
        </CardContent>
      </Card>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents récents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(doc.size_bytes || 0)} • {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentTasks({ tasks }: { tasks: ProjectStats['recentTasks'] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tâches récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune tâche pour ce projet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tâches récentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={
                      task.status === 'done' ? 'default' :
                      task.status === 'doing' ? 'secondary' :
                      task.status === 'blocked' ? 'destructive' : 'outline'
                    }
                    className="text-xs"
                  >
                    {task.status === 'todo' ? 'À faire' :
                     task.status === 'doing' ? 'En cours' :
                     task.status === 'done' ? 'Terminé' : 'Bloqué'}
                  </Badge>
                  <Badge 
                    variant={
                      task.priority === 'urgent' ? 'destructive' :
                      task.priority === 'high' ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {task.priority === 'low' ? 'Basse' :
                     task.priority === 'normal' ? 'Normale' :
                     task.priority === 'high' ? 'Haute' : 'Urgente'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
