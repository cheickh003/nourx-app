'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
// import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskWithDetails, TaskStatus } from '@/types/database';
import { bulkReorderTasks } from '@/app/actions/tasks';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import { toast } from 'sonner';

interface KanbanBoardProps {
  tasks: TaskWithDetails[];
  projectId: string;
  onTaskUpdate?: () => void;
}

const COLUMN_CONFIG = {
  todo: { title: 'À faire', color: 'bg-gray-50' },
  doing: { title: 'En cours', color: 'bg-blue-50' },
  done: { title: 'Terminé', color: 'bg-green-50' },
  blocked: { title: 'Bloqué', color: 'bg-red-50' }
} as const;

export function KanbanBoard({ tasks, projectId, onTaskUpdate }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Regrouper les tâches par statut
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithDetails[]> = {
      todo: [],
      doing: [],
      done: [],
      blocked: []
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Trier par position dans chaque colonne
    Object.keys(grouped).forEach(status => {
      grouped[status as TaskStatus].sort((a, b) => a.position - b.position);
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Si on survole une colonne (pas une tâche)
    if (overId in COLUMN_CONFIG) {
      // Ne rien faire, la logique sera dans handleDragEnd
      return;
    }

    // Si on survole une autre tâche
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const overTask = tasks.find(t => t.id === overId);

    if (!activeTask || !overTask) return;

    // Si les tâches sont dans la même colonne, ne pas faire de mise à jour ici
    if (activeTask.status === overTask.status) return;

    // Mise à jour optimiste pour améliorer l'UX
    // (Cette logique sera implémentée dans une version plus avancée)
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    
    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeTaskId);
    if (!activeTask) return;

    let newStatus: TaskStatus = activeTask.status;
    let newPosition = activeTask.position;

    // Déterminer le nouveau statut
    if (overId in COLUMN_CONFIG) {
      // Déposé sur une colonne
      newStatus = overId as TaskStatus;
      // Nouvelle position : à la fin de la colonne
      newPosition = tasksByStatus[newStatus].length;
    } else {
      // Déposé sur une tâche
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
        // Position : juste avant la tâche sur laquelle on a déposé
        const overTaskIndex = tasksByStatus[newStatus].findIndex(t => t.id === overId);
        newPosition = overTaskIndex;
      }
    }

    // Si rien n'a changé, ne pas faire de mise à jour
    if (newStatus === activeTask.status && newPosition === activeTask.position) {
      return;
    }

    // Éviter les mises à jour simultanées
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      // Calculer les nouvelles positions pour toutes les tâches affectées
      const tasksInNewColumn = tasksByStatus[newStatus].filter(t => t.id !== activeTaskId);
      // Insérer la tâche à la nouvelle position
      tasksInNewColumn.splice(newPosition, 0, { ...activeTask, status: newStatus });
      // Construire l'ordre final des IDs
      const orderedIds = tasksInNewColumn.map(t => t.id);
      // Mettre à jour en lot
      await bulkReorderTasks(projectId, newStatus, orderedIds);

      // Notifier la mise à jour
      if (onTaskUpdate) {
        onTaskUpdate();
      }

      toast.success('Tâche déplacée avec succès');
    } catch (error) {
      console.error('Erreur déplacement tâche:', error);
      toast.error('Erreur lors du déplacement de la tâche');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 h-full overflow-x-auto pb-6">
        {(Object.keys(COLUMN_CONFIG) as TaskStatus[]).map(status => (
          <KanbanColumn
            key={status}
            status={status}
            title={COLUMN_CONFIG[status].title}
            color={COLUMN_CONFIG[status].color}
            tasks={tasksByStatus[status]}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-5 scale-105">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
