import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Evenement {
  id: string;
  titre: string;
  type: string;
  date_debut: string;
  date_fin: string;
  lieu: string | null;
  dossier_id: string | null;
  mandataire_id: string;
  notes: string | null;
  rappel: string | null;
  is_reseau: boolean;
  created_at: string;
  updated_at: string;
  // joined
  mandataire_name?: string;
  dossier_name?: string;
}

export function useEvenements() {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`evenements-${user.id}`)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'evenements' }, () => {
        qc.invalidateQueries({ queryKey: ['evenements'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ['evenements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .order('date_debut', { ascending: true })
        .limit(200);
      if (error) throw error;

      // Fetch mandataire names
      const mandIds = [...new Set((data || []).map(e => e.mandataire_id).filter(Boolean))];
      let profilesMap: Record<string, string> = {};
      if (mandIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', mandIds);
        (profiles || []).forEach(p => { profilesMap[p.id] = p.full_name || 'Inconnu'; });
      }

      // Fetch dossier names
      const dossierIds = [...new Set((data || []).map(e => e.dossier_id).filter(Boolean))];
      let dossiersMap: Record<string, string> = {};
      if (dossierIds.length > 0) {
        const { data: dossiers } = await supabase
          .from('dossiers')
          .select('id, client_name')
          .in('id', dossierIds as string[]);
        (dossiers || []).forEach(d => { dossiersMap[d.id] = d.client_name; });
      }

      return (data || []).map((e: any) => ({
        ...e,
        mandataire_name: profilesMap[e.mandataire_id] || 'Inconnu',
        dossier_name: e.dossier_id ? dossiersMap[e.dossier_id] || '' : '',
      })) as Evenement[];
    },
    enabled: !!user,
  });
}

export function useCreateEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evt: Partial<Evenement>) => {
      const { data, error } = await supabase.from('evenements').insert(evt as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements'] });
      toast.success('Événement créé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Evenement> & { id: string }) => {
      const { error } = await supabase
        .from('evenements')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements'] });
      toast.success('Événement mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('evenements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements'] });
      toast.success('Événement supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
