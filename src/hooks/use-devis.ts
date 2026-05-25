import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DevisStatut = 'brouillon' | 'envoye' | 'accepte' | 'refuse';

export interface DevisLigne {
  service: 'conseil' | 'chasse' | 'amo' | 'deco';
  label: string;
  base: number;
  detail: string;
  montant_ht: number;
}

export interface Devis {
  id: string;
  dossier_id: string;
  numero: string | null;
  date_emission: string;
  montant_ht: number;
  remise_pack: number;
  tva_taux: number;
  montant_ttc: number;
  statut: DevisStatut;
  pack_actif: boolean;
  contenu: { lignes: DevisLigne[] };
  created_at: string;
}

export function useDevis(dossierId: string | undefined) {
  return useQuery({
    enabled: !!dossierId,
    queryKey: ['devis', dossierId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('devis' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Devis[];
    },
  });
}

export function useSaveDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Devis> & { dossier_id: string }) => {
      const row = {
        ...payload,
        numero: payload.numero || `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      };
      const { data, error } = await (supabase.from('devis' as any) as any)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as Devis;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['devis', d.dossier_id] });
      toast.success('Devis enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDevisStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut, dossier_id }: { id: string; statut: DevisStatut; dossier_id: string }) => {
      const { error } = await (supabase.from('devis' as any) as any)
        .update({ statut })
        .eq('id', id);
      if (error) throw error;
      return { id, dossier_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['devis', d.dossier_id] });
      toast.success('Statut mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
