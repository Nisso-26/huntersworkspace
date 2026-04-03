import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Dossier {
  id: string;
  client_name: string;
  email: string | null;
  phone: string | null;
  mandataire_id: string | null;
  status: string;
  budget: number;
  ville: string | null;
  strategie: string | null;
  honoraires: number;
  etape: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  mandataire_name?: string;
  mandataire_zone?: string;
}

export function useDossiers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dossiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossiers')
        .select('*, profiles(full_name, zone)')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        ...d,
        budget: Number(d.budget) || 0,
        honoraires: Number(d.honoraires) || 0,
        mandataire_name: d.profiles?.full_name || 'Non assigné',
        mandataire_zone: d.profiles?.zone || '',
      })) as Dossier[];
    },
    enabled: !!user,
  });
}

export function useCreateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dossier: Partial<Dossier>) => {
      const { data, error } = await supabase.from('dossiers').insert(dossier as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier créé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dossier> & { id: string }) => {
      const { data, error } = await supabase
        .from('dossiers')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dossiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
