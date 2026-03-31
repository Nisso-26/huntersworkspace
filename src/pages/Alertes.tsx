import AppLayout from '@/components/AppLayout';
import { Bell, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const alertes = [
  { id: 1, type: 'urgente' as const, title: 'Délai rétractation SRU expire', detail: 'Dossier Jean Dupont — Villeurbanne — J-2', date: '2026-04-02' },
  { id: 2, type: 'warning' as const, title: 'Condition suspensive prêt', detail: 'Dossier Marie Durand — Paris 18e — J-12', date: '2026-04-12' },
  { id: 3, type: 'info' as const, title: 'Signature compromis prévue', detail: 'Dossier Isabelle Roche — Marseille 8e', date: '2026-04-05' },
  { id: 4, type: 'urgente' as const, title: 'Impayé abonnement', detail: 'Nicolas Roux — 2 mois de retard', date: '2026-03-31' },
  { id: 5, type: 'info' as const, title: 'Nouveau dossier créé', detail: 'Claire Morel — Sophie Dubois — Boulogne', date: '2026-03-20' },
  { id: 6, type: 'warning' as const, title: 'Dépassement budget travaux', detail: 'Dossier Antoine Lambert — Nantes Sud — +8%', date: '2026-03-28' },
];

const typeStyles = {
  urgente: { bg: 'bg-destructive/5 border-destructive/20', icon: AlertTriangle, iconColor: 'text-destructive' },
  warning: { bg: 'bg-hunters-warning/5 border-hunters-warning/20', icon: Clock, iconColor: 'text-hunters-warning' },
  info: { bg: 'bg-hunters-info/5 border-hunters-info/20', icon: Bell, iconColor: 'text-hunters-info' },
};

export default function Alertes() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Alertes & Échéances</h1>
          <p className="text-muted-foreground mt-1">Suivi des délais et notifications du réseau</p>
        </div>

        <div className="space-y-3">
          {alertes.map((a, idx) => {
            const style = typeStyles[a.type];
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={cn('flex items-start gap-4 p-4 rounded-xl border', style.bg)}
              >
                <div className="p-2 rounded-lg bg-card">
                  <style.icon className={cn('w-5 h-5', style.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(a.date).toLocaleDateString('fr-FR')}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
