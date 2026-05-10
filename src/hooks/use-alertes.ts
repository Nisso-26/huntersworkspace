import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Alerte {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  detail: string | null;
  is_read: boolean;
  target_date: string | null;
  dossier_id: string | null;
  created_at: string;
}

export function useAlertes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['alertes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Alerte[];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alertes').update({ is_read: true } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alertes'] }),
  });
}

export function useCreateAlerte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alerte: Partial<Alerte>) => {
      const { error } = await supabase.from('alertes').insert(alerte as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alertes'] });
      toast.success('Alerte créée');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
