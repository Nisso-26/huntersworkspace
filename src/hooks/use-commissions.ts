import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Commission {
  id: string;
  mandataire_id: string;
  dossier_id: string | null;
  type: string;
  taux: number;
  montant: number;
  statut: string;
  created_at: string;
}

export function useCommissions(mandataireId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commissions', mandataireId],
    queryFn: async () => {
      let query = supabase.from('commissions').select('*').order('created_at', { ascending: false });
      if (mandataireId) {
        query = query.eq('mandataire_id', mandataireId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        taux: Number(c.taux) || 0,
        montant: Number(c.montant) || 0,
      })) as Commission[];
    },
    enabled: !!user,
  });
}
