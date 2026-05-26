import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Justificatif {
  path: string;
  name: string;
  uploaded_at: string;
  heures?: number;
}

export interface Conformite {
  id: string;
  mandataire_id: string;
  annee: number;
  heures_formation_annee: number;
  justificatifs: Justificatif[];
  statut_formation: 'conforme' | 'en_cours' | 'non_conforme';
  attestation_debut: string | null;
  attestation_fin: string | null;
  statut_attestation: 'valide' | 'expirante' | 'expiree' | 'inactive';
  suspendu: boolean;
  created_at: string;
  updated_at: string;
}

export function useConformite(mandataireId: string | undefined, annee?: number) {
  const year = annee ?? new Date().getFullYear();
  return useQuery({
    enabled: !!mandataireId,
    queryKey: ['conformite', mandataireId, year],
    queryFn: async (): Promise<Conformite | null> => {
      const { data, error } = await (supabase.from('conformite_mandataires' as any) as any)
        .select('*')
        .eq('mandataire_id', mandataireId)
        .eq('annee', year)
        .maybeSingle();
      if (error) throw error;
      return data ? { ...(data as any), justificatifs: (data as any).justificatifs || [] } : null;
    },
  });
}

export function useAllConformites() {
  return useQuery({
    queryKey: ['conformite', 'all'],
    queryFn: async (): Promise<Conformite[]> => {
      const year = new Date().getFullYear();
      const { data, error } = await (supabase.from('conformite_mandataires' as any) as any)
        .select('*')
        .eq('annee', year);
      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, justificatifs: d.justificatifs || [] }));
    },
  });
}

export function useUpsertConformite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Conformite> & { mandataire_id: string; annee?: number }) => {
      const row: any = { ...input, annee: input.annee ?? new Date().getFullYear() };
      const { data, error } = await (supabase.from('conformite_mandataires' as any) as any)
        .upsert(row, { onConflict: 'mandataire_id,annee' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conformite'] });
      toast.success('Conformité mise à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export async function uploadJustificatif(mandataireId: string, file: File) {
  const path = `${mandataireId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('conformite-justificatifs').upload(path, file);
  if (error) throw error;
  return path;
}

export async function getJustificatifUrl(path: string) {
  const { data } = await supabase.storage.from('conformite-justificatifs').createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
