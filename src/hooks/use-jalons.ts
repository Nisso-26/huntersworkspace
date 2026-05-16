import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Jalon {
  id: string;
  dossier_id: string;
  libelle: string;
  pourcentage: number;
  ordre: number;
  statut: string;
  facture_id: string | null;
}

export function useJalons(dossierId?: string) {
  return useQuery({
    queryKey: ['jalons', dossierId],
    queryFn: async () => {
      if (!dossierId) return [];
      const { data, error } = await (supabase.from('jalons_facturation' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId)
        .order('ordre');
      if (error) throw error;
      return (data || []).map((j: any) => ({ ...j, pourcentage: Number(j.pourcentage) || 0 })) as Jalon[];
    },
    enabled: !!dossierId,
  });
}

export function useSaveJalons() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dossierId, jalons }: { dossierId: string; jalons: Omit<Jalon, 'id'>[] }) => {
      // Replace all
      await (supabase.from('jalons_facturation' as any) as any).delete().eq('dossier_id', dossierId);
      if (jalons.length === 0) return;
      const rows = jalons.map((j, i) => ({ ...j, dossier_id: dossierId, ordre: i }));
      const { error } = await (supabase.from('jalons_facturation' as any) as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['jalons', v.dossierId] });
      toast.success('Jalons enregistrés');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateJalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Jalon> & { id: string }) => {
      const { error } = await (supabase.from('jalons_facturation' as any) as any).update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jalons'] }),
  });
}
