'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskEditDialog } from './task-edit-dialog';
import { TaskCreateDialog } from './task-create-dialog';
import type { Task } from '@/types/database';

interface TasksPageClientProps {
  tasks: Task[];
  onRefresh: () => void;
}

export function TasksPageClient({ tasks, onRefresh }: TasksPageClientProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  return (
    <div className="flex justify-between items-center">
      <TaskCreateDialog />
      
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onTaskUpdated={onRefresh}
        />
      )}
      
      {/* Actions pour chaque tâche */}
      <div style={{ display: 'none' }}>
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {/* Voir détails */}}
            >
              Voir
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setEditingTask(task)}
            >
              Éditer
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
