import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Facture {
  id: string;
  mandataire_id: string | null;
  dossier_id: string | null;
  montant: number;
  type: string;
  statut: string;
  date_emission: string;
  date_paiement: string | null;
  reference: string | null;
  created_at: string;
  mandataire_name?: string;
  mandataire_zone?: string;
}

export function useFactures() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['factures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factures')
        .select('*, profiles!factures_mandataire_id_fkey(full_name, zone)')
        .order('date_emission', { ascending: false });

      if (error) throw error;

      return (data || []).map((f: any) => ({
        ...f,
        montant: Number(f.montant) || 0,
        mandataire_name: f.profiles?.full_name || 'N/A',
        mandataire_zone: f.profiles?.zone || '',
      })) as Facture[];
    },
    enabled: !!user,
  });
}

export function useCreateFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (facture: Partial<Facture>) => {
      const { data, error } = await supabase.from('factures').insert(facture as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture créée');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Facture> & { id: string }) => {
      const { error } = await supabase.from('factures').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture mise à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
