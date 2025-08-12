// Composants Badge de statuts/priorités (tâches/jalons)
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskStatus, TaskPriority, MilestoneStatus } from '@/types/database';

interface StatusBadgeProps {
  status: TaskStatus | MilestoneStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

const statusConfig = {
  todo: {
    label: 'À faire',
    variant: 'secondary' as const,
    className: 'bg-gray-100 text-gray-800'
  },
  doing: {
    label: 'En cours',
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-800'
  },
  done: {
    label: 'Terminé',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800'
  },
  blocked: {
    label: 'Bloqué',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800'
  }
};

const priorityConfig = {
  low: {
    label: 'Basse',
    className: 'bg-gray-100 text-gray-600'
  },
  normal: {
    label: 'Normale',
    className: 'bg-blue-100 text-blue-600'
  },
  high: {
    label: 'Haute',
    className: 'bg-orange-100 text-orange-600'
  },
  urgent: {
    label: 'Urgente',
    className: 'bg-red-100 text-red-600'
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
