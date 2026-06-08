import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ObjectifTrimestriel = {
  id: string;
  mandataire_id: string;
  annee: number;
  trimestre: number;
  ca_objectif: number;
  ca_realise: number;
  mandats_objectif: number;
  mandats_realises: number;
  conseils_objectif: number;
  conseils_realises: number;
  statut: 'en_cours' | 'atteint' | 'insuffisant';
  trimestres_rates_consecutifs: number;
  leads_bloques: boolean;
  updated_at: string;
};

export type ConseilMensuel = {
  id: string;
  mandataire_id: string;
  annee: number;
  mois: number;
  nb_conseils_objectif: number;
  nb_conseils_realises: number;
  statut: 'en_cours' | 'atteint' | 'insuffisant';
};

export const currentTrimestre = (d = new Date()) => Math.floor(d.getMonth() / 3) + 1;

export function useObjectifTrimestre(mandataireId?: string, annee?: number, trimestre?: number) {
  const _annee = annee ?? new Date().getFullYear();
  const _trim = trimestre ?? currentTrimestre();
  return useQuery({
    queryKey: ['objectif-trimestre', mandataireId, _annee, _trim],
    enabled: !!mandataireId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('compute_objectif_trimestre' as any, {
        _mandataire_id: mandataireId,
        _annee,
        _trimestre: _trim,
      });
      if (error) throw error;
      return data as unknown as ObjectifTrimestriel;
    },
  });
}

export function useHistoriqueObjectifs(mandataireId?: string, count = 4) {
  return useQuery({
    queryKey: ['objectifs-historique', mandataireId, count],
    enabled: !!mandataireId,
    queryFn: async () => {
      // refresh des 4 derniers trimestres
      const now = new Date();
      const trims: { annee: number; trimestre: number }[] = [];
      let y = now.getFullYear(), q = currentTrimestre(now);
      for (let i = 0; i < count; i++) {
        trims.push({ annee: y, trimestre: q });
        q -= 1; if (q < 1) { q = 4; y -= 1; }
      }
      await Promise.all(trims.map(t =>
        supabase.rpc('compute_objectif_trimestre' as any, {
          _mandataire_id: mandataireId, _annee: t.annee, _trimestre: t.trimestre,
        })
      ));
      const { data, error } = await supabase
        .from('objectifs_trimestriels' as any)
        .select('*')
        .eq('mandataire_id', mandataireId!)
        .order('annee', { ascending: false })
        .order('trimestre', { ascending: false })
        .limit(count);
      if (error) throw error;
      return (data || []) as unknown as ObjectifTrimestriel[];
    },
  });
}

export function useConseilsMois(mandataireId?: string, annee?: number) {
  const _annee = annee ?? new Date().getFullYear();
  return useQuery({
    queryKey: ['conseils-mois', mandataireId, _annee],
    enabled: !!mandataireId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conseils_mensuels' as any)
        .select('*')
        .eq('mandataire_id', mandataireId!)
        .eq('annee', _annee);
      if (error) throw error;
      return (data || []) as unknown as ConseilMensuel[];
    },
  });
}

export function useUpsertConseilMois() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { mandataire_id: string; annee: number; mois: number; nb_conseils_realises: number; nb_conseils_objectif?: number }) => {
      const { error } = await supabase.from('conseils_mensuels' as any).upsert({
        mandataire_id: p.mandataire_id,
        annee: p.annee,
        mois: p.mois,
        nb_conseils_realises: p.nb_conseils_realises,
        nb_conseils_objectif: p.nb_conseils_objectif ?? 1,
        statut: p.nb_conseils_realises >= (p.nb_conseils_objectif ?? 1) ? 'atteint' : 'insuffisant',
      }, { onConflict: 'mandataire_id,annee,mois' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conseils-mois'] });
      qc.invalidateQueries({ queryKey: ['objectif-trimestre'] });
      qc.invalidateQueries({ queryKey: ['objectifs-historique'] });
      toast.success('Conseil enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Pour la vue directeur : récupère le trimestre courant pour tous les mandataires actifs */
export function useObjectifsReseauCourant() {
  return useQuery({
    queryKey: ['objectifs-reseau-courant'],
    queryFn: async () => {
      const annee = new Date().getFullYear();
      const trimestre = currentTrimestre();
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, niveau, status')
        .neq('status', 'résilie' as any);
      const list = (profs || []) as any[];
      const results = await Promise.all(list.map(async (p) => {
        const { data } = await supabase.rpc('compute_objectif_trimestre' as any, {
          _mandataire_id: p.id, _annee: annee, _trimestre: trimestre,
        });
        return { profile: p, objectif: data as unknown as ObjectifTrimestriel };
      }));
      return results.filter(r => r.objectif);
    },
  });
}
