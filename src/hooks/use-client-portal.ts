import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ClientToken {
  id: string;
  dossier_id: string;
  token: string;
  client_name: string;
  client_email: string | null;
  expires_at: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export function useClientTokens(dossierId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['client-tokens', dossierId],
    queryFn: async () => {
      let q = supabase.from('client_tokens').select('*').order('created_at', { ascending: false });
      if (dossierId) q = q.eq('dossier_id', dossierId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ClientToken[];
    },
    enabled: !!user,
  });
}

export function useCreateClientToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { dossier_id: string; client_name: string; client_email?: string; created_by: string }) => {
      const { data, error } = await supabase.from('client_tokens').insert(payload as any).select().single();
      if (error) throw error;
      return data as ClientToken;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client-tokens', vars.dossier_id] });
      toast.success('Lien d\'accès client généré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRevokeClientToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dossierId }: { id: string; dossierId: string }) => {
      const { error } = await supabase.from('client_tokens').update({ is_active: false } as any).eq('id', id);
      if (error) throw error;
      return dossierId;
    },
    onSuccess: (dossierId) => {
      qc.invalidateQueries({ queryKey: ['client-tokens', dossierId] });
      toast.success('Lien révoqué');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Public fetch for the portal (no auth needed) — uses a single secure RPC
// that validates the token server-side and returns only authorized data.
export async function fetchPortalData(token: string) {
  const { data, error } = await (supabase as any).rpc('get_portal_payload', { _token: token });
  if (error || !data) throw new Error('Lien invalide ou expiré');

  const payload = data as any;

  // Parse strategie IA si disponible
  let strategie: any = null;
  try {
    const raw = payload?.dossier?.strategie;
    if (raw && typeof raw === 'object' && raw.synthese) {
      strategie = raw;
    } else if (typeof raw === 'string' && raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.synthese) strategie = parsed;
    }
  } catch { strategie = null; }

  return {
    token: payload.token,
    dossier: payload.dossier,
    biens: payload.biens || [],
    chantiers: payload.chantiers || [],
    lots: payload.lots || [],
    documents: payload.documents || [],
    evenements: payload.evenements || [],
    devis: payload.devis || [],
    strategie,
  };
}
