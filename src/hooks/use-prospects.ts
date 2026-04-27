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

interface ProfileLite {
  id: string;
  full_name: string | null;
}

export function useProspects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async (): Promise<Prospect[]> => {
      const { data, error } = await supabase
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as Prospect[];
      const ids = [...new Set(rows.map((d) => d.mandataire_id).filter((v): v is string => !!v))];

      const profiles: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        ((p as ProfileLite[] | null) ?? []).forEach((pr) => {
          profiles[pr.id] = pr.full_name ?? '';
        });
      }

      return rows.map((d) => ({
        ...d,
        budget_estime: Number(d.budget_estime) || 0,
        mandataire_name: d.mandataire_id ? profiles[d.mandataire_id] || 'Non assigné' : 'Non assigné',
      }));
    },
    enabled: !!user,
  });
}

type ProspectInput = Omit<Partial<Prospect>, 'mandataire_name' | 'id' | 'created_at' | 'updated_at'>;

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: ProspectInput) => {
      const payload = { nom: prospect.nom ?? '', ...prospect };
      const { data, error } = await supabase
        .from('prospects')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect créé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProspectInput & { id: string }) => {
      const { data, error } = await supabase
        .from('prospects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Prospect;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('prospects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      toast.success('Prospect supprimé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useConvertProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: Prospect) => {
      // Crée le dossier à partir du prospect
      const { data: dossier, error: dErr } = await supabase
        .from('dossiers')
        .insert({
          client_name: prospect.nom,
          email: prospect.email,
          phone: prospect.telephone,
          budget: prospect.budget_estime,
          mandataire_id: prospect.mandataire_id,
          notes: prospect.objectif ? `Objectif: ${prospect.objectif}\n${prospect.notes || ''}` : prospect.notes,
          status: 'nouveau',
        })
        .select()
        .single();
      if (dErr) throw dErr;

      await supabase
        .from('prospects')
        .update({ statut: 'converti', dossier_id: dossier.id, updated_at: new Date().toISOString() })
        .eq('id', prospect.id);

      return dossier;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Prospect converti en dossier');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
