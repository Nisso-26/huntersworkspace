import AppLayout from '@/components/AppLayout';
import { Bell, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useAlertes, useMarkAlertRead } from '@/hooks/use-alertes';
import { Skeleton } from '@/components/ui/skeleton';

const typeStyles = {
  urgente: { bg: 'bg-destructive/5 border-destructive/20', icon: AlertTriangle, iconColor: 'text-destructive' },
  warning: { bg: 'bg-hunters-warning/5 border-hunters-warning/20', icon: Clock, iconColor: 'text-hunters-warning' },
  info: { bg: 'bg-hunters-info/5 border-hunters-info/20', icon: Bell, iconColor: 'text-hunters-info' },
};

export default function Alertes() {
  const { data: alertes = [], isLoading } = useAlertes();
  const markRead = useMarkAlertRead();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Alertes & Échéances</h1>
          <p className="text-muted-foreground mt-1">Suivi des délais et notifications du réseau</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : alertes.length === 0 ? (
          <div className="bg-card rounded-xl border shadow-card p-8 text-center">
            <CheckCircle className="w-10 h-10 text-hunters-success mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune alerte pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertes.map((a, idx) => {
              const style = typeStyles[a.type as keyof typeof typeStyles] || typeStyles.info;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-opacity',
                    style.bg,
                    a.is_read && 'opacity-60'
                  )}
                  onClick={() => !a.is_read && markRead.mutate(a.id)}
                >
                  <div className="p-2 rounded-lg bg-card">
                    <style.icon className={cn('w-5 h-5', style.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold text-foreground', a.is_read && 'font-normal')}>{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {a.target_date ? new Date(a.target_date).toLocaleDateString('fr-FR') : new Date(a.created_at).toLocaleDateString('fr-FR')}
                    </span>
                    {!a.is_read && (
                      <span className="w-2 h-2 rounded-full bg-accent" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
