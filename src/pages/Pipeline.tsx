import AppLayout from '@/components/AppLayout';
import { useDossiers, useUpdateDossier, Dossier } from '@/hooks/use-dossiers';
import DossierDialog from '@/components/DossierDialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { statusLabels, columnColors, pipelineStatuses } from '@/data/status-config';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import {
  shouldTriggerHonoraires,
  commissionRateForLevel,
  computeCommission,
  computeBonusParrainage,
  isValidPipelineStatus,
} from '@/lib/pipeline-transitions';

// ─────────────────────────────────────────────
// Carte dossier draggable (souris + tactile + clavier)
// ─────────────────────────────────────────────
function DraggableCard({ dossier, idx }: { dossier: Dossier; idx: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dossier.id,
    data: { dossier },
  });
  const updateMut = useUpdateDossier();

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    await updateMut.mutateAsync({ id: dossier.id, status: e.target.value });
  };

  return (
    <DossierDialog
      dossier={dossier}
      trigger={
        <motion.div
          ref={setNodeRef}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
          transition={{ delay: idx * 0.04 }}
          className="bg-card rounded-xl border border-border/60 p-3.5 hover:shadow-card-hover hover:-translate-y-px transition-all duration-150 cursor-pointer group"
          style={{ touchAction: 'manipulation' }}
        >
          <div className="flex items-start gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`Déplacer le dossier ${dossier.client_name}`}
              className="flex-shrink-0 p-1 -ml-1 rounded text-muted-foreground hover:bg-muted active:bg-muted cursor-grab active:cursor-grabbing touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{dossier.client_name}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{dossier.ville || '—'}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-bold text-accent">
                  {(dossier.budget || 0).toLocaleString('fr-FR')} €
                </span>
                <span className="text-xs text-muted-foreground truncate ml-2">
                  {(dossier.mandataire_name || '').split(' ')[0]}
                </span>
              </div>
              {/* Sélecteur statut mobile uniquement */}
              <select
                className="mt-2 w-full text-xs border rounded px-1.5 py-1 bg-background text-foreground sm:hidden"
                value={dossier.status}
                onChange={handleStatusChange}
                onClick={e => e.stopPropagation()}
              >
                {pipelineStatuses.map(s => (
                  <option key={s} value={s}>{statusLabels[s] || s}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      }
    />
  );
}

// ─────────────────────────────────────────────
// Colonne droppable
// ─────────────────────────────────────────────
function DroppableColumn({
  status,
  children,
  count,
}: {
  status: string;
  children: React.ReactNode;
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-[260px] sm:w-[240px]">
      <div
        className={`bg-card rounded-xl border border-border/60 shadow-card border-t-4 ${columnColors[status]} shadow-card transition-all ${
          isOver ? 'ring-2 ring-accent shadow-lg scale-[1.01]' : ''
        }`}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{statusLabels[status]}</h3>
            <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5 font-medium">
              {count}
            </span>
          </div>
        </div>
        <div className="p-3 space-y-3 min-h-[140px]">{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page Pipeline
// ─────────────────────────────────────────────
export default function Pipeline() {
  const { data: dossiers = [], isLoading } = useDossiers();
  const updateMut = useUpdateDossier();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [activeDossier, setActiveDossier] = useState<Dossier | null>(null);

  // Sensors :
  // - PointerSensor pour souris/stylet (delay 0, distance 6px → laisse le clic ouvrir le dialog)
  // - TouchSensor avec delay 200ms pour mobile (long-press) → fallback iOS/Android fiable
  // - KeyboardSensor pour accessibilité (Espace + flèches)
  // - MouseSensor en complément pour Safari desktop ancien
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (e: DragStartEvent) => {
    const dossier = dossiers.find((d) => d.id === e.active.id);
    setActiveDossier(dossier || null);
  };

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveDossier(null);
      const { active, over } = e;
      if (!over) return;

      const dossierId = String(active.id);
      const newStatus = String(over.id);

      if (!isValidPipelineStatus(newStatus)) return;

      const dossier = dossiers.find((d) => d.id === dossierId);
      if (!dossier || dossier.status === newStatus) return;

      const oldStatus = dossier.status;

      try {
        await updateMut.mutateAsync({ id: dossierId, status: newStatus });

        if (shouldTriggerHonoraires(oldStatus, newStatus)) {
          await supabase.from('alertes').insert({
            user_id: dossier.mandataire_id,
            type: 'info',
            title: `Émettre la facture pour ${dossier.client_name}`,
            detail: 'Dossier passé en Acte signé — facture auto-générée',
            dossier_id: dossier.id,
          } as any);

          const ref = `FACT-${Date.now().toString(36).toUpperCase()}`;
          await supabase.from('factures').insert({
            mandataire_id: dossier.mandataire_id,
            dossier_id: dossier.id,
            montant: dossier.honoraires || 0,
            type: 'honoraires',
            statut: 'en_attente',
            reference: ref,
          } as any);

          if (dossier.mandataire_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('niveau, parrain_id')
              .eq('id', dossier.mandataire_id)
              .single();

            const niveau = (profile as any)?.niveau ?? 'N1';
            const taux = commissionRateForLevel(niveau);
            const montantCommission = computeCommission(dossier.honoraires || 0, taux);

            await supabase.from('commissions').insert({
              mandataire_id: dossier.mandataire_id,
              dossier_id: dossier.id,
              type: 'commission',
              taux,
              montant: montantCommission,
              statut: 'due',
            } as any);

            const parrainId = (profile as any)?.parrain_id;
            if (parrainId) {
              const bonusMontant = computeBonusParrainage(dossier.honoraires || 0);
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
          toast.success('Facturation et commission générées automatiquement');
        }
      } catch (err: any) {
        toast.error(err?.message || 'Erreur lors du déplacement');
      }
    },
    [dossiers, updateMut, qc]
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {isAdmin ? 'Pipeline Réseau' : 'Mon Pipeline'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {isAdmin
                ? 'Vue Kanban — appui long sur mobile, glisser-déposer sur ordinateur'
                : 'Suivi de mes dossiers par étape'}
            </p>
          </div>
          <DossierDialog />
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-[260px] sm:w-[240px] h-64 rounded-xl flex-shrink-0" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDossier(null)}
          >
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              {pipelineStatuses.map((status) => {
                const statusDossiers = dossiers.filter((d) => d.status === status);
                return (
                  <DroppableColumn key={status} status={status} count={statusDossiers.length}>
                    {statusDossiers.map((d, idx) => (
                      <DraggableCard key={d.id} dossier={d} idx={idx} />
                    ))}
                    {statusDossiers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-6">Aucun dossier</p>
                    )}
                  </DroppableColumn>
                );
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 200 }}>
              {activeDossier && (
                <div className="bg-background rounded-lg border p-3 shadow-2xl ring-2 ring-accent rotate-2 w-[220px]">
                  <p className="text-sm font-medium text-foreground truncate">
                    {activeDossier.client_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {activeDossier.ville || '—'}
                  </p>
                  <span className="text-xs font-medium text-foreground">
                    {(activeDossier.budget || 0).toLocaleString('fr-FR')} €
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </AppLayout>
  );
}
