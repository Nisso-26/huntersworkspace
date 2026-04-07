import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Prospect {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  source: string;
  budget_estime: number;
  objectif: string | null;
  notes: string | null;
  mandataire_id: string | null;
  statut: string;
  motif_perte: string | null;
  dossier_id: string | null;
  created_at: string;
  updated_at: string;
  mandataire_name?: string;
}

export function useProspects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prospects' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).map((d: any) => d.mandataire_id).filter(Boolean))];
      let profiles: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (p || []).forEach((pr: any) => { profiles[pr.id] = pr.full_name || ''; });
      }

      return (data || []).map((d: any) => ({
        ...d,
        budget_estime: Number(d.budget_estime) || 0,
        mandataire_name: profiles[d.mandataire_id] || 'Non assigné',
      })) as Prospect[];
    },
    enabled: !!user,
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: Partial<Prospect>) => {
      const { data, error } = await supabase.from('prospects' as any).insert(prospect as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects'] }); toast.success('Prospect créé'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prospect> & { id: string }) => {
      const { data, error } = await supabase
        .from('prospects' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects'] }); toast.success('Prospect mis à jour'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prospects' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prospects'] }); toast.success('Prospect supprimé'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useConvertProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: Prospect) => {
      // Create dossier from prospect
      const { data: dossier, error: dErr } = await supabase.from('dossiers').insert({
        client_name: prospect.nom,
        email: prospect.email,
        phone: prospect.telephone,
        budget: prospect.budget_estime,
        mandataire_id: prospect.mandataire_id,
        notes: prospect.objectif ? `Objectif: ${prospect.objectif}\n${prospect.notes || ''}` : prospect.notes,
        status: 'nouveau',
      } as any).select().single();
      if (dErr) throw dErr;

      // Update prospect with dossier link
      await supabase.from('prospects' as any)
        .update({ statut: 'converti', dossier_id: (dossier as any).id, updated_at: new Date().toISOString() } as any)
        .eq('id', prospect.id);

      return dossier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Prospect converti en dossier');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
