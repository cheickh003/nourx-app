'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaskWithDetails } from '@/types/database';
import { KanbanBoard } from './kanban-board';
import { useTasksRealtime } from '@/hooks/useRealtime';
import { getTasks } from '@/app/actions/tasks';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RealtimeKanbanBoardProps {
  initialTasks: TaskWithDetails[];
  projectId: string;
  enabled?: boolean;
}

export function RealtimeKanbanBoard({ 
  initialTasks, 
  projectId, 
  enabled = true 
}: RealtimeKanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithDetails[]>(initialTasks);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Fonction pour rafraîchir les tâches
  const refreshTasks = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const result = await getTasks(projectId);
      if (result.success && result.data) {
        setTasks(result.data);
        setLastUpdate(Date.now());
      } else {
        console.error('Erreur rafraîchissement tâches:', result.error);
      }
    } catch (error) {
      console.error('Erreur rafraîchissement tâches:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [projectId, isRefreshing]);

  // Gestionnaire de changement temps réel
  const handleRealtimeChange = useCallback(() => {
    console.log('Changement détecté sur les tâches, rafraîchissement...');
    refreshTasks();
  }, [refreshTasks]);

  // Hook realtime
  useTasksRealtime(projectId, handleRealtimeChange, enabled);

  // Synchroniser avec les props initiales si elles changent
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Gestionnaire de mise à jour manuelle (pour après drag & drop)
  const handleTaskUpdate = useCallback(() => {
    // Petit délai pour éviter les conflits avec le realtime
    setTimeout(refreshTasks, 500);
  }, [refreshTasks]);

  return (
    <div className="space-y-4">
      {/* Header avec indicateur de mise à jour */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Tableau Kanban</h3>
          {enabled && (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Temps réel actif</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Dernière mise à jour: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTasks}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard 
        tasks={tasks}
        projectId={projectId}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
}
