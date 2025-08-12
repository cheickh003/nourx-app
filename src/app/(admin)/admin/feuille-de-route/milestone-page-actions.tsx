'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MilestoneEditDialog } from '@/components/admin/milestone-edit-dialog';
import { Milestone } from '@/types/database';
import { useRouter } from 'next/navigation';

interface MilestonePageActionsProps {
  milestone: Milestone;
}

export function MilestonePageActions({ milestone }: MilestonePageActionsProps) {
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
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
          onClick={() => setEditingMilestone(milestone)}
        >
          Éditer
        </Button>
      </div>
      
      {editingMilestone && (
        <MilestoneEditDialog
          milestone={editingMilestone}
          open={!!editingMilestone}
          onOpenChange={(open) => !open && setEditingMilestone(null)}
          onMilestoneUpdated={handleRefresh}
        />
      )}
    </>
  );
}
