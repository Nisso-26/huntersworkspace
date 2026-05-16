import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TarifService {
  id: string;
  service_key: string;
  label: string;
  tarif_base: number;
  unite: string;
  tva_taux: number;
  ordre: number;
}

export const UNITE_LABELS: Record<string, string> = {
  forfait: 'Forfait €',
  pourcentage_achat: "% prix d'achat",
  pourcentage_travaux: '% montant travaux',
  pourcentage_loyer: '% loyer mensuel',
};

export function useTarifsServices() {
  return useQuery({
    queryKey: ['tarifs_services'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('tarifs_services' as any) as any)
        .select('*')
        .order('ordre');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        tarif_base: Number(t.tarif_base) || 0,
        tva_taux: Number(t.tva_taux) || 20,
      })) as TarifService[];
    },
  });
}

export function useUpdateTarif() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<TarifService> & { id: string }) => {
      const { id, ...rest } = t;
      const { error } = await (supabase.from('tarifs_services' as any) as any)
        .update(rest)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarifs_services'] });
      toast.success('Tarif enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
