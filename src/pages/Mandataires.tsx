import AppLayout from '@/components/AppLayout';
import { mandataires } from '@/data/mock-data';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, FolderOpen, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const abonnementBadge = {
  actif: 'bg-hunters-success/10 text-hunters-success',
  suspendu: 'bg-hunters-warning/10 text-hunters-warning',
  impaye: 'bg-destructive/10 text-destructive',
};

const abonnementLabel = {
  actif: 'Actif',
  suspendu: 'Suspendu',
  impaye: 'Impayé',
};

export default function Mandataires() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Mandataires</h1>
          <p className="text-muted-foreground mt-1">Gestion du réseau — {mandataires.length} mandataires</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mandataires.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="bg-card rounded-xl border shadow-card p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{m.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{m.zone}</span>
                    </div>
                  </div>
                </div>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', abonnementBadge[m.abonnementStatus])}>
                  {abonnementLabel[m.abonnementStatus]}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <TrendingUp className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{((m.caTotal || 0) / 1000).toFixed(1)}k €</p>
                  <p className="text-xs text-muted-foreground">CA</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <FolderOpen className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-foreground">{m.dossiersActifs}</p>
                  <p className="text-xs text-muted-foreground">Dossiers</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-accent mt-4">{((m.commissionsTotal || 0) / 1000).toFixed(1)}k €</p>
                  <p className="text-xs text-muted-foreground">Commission</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
