import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

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
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channelName = `alertes-realtime-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertes' }, () => {
        qc.invalidateQueries({ queryKey: ['alertes'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ['alertes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alertes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Alerte[];
    },
    enabled: !!user,
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
