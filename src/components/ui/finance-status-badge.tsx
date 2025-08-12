import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { QuoteStatus, InvoiceStatus, PaymentStatus, PaymentAttemptStatus } from '@/types/database';

interface FinanceStatusBadgeProps {
  status: QuoteStatus | InvoiceStatus | PaymentStatus | PaymentAttemptStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  // Quote statuses
  draft: {
    label: 'Brouillon',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800'
  },
  sent: {
    label: 'Envoyé',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800'
  },
  accepted: {
    label: 'Accepté',
    variant: 'default',
    className: 'bg-green-100 text-green-800'
  },
  rejected: {
    label: 'Refusé',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800'
  },
  expired: {
    label: 'Expiré',
    variant: 'outline',
    className: 'bg-orange-100 text-orange-800'
  },
  canceled: {
    label: 'Annulé',
    variant: 'outline',
    className: 'bg-gray-100 text-gray-600'
  },
  
  // Invoice statuses
  issued: {
    label: 'Émise',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800'
  },
  paid: {
    label: 'Payée',
    variant: 'default',
    className: 'bg-green-100 text-green-800'
  },
  overdue: {
    label: 'En retard',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800'
  },
  
  // Payment statuses
  pending: {
    label: 'En attente',
    variant: 'outline',
    className: 'bg-yellow-100 text-yellow-800'
  },
  // 'accepted' is already defined for quotes
  refused: {
    label: 'Refusé',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800'
  },
  
  // Payment attempt statuses
  created: {
    label: 'Créé',
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800'
  },
  redirected: {
    label: 'Redirigé',
    variant: 'outline',
    className: 'bg-blue-100 text-blue-800'
  },
  webhooked: {
    label: 'Notifié',
    variant: 'outline',
    className: 'bg-purple-100 text-purple-800'
  },
  checked: {
    label: 'Vérifié',
    variant: 'outline',
    className: 'bg-indigo-100 text-indigo-800'
  },
  completed: {
    label: 'Terminé',
    variant: 'default',
    className: 'bg-green-100 text-green-800'
  },
  failed: {
    label: 'Échoué',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800'
  }
};

export function FinanceStatusBadge({ status, className }: FinanceStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-600'
  };
  
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
