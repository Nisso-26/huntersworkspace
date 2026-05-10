import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MandataireProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  zone: string | null;
  status: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
  dossiers_count: number;
  ca_total: number;
  niveau: string | null;
  parrain_id: string | null;
  parrain_name: string | null;
  date_entree: string | null;
  pack_status: string | null;
  pack_montant: number;
  iban: string | null;
  commissions_dues: number;
  commissions_versees: number;
  bonus_parrainage: number;
  dossiers_signes: number;
  dossiers_clotures: number;
}

interface DossierRow {
  mandataire_id: string | null;
  honoraires: number | null;
  status: string;
}
interface CommissionRow {
  mandataire_id: string;
  type: string;
  montant: number;
  statut: string;
}

export function useMandataires() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mandataires'],
    queryFn: async (): Promise<MandataireProfile[]> => {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'mandataire');
      if (rolesErr) throw rolesErr;

      const userIds = (roles ?? []).map((r) => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      if (profErr) throw profErr;

      const { data: dossiersRaw } = await supabase
        .from('dossiers')
        .select('mandataire_id, honoraires, status')
        .in('mandataire_id', userIds);
      const dossiers = (dossiersRaw ?? []) as DossierRow[];

      const { data: commissionsRaw } = await supabase
        .from('commissions')
        .select('mandataire_id, type, montant, statut')
        .in('mandataire_id', userIds);
      const commissions = (commissionsRaw ?? []) as CommissionRow[];

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      return (profiles ?? []).map((p) => {
        const mandDossiers = dossiers.filter((d) => d.mandataire_id === p.id);
        const activeDossiers = mandDossiers.filter((d) => !['cloture', 'signe'].includes(d.status));
        const signes = mandDossiers.filter((d) => d.status === 'signe').length;
        const clotures = mandDossiers.filter((d) => d.status === 'cloture').length;
        const caTotal = mandDossiers
          .filter((d) => ['signe', 'compromis'].includes(d.status))
          .reduce((sum, d) => sum + (Number(d.honoraires) || 0), 0);

        const mandCommissions = commissions.filter((c) => c.mandataire_id === p.id);
        const commDues = mandCommissions
          .filter((c) => c.statut === 'due' && c.type === 'commission')
          .reduce((s, c) => s + Number(c.montant), 0);
        const commVersees = mandCommissions
          .filter((c) => c.statut === 'versee' && c.type === 'commission')
          .reduce((s, c) => s + Number(c.montant), 0);
        const bonusParrainage = mandCommissions
          .filter((c) => c.type === 'parrainage')
          .reduce((s, c) => s + Number(c.montant), 0);

        const parrainProfile = p.parrain_id ? profileMap.get(p.parrain_id) : null;

        return {
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          zone: p.zone,
          status: p.status,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          role: 'mandataire',
          niveau: p.niveau ?? 'N1',
          parrain_id: p.parrain_id ?? null,
          parrain_name: parrainProfile?.full_name ?? null,
          date_entree: p.date_entree ?? null,
          pack_status: p.pack_status ?? 'actif',
          pack_montant: Number(p.pack_montant) || 99,
          iban: p.iban ?? null,
          dossiers_count: activeDossiers.length,
          ca_total: caTotal,
          dossiers_signes: signes,
          dossiers_clotures: clotures,
          commissions_dues: commDues,
          commissions_versees: commVersees,
          bonus_parrainage: bonusParrainage,
        };
      });
    },
    enabled: !!user,
  });
}

export type ProfileUpdate = Partial<{
  full_name: string;
  email: string;
  zone: string;
  status: string;
  avatar_url: string;
  niveau: string;
  parrain_id: string | null;
  date_entree: string;
  pack_status: string;
  pack_montant: number;
  iban: string;
}>;

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ProfileUpdate & { id: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandataires'] });
      toast.success('Profil mis à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
