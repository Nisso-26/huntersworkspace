import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ZoneMandataire {
  id: string;
  mandataire_id: string;
  zone_id: number;
  zone_label: string;
  communes: string[];
  perimetre_km: number;
  statut: string;
  date_affectation: string;
  affectee_par: string | null;
  created_at: string;
}

export function useZonesMandataires(mandataireId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['zones_mandataires', mandataireId ?? 'all'],
    queryFn: async (): Promise<ZoneMandataire[]> => {
      let query = supabase.from('zones_mandataires').select('*').order('zone_label');
      if (mandataireId) query = query.eq('mandataire_id', mandataireId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ZoneMandataire[];
    },
    enabled: !!user,
  });
}

export interface NewZone {
  mandataire_id: string;
  zone_label: string;
  statut: 'prioritaire' | 'exclusive';
  perimetre_km?: number;
  communes?: string[];
}

export function useCreateZone() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (zone: NewZone) => {
      const { data: last } = await supabase
        .from('zones_mandataires')
        .select('zone_id')
        .order('zone_id', { ascending: false })
        .limit(1);
      const nextId = (last?.[0]?.zone_id ?? 0) + 1;
      const { error } = await supabase.from('zones_mandataires').insert({
        mandataire_id: zone.mandataire_id,
        zone_label: zone.zone_label.trim(),
        statut: zone.statut,
        perimetre_km: zone.perimetre_km ?? 25,
        communes: zone.communes ?? [],
        zone_id: nextId,
        affectee_par: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones_mandataires'] });
      toast.success('Zone assignée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('zones_mandataires').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones_mandataires'] });
      toast.success('Zone retirée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
