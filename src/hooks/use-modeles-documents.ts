import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ModeleCategorie =
  | 'proposition_commerciale'
  | 'fiche_rentabilite'
  | 'mandat_recherche'
  | 'compte_rendu'
  | 'autre';

export interface ModeleSectionChamp {
  key: string;
  label: string;
  type: 'number' | 'calc' | 'text';
  defaut?: number | string;
  formule?: string;
  auto_from?: string;
}
export interface ModeleSection {
  id: string;
  type: 'header' | 'text' | 'services_conditionnels' | 'financier' | 'signatures';
  titre: string;
  contenu?: string;
  champs?: ModeleSectionChamp[];
  auto?: boolean;
}

export interface ModeleDocument {
  id: string;
  titre: string;
  categorie: ModeleCategorie;
  contenu_template: { sections: ModeleSection[] };
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export function useModelesDocuments(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = true } = opts;
  return useQuery({
    queryKey: ['modeles_documents', onlyActive],
    queryFn: async () => {
      let q = supabase.from('modeles_documents').select('*').order('titre');
      if (onlyActive) q = q.eq('actif', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as ModeleDocument[];
    },
  });
}

export function useSaveModele() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<ModeleDocument> & { id?: string }) => {
      if (m.id) {
        const { error } = await supabase
          .from('modeles_documents')
          .update({
            titre: m.titre,
            categorie: m.categorie,
            contenu_template: m.contenu_template as any,
            actif: m.actif,
          })
          .eq('id', m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('modeles_documents').insert({
          titre: m.titre!,
          categorie: m.categorie!,
          contenu_template: (m.contenu_template || { sections: [] }) as any,
          actif: m.actif ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modeles_documents'] });
      toast.success('Modèle enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteModele() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modeles_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modeles_documents'] });
      toast.success('Modèle supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDocumentsGeneriques(dossierId?: string) {
  return useQuery({
    queryKey: ['documents_generiques', dossierId],
    enabled: !!dossierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents_generiques')
        .select('*')
        .eq('dossier_id', dossierId!)
        .order('date_generation', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
