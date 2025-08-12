'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskEditDialog } from '@/components/admin/task-edit-dialog';
import { TaskCreateDialog } from '@/components/admin/task-create-dialog';
import { Task } from '@/types/database';
import { useRouter } from 'next/navigation';

interface TasksPageActionsProps {
  task: Task;
}

export function TasksPageActions({ task }: TasksPageActionsProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {/* TODO: Voir détails */}}
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
      
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onTaskUpdated={handleRefresh}
        />
      )}
    </>
  );
}
