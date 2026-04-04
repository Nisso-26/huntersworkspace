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
  // New fields
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

export function useMandataires() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mandataires'],
    queryFn: async () => {
      const { data: roles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'mandataire');
      if (rolesErr) throw rolesErr;

      const userIds = (roles || []).map(r => r.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);
      if (profErr) throw profErr;

      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('mandataire_id, honoraires, status');

      const { data: commissions } = await supabase
        .from('commissions')
        .select('mandataire_id, type, montant, statut');

      // Build parrain name map
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (profiles || []).map(p => {
        const mandDossiers = (dossiers || []).filter((d: any) => d.mandataire_id === p.id);
        const activeDossiers = mandDossiers.filter((d: any) => !['cloture', 'signe'].includes(d.status));
        const signes = mandDossiers.filter((d: any) => d.status === 'signe').length;
        const clotures = mandDossiers.filter((d: any) => d.status === 'cloture').length;
        const caTotal = mandDossiers
          .filter((d: any) => ['signe', 'compromis'].includes(d.status))
          .reduce((sum: number, d: any) => sum + (Number(d.honoraires) || 0), 0);

        const mandCommissions = (commissions || []).filter((c: any) => c.mandataire_id === p.id);
        const commDues = mandCommissions.filter((c: any) => c.statut === 'due' && c.type === 'commission').reduce((s: number, c: any) => s + Number(c.montant), 0);
        const commVersees = mandCommissions.filter((c: any) => c.statut === 'versee' && c.type === 'commission').reduce((s: number, c: any) => s + Number(c.montant), 0);
        const bonusParrainage = mandCommissions.filter((c: any) => c.type === 'parrainage').reduce((s: number, c: any) => s + Number(c.montant), 0);

        const parrainProfile = (p as any).parrain_id ? profileMap.get((p as any).parrain_id) : null;

        return {
          ...p,
          role: 'mandataire',
          niveau: (p as any).niveau || 'N1',
          parrain_id: (p as any).parrain_id || null,
          parrain_name: parrainProfile ? (parrainProfile as any).full_name : null,
          date_entree: (p as any).date_entree || null,
          pack_status: (p as any).pack_status || 'actif',
          pack_montant: Number((p as any).pack_montant) || 99,
          iban: (p as any).iban || null,
          dossiers_count: activeDossiers.length,
          ca_total: caTotal,
          dossiers_signes: signes,
          dossiers_clotures: clotures,
          commissions_dues: commDues,
          commissions_versees: commVersees,
          bonus_parrainage: bonusParrainage,
        } as MandataireProfile;
      });
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mandataires'] });
      toast.success('Profil mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
