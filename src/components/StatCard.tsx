import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant?: 'default' | 'gold' | 'success' | 'info';
}

const variantStyles = {
  default: 'bg-card shadow-card',
  gold: 'bg-gradient-gold shadow-gold text-primary',
  success: 'bg-hunters-success/5 border-hunters-success/20',
  info: 'bg-hunters-info/5 border-hunters-info/20',
};

const iconBgStyles = {
  default: 'bg-secondary',
  gold: 'bg-primary/10',
  success: 'bg-hunters-success/10',
  info: 'bg-hunters-info/10',
};

export default function StatCard({ label, value, change, icon: Icon, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border p-5 transition-all duration-200 hover:shadow-lg', variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className={cn('text-sm font-medium', variant === 'gold' ? 'text-primary/70' : 'text-muted-foreground')}>
            {label}
          </p>
          <p className={cn('text-2xl font-bold font-heading', variant === 'gold' ? 'text-primary' : 'text-foreground')}>
            {value}
          </p>
          {change !== undefined && (
            <p className={cn('text-xs font-medium', change >= 0 ? 'text-hunters-success' : 'text-destructive')}>
              {change >= 0 ? '+' : ''}{change}% vs mois dernier
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', iconBgStyles[variant])}>
          <Icon className={cn('w-5 h-5', variant === 'gold' ? 'text-primary' : 'text-muted-foreground')} />
        </div>
      </div>
    </div>
  );
}
