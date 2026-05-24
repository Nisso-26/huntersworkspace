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
  // Validate token via secure RPC (no direct table access for anon)
  const { data: tokenRows, error: tokenError } = await (supabase as any)
    .rpc('get_portal_token', { _token: token });

  const tokenData = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;
  if (tokenError || !tokenData) throw new Error('Lien invalide ou expiré');

  // Marque la consultation pour le suivi de relance automatique (best-effort)
  try {
    await (supabase as any).rpc('mark_portal_token_viewed', { _token: token });
  } catch (_) { /* ignore */ }

  const dossierId = tokenData.dossier_id;

  // Fetch dossier via secure RPC (excludes PII like email/phone)
  const { data: dossier } = await supabase.rpc('get_dossier_for_portal', { _dossier_id: dossierId });
  const { data: dossierExtra } = await (supabase.from('dossiers') as any).select('numero_dossier').eq('id', dossierId).maybeSingle();
  const dossierWithNumero = dossier ? { ...(dossier as any), numero_dossier: dossierExtra?.numero_dossier || null } : dossier;
  
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

  // Parse strategie IA si disponible
  let strategie = null;
  try {
    const raw = (dossier as any)?.strategie;
    if (raw && typeof raw === 'object' && (raw as any).synthese) {
      strategie = raw;
    } else if (typeof raw === 'string' && raw.startsWith('{')) {
      const parsed = JSON.parse(raw);
      if (parsed.synthese) strategie = parsed;
    }
  } catch { strategie = null; }

  return {
    token: tokenData,
    dossier: dossierWithNumero,
    biens: biens || [],
    chantiers,
    lots,
    documents: documents || [],
    evenements: evenements || [],
    strategie,
  };
}
