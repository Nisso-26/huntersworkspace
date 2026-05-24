import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type BaremeService = 'conseil' | 'chasse' | 'amo' | 'deco';
export type BaremeType = 'forfait' | 'pourcentage';

export interface BaremeHunters {
  id: string;
  service: BaremeService;
  tranche_min: number;
  tranche_max: number | null;
  type: BaremeType;
  valeur: number;
  valeur_fixe: number;
  ordre: number;
}

export function useBaremesHunters() {
  return useQuery({
    queryKey: ['baremes_hunters'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('baremes_hunters' as any) as any)
        .select('*')
        .order('service')
        .order('ordre');
      if (error) throw error;
      return (data || []) as BaremeHunters[];
    },
  });
}

export function useSaveBaremesService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ service, rows }: { service: BaremeService; rows: Omit<BaremeHunters, 'id' | 'service'>[] }) => {
      // delete & re-insert for simplicity
      const del = await (supabase.from('baremes_hunters' as any) as any).delete().eq('service', service);
      if (del.error) throw del.error;
      const payload = rows.map((r, i) => ({ ...r, service, ordre: i + 1 }));
      const ins = await (supabase.from('baremes_hunters' as any) as any).insert(payload);
      if (ins.error) throw ins.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['baremes_hunters'] });
      toast.success('Barème enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
