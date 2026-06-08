import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useObjectifsReseauCourant } from '@/hooks/use-objectifs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const statutColor: Record<string, string> = {
  atteint: 'bg-hunters-success/10 text-hunters-success',
  en_cours: 'bg-hunters-warning/10 text-hunters-warning',
  insuffisant: 'bg-destructive/10 text-destructive',
};
const statutLabel: Record<string, string> = {
  atteint: 'Atteint', en_cours: 'En cours', insuffisant: 'Insuffisant',
};

export default function ObjectifsReseauTable() {
  const { data = [], isLoading } = useObjectifsReseauCourant();
  const qc = useQueryClient();
  const [computing, setComputing] = useState(false);

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  const t3 = data.filter(r => r.objectif.trimestres_rates_consecutifs >= 3);
  const t2 = data.filter(r => r.objectif.trimestres_rates_consecutifs === 2);
  const t1 = data.filter(r => r.objectif.trimestres_rates_consecutifs === 1);

  const handleCompute = async () => {
    setComputing(true);
    const { data: res, error } = await supabase.rpc('compute_objectif_trimestre');
    setComputing(false);
    if (error) { toast.error(error.message); return; }
    const r = res as any;
    toast.success(`Calcul terminé — ${r?.atteints ?? 0} atteints · ${r?.insuffisants ?? 0} insuffisants`);
    qc.invalidateQueries({ queryKey: ['objectifs-reseau-courant'] });
    qc.invalidateQueries({ queryKey: ['objectif-trimestre'] });
  };

  return (
    <div className="space-y-4">
      {/* Bannière politique de prix */}
      <div className="p-3 rounded-sm border-2 border-destructive bg-destructive/5 text-sm text-destructive font-medium">
        ⚠️ Politique de prix : le conseil patrimonial se facture toujours au tarif plein. Aucune remise autorisée, y compris en pack clé en main.
      </div>

      {/* Alertes prioritaires */}
      {(t3.length + t2.length + t1.length) > 0 && (
        <div className="space-y-2">
          {t3.length > 0 && (
            <div className="p-3 rounded-sm border-2 border-destructive bg-destructive/10 text-sm font-semibold text-destructive flex items-center gap-2">
              🔴 {t3.length} mandataire(s) en T3 consécutif raté — initier procédure de résiliation : {t3.map(r => r.profile.full_name).join(', ')}
            </div>
          )}
          {t2.length > 0 && (
            <div className="p-3 rounded-sm border border-destructive bg-destructive/5 text-sm font-medium text-destructive flex items-center gap-2">
              🔴 {t2.length} mandataire(s) en T2 consécutif raté (leads bloqués) : {t2.map(r => r.profile.full_name).join(', ')}
            </div>
          )}
          {t1.length > 0 && (
            <div className="p-3 rounded-sm border border-hunters-warning bg-hunters-warning/10 text-sm text-hunters-warning font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4"/> {t1.length} mandataire(s) en T1 raté — entretien à planifier : {t1.map(r => r.profile.full_name).join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border/60 shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between gap-2">
          <h2 className="font-heading font-semibold text-sm">Objectifs du trimestre — Réseau</h2>
          <Button size="sm" variant="outline" onClick={handleCompute} disabled={computing}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', computing && 'animate-spin')} />
            Calculer maintenant
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mandataire</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>CA trimestre</TableHead>
              <TableHead>Mandats</TableHead>
              <TableHead>Conseils</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Ratés</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(({ profile, objectif: o }) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {profile.full_name}
                  {o.leads_bloques && <Lock className="w-3 h-3 text-destructive"/>}
                </TableCell>
                <TableCell>{profile.niveau || 'N1'}</TableCell>
                <TableCell>{o.ca_realise.toLocaleString('fr-FR')} / {o.ca_objectif.toLocaleString('fr-FR')} €</TableCell>
                <TableCell>{o.mandats_realises} / {o.mandats_objectif}</TableCell>
                <TableCell>{o.conseils_realises} / {o.conseils_objectif}</TableCell>
                <TableCell>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutColor[o.statut])}>
                    {statutLabel[o.statut]}
                  </span>
                </TableCell>
                <TableCell>
                  {o.trimestres_rates_consecutifs > 0 ? (
                    <span className={cn('text-xs font-semibold', o.trimestres_rates_consecutifs >= 2 ? 'text-destructive' : 'text-hunters-warning')}>
                      {o.trimestres_rates_consecutifs}
                    </span>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">Aucun mandataire</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
