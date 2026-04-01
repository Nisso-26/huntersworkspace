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
}

export function useMandataires() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['mandataires'],
    queryFn: async () => {
      // Get all users with mandataire role
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

      // Get dossier counts and CA per mandataire
      const { data: dossiers } = await supabase
        .from('dossiers')
        .select('mandataire_id, honoraires, status');

      return (profiles || []).map(p => {
        const mandDossiers = (dossiers || []).filter((d: any) => d.mandataire_id === p.id);
        const activeDossiers = mandDossiers.filter((d: any) => !['cloture', 'signe'].includes(d.status));
        const caTotal = mandDossiers
          .filter((d: any) => ['signe', 'compromis'].includes(d.status))
          .reduce((sum: number, d: any) => sum + (Number(d.honoraires) || 0), 0);

        return {
          ...p,
          role: 'mandataire',
          dossiers_count: activeDossiers.length,
          ca_total: caTotal,
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
