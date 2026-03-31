import { cn } from '@/lib/utils';
import { statusLabels, statusColors } from '@/data/mock-data';
import { DossierClient } from '@/types/hunters';

interface StatusBadgeProps {
  status: DossierClient['status'];
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
