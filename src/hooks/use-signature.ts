import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SignatureRequest {
  id: string;
  dossier_id: string;
  document_type: string;
  document_name: string;
  status: string;
  yousign_id: string | null;
  signer_name: string;
  signer_email: string;
  signed_at: string | null;
  signed_document_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const DOC_TYPES = [
  { value: 'mandat_recherche', label: 'Mandat de recherche' },
  { value: 'contrat_conseil', label: 'Contrat conseil' },
  { value: 'contrat_chantier', label: 'Contrat chantier' },
  { value: 'contrat_deco', label: 'Contrat décoration' },
];

const STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  en_attente: 'En attente de signature',
  signe: 'Signé',
  refuse: 'Refusé',
  expire: 'Expiré',
};

export { DOC_TYPES, STATUS_LABELS };

export function useSignatureRequests(dossierId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['signature-requests', dossierId],
    queryFn: async () => {
      let q = supabase.from('signature_requests').select('*').order('created_at', { ascending: false });
      if (dossierId) q = q.eq('dossier_id', dossierId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SignatureRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateSignatureRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<SignatureRequest>) => {
      const { data, error } = await supabase.from('signature_requests').insert(payload as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['signature-requests', vars.dossier_id] });
      toast.success('Demande de signature créée');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateSignatureStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, dossierId }: { id: string; status: string; dossierId: string }) => {
      const { error } = await supabase.from('signature_requests')
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      return dossierId;
    },
    onSuccess: (dossierId) => {
      qc.invalidateQueries({ queryKey: ['signature-requests', dossierId] });
      toast.success('Statut mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
