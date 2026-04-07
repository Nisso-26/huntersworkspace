import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Partenaire {
  id: string;
  nom: string;
  societe: string | null;
  specialite: string;
  ville: string | null;
  telephone: string | null;
  email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  dossiers_count?: number;
}

export function usePartenaires() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['partenaires'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partenaires' as any)
        .select('*')
        .order('nom');
      if (error) throw error;

      // Count dossiers per partenaire
      const { data: links } = await supabase.from('partenaire_dossiers' as any).select('partenaire_id');
      const counts: Record<string, number> = {};
      (links || []).forEach((l: any) => { counts[l.partenaire_id] = (counts[l.partenaire_id] || 0) + 1; });

      return (data || []).map((p: any) => ({ ...p, dossiers_count: counts[p.id] || 0 })) as Partenaire[];
    },
    enabled: !!user,
  });
}

export function useCreatePartenaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Partenaire>) => {
      const { data, error } = await supabase.from('partenaires' as any).insert(p as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partenaires'] }); toast.success('Partenaire ajouté'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePartenaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Partenaire> & { id: string }) => {
      const { data, error } = await supabase
        .from('partenaires' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partenaires'] }); toast.success('Partenaire mis à jour'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePartenaire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('partenaires' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partenaires'] }); toast.success('Partenaire supprimé'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useLinkPartenaireDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partenaire_id, dossier_id, role_dans_dossier }: { partenaire_id: string; dossier_id: string; role_dans_dossier: string }) => {
      const { error } = await supabase.from('partenaire_dossiers' as any).insert({ partenaire_id, dossier_id, role_dans_dossier } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partenaires'] }); toast.success('Partenaire lié au dossier'); },
    onError: (e: any) => toast.error(e.message),
  });
}
