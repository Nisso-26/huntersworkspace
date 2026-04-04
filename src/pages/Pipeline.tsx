import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers, useUpdateDossier } from '@/hooks/use-dossiers';
import DossierDialog from '@/components/DossierDialog';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const pipelineStatuses = ['nouveau', 'conseil', 'chasse', 'visite', 'offre', 'compromis', 'signe'] as const;

const statusLabels: Record<string, string> = {
  nouveau: 'Nouveau', conseil: 'Conseil', chasse: 'Chasse', visite: 'Visites',
  offre: 'Offre', compromis: 'Compromis', signe: 'Signé',
};

const columnColors: Record<string, string> = {
  nouveau: 'border-t-muted-foreground', conseil: 'border-t-hunters-info',
  chasse: 'border-t-hunters-warning', visite: 'border-t-accent',
  offre: 'border-t-accent', compromis: 'border-t-hunters-success', signe: 'border-t-hunters-success',
};

export default function Pipeline() {
  const { data: dossiers = [], isLoading } = useDossiers();
  const updateMut = useUpdateDossier();
  const { isAdmin } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Pipeline Réseau</h1>
            <p className="text-muted-foreground mt-1">Vue Kanban de tous les dossiers par statut</p>
          </div>
          <DossierDialog />
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-[260px] h-64 rounded-xl flex-shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStatuses.map((status) => {
              const statusDossiers = dossiers.filter(d => d.status === status);
              return (
                <div key={status} className="flex-shrink-0 w-[260px]">
                  <div className={`bg-card rounded-xl border border-t-4 ${columnColors[status]} shadow-card`}>
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">{statusLabels[status]}</h3>
                        <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5 font-medium">
                          {statusDossiers.length}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 space-y-3 min-h-[120px]">
                      {statusDossiers.map((d, idx) => (
                        <DossierDialog
                          key={d.id}
                          dossier={d}
                          trigger={
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-background rounded-lg border p-3 hover:shadow-card transition-shadow cursor-pointer"
                            >
                              <p className="text-sm font-medium text-foreground">{d.client_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{d.ville}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-medium text-foreground">{d.budget.toLocaleString('fr-FR')} €</span>
                                <span className="text-xs text-muted-foreground">{(d.mandataire_name || '').split(' ')[0]}</span>
                              </div>
                            </motion.div>
                          }
                        />
                      ))}
                      {statusDossiers.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">Aucun dossier</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
