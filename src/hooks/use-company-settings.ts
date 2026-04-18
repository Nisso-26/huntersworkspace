import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CompanySettings {
  id: string;
  raison_sociale: string;
  forme_juridique: string;
  siret: string;
  carte_t_numero: string;
  carte_t_organisme: string;
  carte_t_expiration: string | null;
  assureur_rcp: string;
  assureur_police: string;
  adresse_siege: string;
  telephone: string;
  email_contact: string;
  site_web: string;
  taux_commission_siege: number;
  tarif_abonnement_defaut: number;
  periode_essai_jours: number;
  delai_suspension_jours: number;
  logo_url: string | null;
  couleur_primaire: string;
  couleur_secondaire: string;
  clause_mediation: string;
  clause_rgpd: string;
  clause_retractation: string;
  mentions_legales: string;
  entete_document: string;
  pied_page_document: string;
  email_alertes_dirigeant: string;
  frequence_rapport: string;
  tva_taux_defaut: number;
  iban: string;
  bic: string;
  numero_tva_intra: string;
  capital_social: string;
  rcs: string;
}

export interface HonorairesTranche {
  id: string;
  prix_min: number;
  prix_max: number | null;
  taux: number;
  montant_minimum: number;
  ordre: number;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string | null;
  section: string;
  action: string;
  details: any;
  created_at: string;
}

export function useCompanySettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as CompanySettings;
    },
    enabled: !!user,
  });
}

export function useUpdateCompanySettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ section, updates }: { section: string; updates: Partial<CompanySettings> }) => {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .single();
      if (!settings) throw new Error('Settings not found');

      const { error } = await supabase
        .from('company_settings')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', settings.id);
      if (error) throw error;

      // Audit log
      await supabase.from('settings_audit_log').insert({
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        section,
        action: 'update',
        details: updates,
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Paramètres enregistrés');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useHonorairesTranches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['honoraires-tranches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('honoraires_tranches')
        .select('*')
        .order('ordre', { ascending: true });
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        prix_min: Number(t.prix_min),
        prix_max: t.prix_max ? Number(t.prix_max) : null,
        taux: Number(t.taux),
        montant_minimum: Number(t.montant_minimum),
      })) as HonorairesTranche[];
    },
    enabled: !!user,
  });
}

export function useSaveHonorairesTranches() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tranches: Omit<HonorairesTranche, 'id'>[]) => {
      // Delete existing
      const { error: delErr } = await supabase.from('honoraires_tranches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) throw delErr;
      // Insert new
      const { error } = await supabase.from('honoraires_tranches').insert(
        tranches.map((t, i) => ({ ...t, ordre: i + 1 })) as any
      );
      if (error) throw error;

      await supabase.from('settings_audit_log').insert({
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        section: 'honoraires',
        action: 'update',
        details: { tranches_count: tranches.length },
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['honoraires-tranches'] });
      toast.success('Barème enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAuditLog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['settings-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as AuditLogEntry[];
    },
    enabled: !!user,
  });
}
