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

// Public fetch for the portal (no auth needed)
export async function fetchPortalData(token: string) {
  // Use anon key — no auth session
  const { data: tokenData, error: tokenError } = await supabase
    .from('client_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (tokenError || !tokenData) throw new Error('Lien invalide ou expiré');
  
  const now = new Date();
  if (new Date(tokenData.expires_at) < now) throw new Error('Lien expiré');

  const dossierId = tokenData.dossier_id;

  // Fetch dossier via secure RPC (excludes PII like email/phone)
  const { data: dossier } = await supabase.rpc('get_dossier_for_portal', { _dossier_id: dossierId });
  
  // Fetch biens
  const { data: biens } = await supabase.from('biens').select('*').eq('dossier_id', dossierId);
  
  // Fetch chantiers via biens
  const bienIds = (biens || []).map(b => b.id);
  let chantiers: any[] = [];
  if (bienIds.length > 0) {
    const { data } = await supabase.from('chantiers').select('*').in('bien_id', bienIds);
    chantiers = data || [];
  }

  // Fetch lots for chantiers
  const chantierIds = chantiers.map(c => c.id);
  let lots: any[] = [];
  if (chantierIds.length > 0) {
    const { data } = await supabase.from('lots_travaux').select('*').in('chantier_id', chantierIds);
    lots = data || [];
  }

  // Fetch documents
  const { data: documents } = await supabase.from('documents').select('*').eq('dossier_id', dossierId);

  // Fetch events
  const { data: evenements } = await supabase.from('evenements').select('*').eq('dossier_id', dossierId).order('date_debut', { ascending: true });

  return {
    token: tokenData,
    dossier,
    biens: biens || [],
    chantiers,
    lots,
    documents: documents || [],
    evenements: evenements || [],
  };
}
