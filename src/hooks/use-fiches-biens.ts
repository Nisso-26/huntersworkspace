import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const FICHES_BIENS_BUCKET = 'fiches-biens-photos';

export type TypeProjet = 'residence_principale' | 'locatif' | 'achat_revente';
export type StatutFiche = 'brouillon' | 'prete' | 'envoyee';
export type RolePhoto = 'couverture' | 'galerie' | 'avant' | 'apres';
export type OriginePhoto = 'visite' | 'annonce' | 'televersement';

export const TYPE_PROJET_LABELS: Record<TypeProjet, string> = {
  residence_principale: 'Résidence principale',
  locatif: 'Locatif',
  achat_revente: 'Achat-revente',
};
export const STATUT_FICHE_LABELS: Record<StatutFiche, string> = {
  brouillon: 'Brouillon', prete: 'Prête', envoyee: 'Envoyée',
};

export interface Travail { libelle: string; montant_min: number | null; montant_max: number | null }

export interface FicheBien {
  id: string; dossier_id: string; bien_id: string | null; mandataire_id: string;
  created_at: string; updated_at: string;
  type_projet: TypeProjet; statut: StatutFiche;
  source_url: string | null; description_source: string | null;
  titre: string | null; ville: string | null; code_postal: string | null; quartier: string | null;
  prix_affiche: number | null; surface_habitable: number | null; surface_terrain: number | null;
  nb_pieces: number | null; nb_chambres: number | null; etage: string | null; ascenseur: boolean | null;
  niveaux: number | null; exposition: string | null; chauffage: string | null; annee_construction: number | null;
  exterieur: string | null; stationnement: string | null; annexes: string | null; sanitaires: string | null;
  dpe_classe: string | null; dpe_kwh: number | null; ges_classe: string | null;
  cout_energie_min: number | null; cout_energie_max: number | null;
  charges_copro_annuelles: number | null; taxe_fonciere: number | null;
  lecture_bien: string | null; phrase_cle: string | null; points_forts: string[]; points_vigilance: string[];
  projet_texte: string | null; travaux: Travail[]; duree_detention_mois: number | null; prix_revente_vise: number | null;
  interet_constate: boolean;
  hypotheses?: Record<string, any>; bilan?: Record<string, any> | null; criteres_eval?: Record<string, any>;
}

export interface FichePhoto {
  id: string; fiche_id: string; storage_path: string; ordre: number;
  legende: string | null; role: RolePhoto; origine: OriginePhoto; url?: string;
}

/** Type de projet par défaut déduit du dossier (toujours modifiable). */
export function typeProjetDepuisDossier(d: any): TypeProjet {
  if (!d) return 'residence_principale';
  if (['revenus_complementaires', 'constitution_patrimoine'].includes(d.objectif_principal)) return 'locatif';
  if (d.type_location_souhaite) return 'locatif';
  return 'residence_principale';
}

const T = () => supabase.from('fiches_biens' as any) as any;
const P = () => supabase.from('fiches_biens_photos' as any) as any;

export function useFichesBiens(dossierId: string) {
  return useQuery({
    queryKey: ['fiches-biens', dossierId],
    queryFn: async () => {
      const { data, error } = await T().select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false });
      if (error) throw error;
      const fiches = (data || []) as FicheBien[];
      const ids = fiches.map(f => f.id);
      const covers: Record<string, string> = {};
      if (ids.length) {
        const { data: photos } = await P().select('*').in('fiche_id', ids).order('ordre');
        const byFiche: Record<string, FichePhoto> = {};
        for (const p of (photos || []) as FichePhoto[]) {
          if (p.role === 'couverture' || !byFiche[p.fiche_id]) byFiche[p.fiche_id] = byFiche[p.fiche_id]?.role === 'couverture' ? byFiche[p.fiche_id] : p;
        }
        const paths = Object.values(byFiche).map(p => p.storage_path);
        if (paths.length) {
          const { data: signed } = await supabase.storage.from(FICHES_BIENS_BUCKET).createSignedUrls(paths, 3600);
          for (const [fid, p] of Object.entries(byFiche)) {
            const s = signed?.find(x => x.path === p.storage_path);
            if (s?.signedUrl) covers[fid] = s.signedUrl;
          }
        }
      }
      return fiches.map(f => ({ ...f, cover_url: covers[f.id] as string | undefined }));
    },
  });
}

export function useFichePhotos(ficheId: string | null) {
  return useQuery({
    queryKey: ['fiche-photos', ficheId],
    enabled: !!ficheId,
    queryFn: async () => {
      const { data, error } = await P().select('*').eq('fiche_id', ficheId).order('ordre');
      if (error) throw error;
      const photos = (data || []) as FichePhoto[];
      if (photos.length) {
        const { data: signed } = await supabase.storage.from(FICHES_BIENS_BUCKET)
          .createSignedUrls(photos.map(p => p.storage_path), 3600);
        photos.forEach(p => { p.url = signed?.find(s => s.path === p.storage_path)?.signedUrl ?? undefined; });
      }
      return photos;
    },
  });
}

export function useCreateFicheBien() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<FicheBien> & { dossier_id: string; mandataire_id?: string | null }) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await T()
        .insert({ ...payload, mandataire_id: payload.mandataire_id || user.id })
        .select().single();
      if (error) throw error;
      return data as FicheBien;
    },
    onSuccess: (f) => qc.invalidateQueries({ queryKey: ['fiches-biens', f.dossier_id] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFicheBien() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<FicheBien> & { id: string }) => {
      const { data, error } = await T().update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as FicheBien;
    },
    onSuccess: (f) => qc.invalidateQueries({ queryKey: ['fiches-biens', f.dossier_id] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFicheBien() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: { id: string; dossier_id: string }) => {
      const { data: photos } = await P().select('storage_path').eq('fiche_id', f.id);
      const paths = (photos || []).map((p: any) => p.storage_path);
      if (paths.length) await supabase.storage.from(FICHES_BIENS_BUCKET).remove(paths);
      const { error } = await T().delete().eq('id', f.id);
      if (error) throw error;
      return f;
    },
    onSuccess: (f) => { qc.invalidateQueries({ queryKey: ['fiches-biens', f.dossier_id] }); toast.success('Fiche supprimée'); },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Appelle l'extraction. Renvoie { erreur: 'lecture_impossible' } si la page n'a pas pu être lue. */
export async function extraireAnnonce(body: { url?: string; texte?: string; fiche_id?: string }) {
  const { data, error } = await supabase.functions.invoke('extract-annonce', { body });
  if (error) {
    let msg = error.message;
    try { const t = await (error as any).context?.text?.(); msg = JSON.parse(t)?.message || msg; } catch { /* */ }
    throw new Error(msg);
  }
  return data as { ok?: boolean; erreur?: string; fiche?: Partial<FicheBien>; description_source?: string; photos_importees?: number };
}
