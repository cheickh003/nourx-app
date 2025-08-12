'use client';

import { Milestone } from '@/types/database';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MilestoneTimelineProps {
  milestones: Milestone[];
  className?: string;
}

export function MilestoneTimeline({ milestones, className }: MilestoneTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => {
    // Trier par position puis par date de création
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'doing':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300 bg-white" />;
    }
  };

  const isOverdue = (milestone: Milestone) => {
    if (!milestone.due_date || milestone.status === 'done') return false;
    return new Date(milestone.due_date) < new Date();
  };

  if (milestones.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Aucun jalon défini
        </h3>
        <p className="text-gray-500">
          Les jalons du projet apparaîtront ici
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Ligne de temps verticale */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

      <div className="space-y-6">
        {sortedMilestones.map((milestone, index) => {
          const overdue = isOverdue(milestone);
          
          return (
            <div key={milestone.id} className="relative flex items-start gap-6">
              {/* Icône de statut sur la ligne de temps */}
              <div className="relative z-10 flex-shrink-0">
                {getStatusIcon(milestone.status)}
              </div>

              {/* Contenu du jalon */}
              <Card className={cn(
                'flex-1',
                overdue && 'border-red-200 bg-red-50/50',
                milestone.status === 'done' && 'opacity-75'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className={cn(
                        'font-medium text-sm mb-1',
                        milestone.status === 'done' && 'line-through text-gray-500'
                      )}>
                        {milestone.title}
                      </h4>
                      
                      {milestone.description && (
                        <p className="text-xs text-gray-600 mb-2">
                          {milestone.description}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={milestone.status} />
                  </div>

                  {/* Date d'échéance */}
                  {milestone.due_date && (
                    <div className={cn(
                      'flex items-center gap-2 text-xs',
                      overdue ? 'text-red-600' : 'text-gray-500'
                    )}>
                      <Calendar className="h-3 w-3" />
                      <span>
                        Échéance : {format(new Date(milestone.due_date), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                      {overdue && (
                        <>
                          <AlertCircle className="h-3 w-3" />
                          <span className="font-medium">En retard</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Informations de création */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Créé le {format(new Date(milestone.created_at), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                    
                    {/* Position dans la feuille de route */}
                    <span className="text-xs text-gray-400">
                      #{milestone.position + 1}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Résumé de progression */}
      <Card className="mt-8">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progression de la feuille de route</span>
            
            <div className="flex items-center gap-4">
              {['done', 'doing', 'todo', 'blocked'].map(status => {
                const count = milestones.filter(m => m.status === status).length;
                const labels = {
                  done: 'Terminés',
                  doing: 'En cours',
                  todo: 'À faire',
                  blocked: 'Bloqués'
                };
                
                return count > 0 ? (
                  <div key={status} className="flex items-center gap-1">
                    <StatusBadge status={status as Milestone['status']} />
                    <span className="text-xs text-gray-600">
                      {count}
                    </span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
