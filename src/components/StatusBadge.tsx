import { cn } from '@/lib/utils';
import { statusLabels, statusColors } from '@/data/status-config';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

const dotColors: Record<string, string> = {
  nouveau: 'bg-muted-foreground',
  conseil: 'bg-hunters-info',
  chasse: 'bg-hunters-warning',
  visite: 'bg-accent',
  offre: 'bg-accent',
  compromis: 'bg-hunters-success',
  signe: 'bg-hunters-success',
  cloture: 'bg-muted-foreground',
  actif: 'bg-hunters-success',
  suspendu: 'bg-hunters-warning',
  résilie: 'bg-destructive',
};

export default function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium border',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      statusColors[status] || 'bg-muted text-muted-foreground border-border',
      className
    )}>
      <span className={cn(
        'rounded-full flex-shrink-0',
        size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5',
        dotColors[status] || 'bg-current opacity-60'
      )} />
      {statusLabels[status] || status}
    </span>
  );
}
