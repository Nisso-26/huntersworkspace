import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { partnerPortalProfile, type PartnerProfile } from '@/lib/partner-portal-profile';

export interface AccesPortail {
  id: string;
  dossier_id: string;
  partenaire_id: string;
  token: string;
  scope_lecture: string[];
  scope_decision: string[];
  nature_validation: string | null;
  date_generation: string;
  date_expiration: string;
  date_revocation: string | null;
  nb_ouvertures_max: number | null;
  nb_ouvertures_effectuees: number;
}

export interface DecisionPartenaire {
  id: string;
  acces_portail_id: string;
  verdict: 'quitus' | 'invalidation';
  justification: string;
  proposition_alternative: string | null;
  date_decision: string | null;
}

export interface QuitusRow {
  id: string;
  dossier_id: string;
  decision_id: string;
  contenu: Record<string, any>;
  date_generation: string;
}

// Le scope est déterminé par la spécialité du partenaire — pas de liberté mandataire.
export function scopesForSpecialite(specialite?: string | null): {
  scope_lecture: string[];
  scope_decision: string[];
  famille: 'montage' | 'financement';
  profil: PartnerProfile;
  peutProposer: 'strategie' | 'montage_financier' | null;
  natureValidation: string;
  labelQuitus: string;
  labelInvalidation: string;
} {
  const config = partnerPortalProfile(specialite);
  return {
    scope_lecture: [...config.scope_lecture],
    scope_decision: [...config.scope_decision],
    famille: config.famille,
    profil: config.profile,
    peutProposer: config.peutProposer,
    natureValidation: config.natureValidation,
    labelQuitus: config.labelQuitus,
    labelInvalidation: config.labelInvalidation,
  };
}

export function useAccesPortail(dossierId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['acces-portail', dossierId],
    enabled: !!user && !!dossierId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('acces_portail' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId!)
        .order('date_generation', { ascending: false });
      if (error) throw error;
      return (data || []) as AccesPortail[];
    },
  });
}

export function useCreateAccesPortail() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      dossier_id: string;
      partenaire_id: string;
      specialite?: string | null;
      jours: number;
      nb_ouvertures_max: number;
      nature_validation: string;
    }) => {
      const scopes = scopesForSpecialite(payload.specialite);
      const expiration = new Date(Date.now() + payload.jours * 24 * 3600 * 1000).toISOString();
      const { data, error } = await (supabase.from('acces_portail' as any) as any)
        .insert({
          dossier_id: payload.dossier_id,
          partenaire_id: payload.partenaire_id,
          scope_lecture: scopes.scope_lecture,
          scope_decision: scopes.scope_decision,
          nature_validation: payload.nature_validation,
          date_expiration: expiration,
          nb_ouvertures_max: payload.nb_ouvertures_max,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: errDossier } = await supabase
        .from('dossiers')
        .update({ sous_statut: 'en_attente_partenaire' } as any)
        .eq('id', payload.dossier_id);
      if (errDossier) throw errDossier;

      return data as AccesPortail;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['acces-portail', vars.dossier_id] });
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Accès partenaire généré — copiez le lien pour le transmettre');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRevokeAccesPortail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dossierId }: { id: string; dossierId: string }) => {
      const { error } = await (supabase.from('acces_portail' as any) as any)
        .update({ date_revocation: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return dossierId;
    },
    onSuccess: (dossierId) => {
      qc.invalidateQueries({ queryKey: ['acces-portail', dossierId] });
      toast.success('Accès révoqué');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useQuitusDossier(dossierId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['quitus', dossierId],
    enabled: !!user && !!dossierId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('quitus' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId!)
        .order('date_generation', { ascending: false });
      if (error) throw error;
      return (data || []) as QuitusRow[];
    },
  });
}

// Dernière décision partenaire du dossier (pour afficher une invalidation motivée)
export function useDerniereDecision(dossierId?: string) {
  const { data: acces = [] } = useAccesPortail(dossierId);
  const ids = acces.map((a) => a.id);
  return useQuery({
    queryKey: ['decisions-partenaire', dossierId, ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from('decisions_partenaire' as any) as any)
        .select('*')
        .in('acces_portail_id', ids)
        .not('date_decision', 'is', null)
        .order('date_decision', { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data || [])[0] || null) as DecisionPartenaire | null;
    },
  });
}

// ─── API publique du portail (sans compte) ───────────────────────────────────
export async function fetchPartnerPortal(token: string) {
  const [{ data, error }, { data: decisionContext }] = await Promise.all([
    (supabase as any).rpc('get_partner_portal_payload', { _token: token }),
    (supabase as any).rpc('get_partner_portal_decision_context', { _token: token }),
  ]);
  if (error) throw new Error('invalide');
  if (!data) return null;
  return { ...data, dossier: { ...(data.dossier || {}), ...(decisionContext || {}) } } as any;
}

export async function logPartnerConsultation(token: string, section: string) {
  try {
    await (supabase as any).rpc('log_partner_consultation', { _token: token, _section: section });
  } catch { /* silencieux */ }
}

export async function startPartnerDecision(token: string, verdict: string, justification: string, propositionAlternative?: string | null) {
  const { data, error } = await (supabase as any).rpc('start_partner_decision', {
    _token: token,
    _verdict: verdict,
    _justification: justification,
    _proposition_alternative: propositionAlternative ?? null,
    _api_version: 'proposition_alternative_v1',
  });
  if (error) throw new Error(error.message);
  return data as { decision_id: string; code: string };
}

export async function submitPartnerDecision(
  token: string,
  decisionId: string,
  code: string,
  propositionAlternative?: string | null,
  ip?: string | null,
) {
  const { data, error } = await (supabase as any).rpc('submit_partner_decision', {
    _token: token,
    _decision_id: decisionId,
    _code: code,
    _ip: ip ?? null,
    _proposition_alternative: propositionAlternative ?? null,
    _api_version: 'proposition_alternative_v1',
  });
  if (error) throw new Error(error.message);
  return data as any;
}
