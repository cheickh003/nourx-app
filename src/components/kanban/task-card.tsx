'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskWithDetails } from '@/types/database';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  MessageSquare, 
  CheckSquare, 
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskCardProps {
  task: TaskWithDetails;
  isDragging?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, isDragging = false, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculer le nombre d'éléments de checklist complétés
  const checklistProgress = task.checklist_items 
    ? {
        completed: task.checklist_items.filter(item => item.is_done).length,
        total: task.checklist_items.length
      }
    : null;

  const isOverdue = task.milestone?.due_date 
    ? new Date(task.milestone.due_date) < new Date() && task.status !== 'done'
    : false;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 rotate-5 scale-105',
        isOverdue && 'border-red-200 bg-red-50/30'
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4">
        {/* En-tête avec priorité */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-sm leading-5 text-gray-900 mb-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                {task.description}
              </p>
            )}
          </div>
          {task.priority !== 'normal' && (
            <div className="ml-2">
              <PriorityBadge priority={task.priority} />
            </div>
          )}
        </div>

        {/* Informations du jalon et date d'échéance */}
        {task.milestone && (
          <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span className="truncate">{task.milestone.title}</span>
            {task.milestone.due_date && (
              <span className={cn(
                'ml-auto',
                isOverdue && 'text-red-600 font-medium'
              )}>
                {format(new Date(task.milestone.due_date), 'dd MMM', { locale: fr })}
                {isOverdue && <AlertCircle className="h-3 w-3 inline ml-1" />}
              </span>
            )}
          </div>
        )}

        {/* Indicateurs de progression */}
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          {/* Commentaires */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{task.comments.length}</span>
            </div>
          )}

          {/* Checklist */}
          {checklistProgress && checklistProgress.total > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className={cn(
                'h-3 w-3',
                checklistProgress.completed === checklistProgress.total 
                  ? 'text-green-600' 
                  : 'text-gray-400'
              )} />
              <span className={cn(
                checklistProgress.completed === checklistProgress.total 
                  ? 'text-green-600' 
                  : 'text-gray-500'
              )}>
                {checklistProgress.completed}/{checklistProgress.total}
              </span>
            </div>
          )}

          {/* Date de création */}
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(task.created_at), 'dd/MM', { locale: fr })}</span>
          </div>
        </div>

        {/* Pied avec assigné et statut */}
        <div className="flex items-center justify-between">
          {/* Utilisateur assigné */}
          {task.assignee ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[100px]">
                {task.assignee.full_name || 'Utilisateur'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-3 w-3" />
              </div>
              <span className="text-xs">Non assigné</span>
            </div>
          )}

          {/* Badge de statut (masqué en mode Kanban car redondant avec la colonne) */}
          <div className="opacity-0">
            <StatusBadge status={task.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
