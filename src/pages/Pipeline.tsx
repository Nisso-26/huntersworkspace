import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers, useUpdateDossier, Dossier } from '@/hooks/use-dossiers';
import DossierDialog from '@/components/DossierDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateFacture } from '@/hooks/use-factures';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, columnColors, pipelineStatuses } from '@/data/status-config';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function Pipeline() {
  const { data: dossiers = [], isLoading } = useDossiers();
  const updateMut = useUpdateDossier();
  const { isAdmin } = useAuth();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleDragStart = (e: React.DragEvent, dossierId: string) => {
    e.dataTransfer.setData('dossierId', dossierId);
    setDraggingId(dossierId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverStatus(null);
    setDraggingId(null);
    const dossierId = e.dataTransfer.getData('dossierId');
    const dossier = dossiers.find(d => d.id === dossierId);
    if (!dossier || dossier.status === newStatus) return;

    const oldStatus = dossier.status;

    try {
      await updateMut.mutateAsync({ id: dossierId, status: newStatus });

      // Auto-create facture + commission when moving to "signe"
      if (newStatus === 'signe' && oldStatus !== 'signe') {
        const ref = `FACT-${Date.now().toString(36).toUpperCase()}`;

        // Create facture (honoraires)
        await supabase.from('factures').insert({
          mandataire_id: dossier.mandataire_id,
          dossier_id: dossier.id,
          montant: dossier.honoraires || 0,
          type: 'honoraires',
          statut: 'en_attente',
          reference: ref,
        } as any);

        // Get mandataire profile for niveau & parrain
        if (dossier.mandataire_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('niveau, parrain_id')
            .eq('id', dossier.mandataire_id)
            .single();

          const niveau = (profile as any)?.niveau || 'N1';
          const taux = niveau === 'N2' ? 60 : 50;
          const montantCommission = ((dossier.honoraires || 0) * taux) / 100;

          // Create commission for mandataire
          await supabase.from('commissions').insert({
            mandataire_id: dossier.mandataire_id,
            dossier_id: dossier.id,
            type: 'commission',
            taux,
            montant: montantCommission,
            statut: 'due',
          } as any);

          // Bonus parrainage (2% for parrain)
          const parrainId = (profile as any)?.parrain_id;
          if (parrainId) {
            const bonusMontant = ((dossier.honoraires || 0) * 2) / 100;
            await supabase.from('commissions').insert({
              mandataire_id: parrainId,
              dossier_id: dossier.id,
              type: 'parrainage',
              taux: 2,
              montant: bonusMontant,
              statut: 'due',
            } as any);
          }
        }

        qc.invalidateQueries({ queryKey: ['factures'] });
        qc.invalidateQueries({ queryKey: ['commissions'] });
        toast.success('Facture et commission créées automatiquement');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  }, [dossiers, updateMut, qc]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {isAdmin ? 'Pipeline Réseau' : 'Mon Pipeline'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isAdmin ? 'Vue Kanban — glissez-déposez pour changer le statut' : 'Suivi de mes dossiers par étape'}
            </p>
          </div>
          <DossierDialog />
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="w-[240px] h-64 rounded-xl flex-shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStatuses.map((status) => {
              const statusDossiers = dossiers.filter(d => d.status === status);
              const isDragOver = dragOverStatus === status;
              return (
                <div
                  key={status}
                  className="flex-shrink-0 w-[240px]"
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className={`bg-card rounded-xl border border-t-4 ${columnColors[status]} shadow-card transition-shadow ${isDragOver ? 'ring-2 ring-accent/50 shadow-lg' : ''}`}>
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
                              draggable
                              onDragStart={(e: any) => handleDragStart(e, d.id)}
                              onDragEnd={() => { setDraggingId(null); setDragOverStatus(null); }}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: draggingId === d.id ? 0.5 : 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="bg-background rounded-lg border p-3 hover:shadow-card transition-shadow cursor-grab active:cursor-grabbing"
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
