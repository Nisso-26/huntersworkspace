import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  variant?: 'default' | 'gold' | 'success' | 'info';
  subtitle?: string;
}

export default function StatCard({ label, value, change, icon: Icon, variant = 'default', subtitle }: StatCardProps) {
  const isGold = variant === 'gold';

  return (
    <div className={cn(
      'relative rounded-xl p-5 transition-all duration-200 overflow-hidden card-hover',
      isGold
        ? 'bg-gradient-to-br from-[hsl(147,52%,16%)] to-[hsl(147,48%,22%)] shadow-gold border border-white/5'
        : 'bg-card shadow-card border border-border/60',
    )}>
      {/* Fond décoratif */}
      {isGold && (
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/10 -translate-y-8 translate-x-8" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className={cn(
            'text-[11px] font-semibold uppercase tracking-widest',
            isGold ? 'text-white/50' : 'text-muted-foreground'
          )}>
            {label}
          </p>
          <p className={cn(
            'text-2xl font-bold font-heading leading-none',
            isGold ? 'text-accent' : 'text-foreground'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-xs', isGold ? 'text-white/40' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
          {change !== undefined && (
            <div className={cn(
              'inline-flex items-center gap-1 text-[11px] font-semibold mt-1',
              change >= 0 ? 'text-hunters-success' : 'text-destructive'
            )}>
              {change >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {change >= 0 ? '+' : ''}{change}% ce mois
            </div>
          )}
        </div>

        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3',
          isGold ? 'bg-accent/20' : variant === 'success'
            ? 'bg-hunters-success/10'
            : variant === 'info'
            ? 'bg-hunters-info/10'
            : 'bg-primary/8'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            isGold ? 'text-accent' : variant === 'success'
              ? 'text-hunters-success'
              : variant === 'info'
              ? 'text-hunters-info'
              : 'text-primary'
          )} />
        </div>
      </div>
    </div>
  );
}
