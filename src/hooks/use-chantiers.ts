import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LotTravaux {
  id: string;
  chantier_id: string;
  designation: string;
  artisan: string | null;
  contact_artisan: string | null;
  montant_devis: number;
  montant_facture: number;
  montant_engage: number;
  avancement: number;
  statut: string;
  date_prevue: string | null;
  created_at: string;
}

export interface AchatDeco {
  id: string;
  chantier_id: string;
  designation: string;
  fournisseur: string | null;
  reference_produit: string | null;
  montant: number;
  prix_unitaire: number;
  quantite: number;
  statut_livraison: string;
  lien_produit: string | null;
  piece: string | null;
  date_commande: string | null;
  date_livraison_estimee: string | null;
  date_livraison_reelle: string | null;
  created_at: string;
}

export interface VisiteChantier {
  id: string;
  chantier_id: string;
  date_visite: string;
  personnes_presentes: string | null;
  observations: string | null;
  points_vigilance: string | null;
  prochaines_actions: { action: string; responsable: string; deadline: string }[];
  created_by: string;
  created_at: string;
  photos?: PhotoVisite[];
}

export interface PhotoVisite {
  id: string;
  visite_id: string;
  file_name: string;
  file_path: string;
  legende: string | null;
  created_at: string;
}

export interface Chantier {
  id: string;
  reference: string;
  bien_id: string | null;
  mandataire_id: string | null;
  date_debut_prevue: string | null;
  date_debut_reelle: string | null;
  date_fin_prevue: string | null;
  date_fin_reelle: string | null;
  budget_alloue: number;
  statut: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  bien_reference?: string;
  bien_ville?: string;
  mandataire_name?: string;
  lots?: LotTravaux[];
  achats?: AchatDeco[];
  visites?: VisiteChantier[];
  budget_consomme?: number;
  total_deco?: number;
}

export function useChantiers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chantiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chantiers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const ids = (data || []).map(c => c.id);
      let lotsMap: Record<string, LotTravaux[]> = {};
      let achatsMap: Record<string, AchatDeco[]> = {};
      let visitesMap: Record<string, VisiteChantier[]> = {};

      if (ids.length > 0) {
        const [lotsRes, achatsRes, visitesRes] = await Promise.all([
          supabase.from('lots_travaux').select('*').in('chantier_id', ids),
          supabase.from('achats_deco').select('*').in('chantier_id', ids),
          supabase.from('visites_chantier').select('*').in('chantier_id', ids).order('date_visite', { ascending: false }),
        ]);

        (lotsRes.data || []).forEach((l: any) => {
          if (!lotsMap[l.chantier_id]) lotsMap[l.chantier_id] = [];
          lotsMap[l.chantier_id].push({
            ...l,
            montant_devis: Number(l.montant_devis),
            montant_facture: Number(l.montant_facture),
            montant_engage: Number(l.montant_engage || 0),
            avancement: Number(l.avancement || 0),
          });
        });

        (achatsRes.data || []).forEach((a: any) => {
          if (!achatsMap[a.chantier_id]) achatsMap[a.chantier_id] = [];
          achatsMap[a.chantier_id].push({
            ...a,
            montant: Number(a.montant),
            prix_unitaire: Number(a.prix_unitaire || 0),
            quantite: Number(a.quantite || 1),
          });
        });

        (visitesRes.data || []).forEach((v: any) => {
          if (!visitesMap[v.chantier_id]) visitesMap[v.chantier_id] = [];
          visitesMap[v.chantier_id].push({
            ...v,
            prochaines_actions: Array.isArray(v.prochaines_actions) ? v.prochaines_actions : [],
          });
        });

        // Fetch photos for all visites
        const allVisiteIds = (visitesRes.data || []).map((v: any) => v.id);
        if (allVisiteIds.length > 0) {
          const { data: photos } = await supabase.from('photos_visite').select('*').in('visite_id', allVisiteIds);
          (photos || []).forEach((p: any) => {
            for (const cId of Object.keys(visitesMap)) {
              const visite = visitesMap[cId]?.find(v => v.id === p.visite_id);
              if (visite) {
                if (!visite.photos) visite.photos = [];
                visite.photos.push(p);
                break;
              }
            }
          });
        }
      }

      const bienIds = [...new Set((data || []).map(c => c.bien_id).filter(Boolean))];
      const mandIds = [...new Set((data || []).map(c => c.mandataire_id).filter(Boolean))];
      let bienMap: Record<string, any> = {};
      let profMap: Record<string, any> = {};

      if (bienIds.length > 0) {
        const { data: biens } = await supabase.from('biens').select('id, reference, ville').in('id', bienIds as string[]);
        (biens || []).forEach((b: any) => { bienMap[b.id] = b; });
      }
      if (mandIds.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', mandIds as string[]);
        (profs || []).forEach((p: any) => { profMap[p.id] = p; });
      }

      return (data || []).map(c => {
        const lots = lotsMap[c.id] || [];
        const achats = achatsMap[c.id] || [];
        const visites = visitesMap[c.id] || [];
        return {
          ...c,
          budget_alloue: Number(c.budget_alloue),
          bien_reference: bienMap[c.bien_id!]?.reference || '',
          bien_ville: bienMap[c.bien_id!]?.ville || '',
          mandataire_name: profMap[c.mandataire_id!]?.full_name || '',
          lots,
          achats,
          visites,
          budget_consomme: lots.reduce((s, l) => s + l.montant_facture, 0),
          total_deco: achats.reduce((s, a) => s + a.montant, 0),
        } as Chantier;
      });
    },
    enabled: !!user,
  });
}

export function useCreateChantier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chantier: Partial<Chantier>) => {
      const { error } = await supabase.from('chantiers').insert(chantier as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Suivi travaux créé avec succès'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateChantier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('chantiers').update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Suivi travaux mis à jour avec succès'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// Lots
export function useCreateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lot: Partial<LotTravaux>) => {
      const { error } = await supabase.from('lots_travaux').insert(lot as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Lot ajouté'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('lots_travaux').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteLot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lots_travaux').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Lot supprimé'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// Achats deco
export function useCreateAchat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (achat: Partial<AchatDeco>) => {
      const { error } = await supabase.from('achats_deco').insert(achat as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Achat ajouté'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateAchat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('achats_deco').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteAchat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('achats_deco').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Achat supprimé'); },
    onError: (e: any) => toast.error(e.message),
  });
}

// Visites
export function useCreateVisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visite: Partial<VisiteChantier>) => {
      const { error } = await supabase.from('visites_chantier').insert(visite as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Visite ajoutée'); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteVisite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('visites_chantier').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chantiers'] }); toast.success('Visite supprimée'); },
    onError: (e: any) => toast.error(e.message),
  });
}
