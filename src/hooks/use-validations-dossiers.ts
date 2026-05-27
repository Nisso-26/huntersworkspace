import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ValidationStatut = 'en_attente' | 'valide' | 'refuse' | 'infos_demandees';

export interface ValidationDossier {
  id: string;
  dossier_id: string;
  statut: ValidationStatut;
  decideur_id: string | null;
  motif: string | null;
  score_client?: number | null;
  tarif_conseil_calcule?: number | null;
  created_at: string;
  updated_at: string;
  // enrichis client-side
  client_name?: string;
  numero_dossier?: string | null;
  mandataire_id?: string | null;
  mandataire_name?: string | null;
  score_qualification?: number | null;
  niveau_qualification?: string | null;
  tarif_conseil_ht?: number | null;
  criteres_qualification?: Record<string, boolean> | null;
}

export function useValidationsEnAttente() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!user && isAdmin,
    queryKey: ['validations_dossiers', 'en_attente'],
    queryFn: async (): Promise<ValidationDossier[]> => {
      const { data: vals, error } = await (supabase.from('validations_dossiers' as any) as any)
        .select('*')
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: true });
      if (error) throw error;
      const ids = [...new Set((vals || []).map((v: any) => v.dossier_id as string))] as string[];
      if (ids.length === 0) return [];
      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('id, client_name, numero_dossier, mandataire_id, score_qualification, niveau_qualification, tarif_conseil_ht')
        .in('id', ids);
      const mIds = [...new Set((dossiers || []).map(d => d.mandataire_id).filter(Boolean))] as string[];
      const profMap: Record<string, string> = {};
      if (mIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', mIds);
        (profs || []).forEach(p => { profMap[p.id] = p.full_name || ''; });
      }
      const dMap = new Map((dossiers || []).map(d => [d.id, d]));
      return (vals || []).map((v: any) => {
        const d = dMap.get(v.dossier_id);
        return {
          ...v,
          client_name: d?.client_name,
          numero_dossier: d?.numero_dossier,
          mandataire_id: d?.mandataire_id,
          mandataire_name: d?.mandataire_id ? profMap[d.mandataire_id] : null,
          score_qualification: d?.score_qualification,
          niveau_qualification: d?.niveau_qualification,
          tarif_conseil_ht: d?.tarif_conseil_ht,
        } as ValidationDossier;
      });
    },
  });

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel('validations-admin-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validations_dossiers' }, () => {
        qc.invalidateQueries({ queryKey: ['validations_dossiers'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, qc]);

  return query;
}

// Pour le mandataire : sa dernière validation d'un dossier donné
export function useValidationDossier(dossierId: string | undefined) {
  return useQuery({
    enabled: !!dossierId,
    queryKey: ['validation_dossier', dossierId],
    queryFn: async (): Promise<ValidationDossier | null> => {
      const { data, error } = await (supabase.from('validations_dossiers' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useDecideValidation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; statut: Exclude<ValidationStatut, 'en_attente'>; motif?: string }) => {
      const { error } = await supabase.rpc('decide_validation_dossier' as any, {
        _validation_id: input.id,
        _statut: input.statut,
        _motif: input.motif || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['validations_dossiers'] });
      qc.invalidateQueries({ queryKey: ['validation_dossier'] });
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      qc.invalidateQueries({ queryKey: ['alertes'] });
      toast.success('Décision enregistrée');
    },
    onError: (e: any) => toast.error(e.message || 'Erreur'),
  });
}

// Subscribe mandataire side — toast realtime when a decision is made
export function useValidationRealtimeForMandataire() {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user || role !== 'mandataire') return;
    const ch = supabase
      .channel('validations-mand-' + Math.random().toString(36).slice(2, 8))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'validations_dossiers' }, async (payload) => {
        const newRow: any = payload.new;
        if (!newRow?.dossier_id) return;
        const { data: d } = await supabase
          .from('dossiers')
          .select('mandataire_id, client_name')
          .eq('id', newRow.dossier_id)
          .maybeSingle();
        if (d?.mandataire_id !== user.id) return;
        qc.invalidateQueries({ queryKey: ['dossiers'] });
        qc.invalidateQueries({ queryKey: ['validation_dossier', newRow.dossier_id] });
        qc.invalidateQueries({ queryKey: ['alertes'] });
        if (newRow.statut === 'valide') toast.success(`Dossier ${d.client_name} validé par le directeur`);
        else if (newRow.statut === 'refuse') toast.error(`Dossier ${d.client_name} refusé`, { description: newRow.motif });
        else if (newRow.statut === 'infos_demandees') toast.warning(`Infos complémentaires demandées — ${d.client_name}`, { description: newRow.motif });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, role, qc]);
}
