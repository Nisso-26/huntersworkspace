import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabase-pagination';

export interface Bien {
  id: string;
  reference: string;
  type: string;
  adresse: string | null;
  ville: string | null;
  code_postal: string | null;
  surface: number;
  prix_acquisition: number;
  frais_notaire: number;
  budget_travaux: number;
  loyer_mensuel_cible: number;
  regime_fiscal: string;
  statut: string;
  dossier_id: string | null;
  mandataire_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  mandataire_name?: string;
  dossier_client?: string;
}

export function useBiens() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['biens'],
    queryFn: async () => {
      const data = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from('biens')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to),
      );

      const mandataireIds = [...new Set((data || []).map(b => b.mandataire_id).filter(Boolean))];
      const dossierIds = [...new Set((data || []).map(b => b.dossier_id).filter(Boolean))];

      let profilesMap: Record<string, string> = {};
      let dossiersMap: Record<string, string> = {};

      if (mandataireIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', mandataireIds);
        (profiles || []).forEach(p => { profilesMap[p.id] = p.full_name || 'Inconnu'; });
      }
      if (dossierIds.length > 0) {
        const { data: dossiers } = await supabase.from('dossiers').select('id, client_name').in('id', dossierIds);
        (dossiers || []).forEach(d => { dossiersMap[d.id] = d.client_name; });
      }

      return (data || []).map((b: any) => ({
        ...b,
        surface: Number(b.surface) || 0,
        prix_acquisition: Number(b.prix_acquisition) || 0,
        frais_notaire: Number(b.frais_notaire) || 0,
        budget_travaux: Number(b.budget_travaux) || 0,
        loyer_mensuel_cible: Number(b.loyer_mensuel_cible) || 0,
        mandataire_name: profilesMap[b.mandataire_id] || 'Non assigné',
        dossier_client: dossiersMap[b.dossier_id] || '',
      })) as Bien[];
    },
    enabled: !!user,
  });
}

export function useCreateBien() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bien: Partial<Bien>) => {
      const { data, error } = await supabase.from('biens').insert(bien as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biens'] });
      toast.success('Bien immobilier ajouté avec succès');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateBien() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bien> & { id: string }) => {
      const { data, error } = await supabase
        .from('biens')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biens'] });
      toast.success('Bien immobilier mis à jour avec succès');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteBien() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('biens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['biens'] });
      toast.success('Bien immobilier supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
