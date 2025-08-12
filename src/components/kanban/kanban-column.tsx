'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskWithDetails, TaskStatus } from '@/types/database';
import { TaskCard } from './task-card';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KanbanColumnProps {
  status: TaskStatus;
  title: string;
  color: string;
  tasks: TaskWithDetails[];
  projectId: string;
  onAddTask?: (status: TaskStatus) => void;
}

export function KanbanColumn({ 
  status, 
  title, 
  color, 
  tasks, 
  projectId, 
  onAddTask 
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map(task => task.id);

  return (
    <div className="flex flex-col w-80 flex-shrink-0">
      {/* En-tête de colonne */}
      <div className={cn(
        'p-4 rounded-t-lg border-b',
        color
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-gray-900">
              {title}
            </h3>
            <span className="bg-white/60 text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
              {tasks.length}
            </span>
          </div>
          {onAddTask && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onAddTask(status)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Zone de dépôt */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-4 space-y-3 min-h-[500px] rounded-b-lg border-x border-b bg-white/50',
          isOver && 'bg-blue-50/50 ring-2 ring-blue-200'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Plus className="h-6 w-6" />
            </div>
            <p className="text-sm">Aucune tâche</p>
            {onAddTask && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => onAddTask(status)}
              >
                Ajouter une tâche
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
