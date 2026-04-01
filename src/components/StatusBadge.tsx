import { cn } from '@/lib/utils';
import { statusLabels, statusColors } from '@/data/status-config';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', statusColors[status] || 'bg-muted text-muted-foreground', className)}>
      {statusLabels[status] || status}
    </span>
  );
}
