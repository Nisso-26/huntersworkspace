import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabase-pagination';

export interface Dossier {
  id: string;
  numero_dossier: string | null;
  client_name: string;
  email: string | null;
  phone: string | null;
  mandataire_id: string | null;
  status: string;
  budget: number;
  ville: string | null;
  strategie: string | Record<string, any> | null;
  honoraires: number;
  etape: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  mandataire_name?: string;
  mandataire_zone?: string;
}

export function useDossiers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dossiers'],
    queryFn: async () => {
      const data = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from('dossiers')
          .select('*')
          .order('updated_at', { ascending: false })
          .range(from, to),
      );

      // Fetch mandataire names separately
      const mandataireIds = [...new Set((data || []).map(d => d.mandataire_id).filter(Boolean))];
      let profilesMap: Record<string, { full_name: string | null; zone: string | null }> = {};
      
      if (mandataireIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, zone')
          .in('id', mandataireIds);
        
        (profiles || []).forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name, zone: p.zone };
        });
      }

      return (data || []).map((d: any) => ({
        ...d,
        budget: Number(d.budget) || 0,
        honoraires: Number(d.honoraires) || 0,
        mandataire_name: profilesMap[d.mandataire_id]?.full_name || 'Non assigné',
        mandataire_zone: profilesMap[d.mandataire_id]?.zone || '',
      })) as Dossier[];
    },
    enabled: !!user,
  });
}

async function notifyAssignment(mandataireId: string, clientName: string, numeroDossier?: string | null) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', mandataireId)
      .maybeSingle();
    if (!profile?.email) return;
    const refLine = numeroDossier ? `<p style="margin:0 0 8px;color:#555;font-size:13px;">Référence dossier : <strong>${numeroDossier}</strong></p>` : '';
    await supabase.functions.invoke('send-notification', {
      body: {
        to: profile.email,
        subject: `Nouveau dossier assigné : ${clientName}${numeroDossier ? ` (${numeroDossier})` : ''}`,
        numero_dossier: numeroDossier || null,
        body: `<h2 style="color:#1A4D2E;margin:0 0 16px;">Nouveau dossier assigné</h2>
          ${refLine}
          <p>Bonjour ${profile.full_name || ''},</p>
          <p>Un nouveau dossier vous a été assigné : <strong>${clientName}</strong>${numeroDossier ? ` — réf. <strong>${numeroDossier}</strong>` : ''}.</p>
          <p>Connectez-vous à votre espace Hunters pour le consulter.</p>`,
      },
    });
  } catch (e) {
    console.error('notifyAssignment failed', e);
  }
}

export function useCreateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dossier: Partial<Dossier>) => {
      const { data, error } = await supabase.from('dossiers').insert(dossier as any).select().single();
      if (error) throw error;
      if (data?.mandataire_id && data?.client_name) {
        notifyAssignment(data.mandataire_id, data.client_name, (data as any).numero_dossier);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier client créé avec succès');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dossier> & { id: string }) => {
      let previousMandataireId: string | null = null;
      if ('mandataire_id' in updates) {
        const { data: prev } = await supabase
          .from('dossiers')
          .select('mandataire_id')
          .eq('id', id)
          .maybeSingle();
        previousMandataireId = prev?.mandataire_id ?? null;
      }
      const { data, error } = await supabase
        .from('dossiers')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      if (
        'mandataire_id' in updates &&
        data?.mandataire_id &&
        data.mandataire_id !== previousMandataireId &&
        data.client_name
      ) {
        notifyAssignment(data.mandataire_id, data.client_name);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier mis à jour avec succès');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDossier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dossiers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success('Dossier supprimé avec succès');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
