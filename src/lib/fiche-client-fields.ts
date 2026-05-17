// Champs étendus de la fiche client (table dossiers).
// Ce helper centralise les noms, valeurs par défaut, et conversions pour Supabase.

export const NUMERIC_FIELDS = [
  'revenus_nets_mensuels',
  'revenus_conjoint',
  'revenus_locatifs_existants',
  'autres_revenus',
  'charges_mensuelles_fixes',
  'capacite_epargne_mensuelle',
  'epargne_disponible',
  'apport_disponible',
  'revenus_fiscaux_reference',
  'impot_revenu_paye',
  'deficits_fonciers_existants',
  'residence_principale_valeur',
  'residence_principale_crd',
  'passif_total',
  'taux_endettement_actuel',
  'capacite_emprunt_estimee',
] as const;

export const INTEGER_FIELDS = ['nombre_enfants', 'tmi', 'duree_credit_souhaitee'] as const;
export const BOOLEAN_FIELDS = ['assujetti_ifi', 'deja_rencontre_banque'] as const;
export const JSONB_FIELDS = ['biens_locatifs_existants', 'epargne_financiere', 'credits_en_cours'] as const;

export const TEXT_FIELDS = [
  'date_naissance',
  'nationalite',
  'situation_familiale',
  'regime_matrimonial',
  'ages_enfants',
  'statut_professionnel',
  'profession',
  'secteur_activite',
  'anciennete_emploi',
  'residence_principale',
  'dispositifs_fiscaux_en_cours',
  'objectif_fiscal',
  'autres_actifs',
  'objectif_principal',
  'horizon_investissement',
  'appetence_risque',
  'contraintes_geographiques',
  'type_bien_souhaite',
  'type_location_souhaite',
  'aversion_gestion',
  'banque_principale',
  'preference_taux',
  'delai_concretisation',
  'contraintes_particulieres',
  'source_recommandation',
] as const;

export type FicheValues = Record<string, any>;

export function emptyFicheValues(): FicheValues {
  const v: FicheValues = {};
  for (const f of TEXT_FIELDS) v[f] = '';
  for (const f of NUMERIC_FIELDS) v[f] = '';
  for (const f of INTEGER_FIELDS) v[f] = '';
  for (const f of BOOLEAN_FIELDS) v[f] = false;
  for (const f of JSONB_FIELDS) v[f] = [];
  return v;
}

export function loadFicheFromDossier(d: any | null | undefined): FicheValues {
  const base = emptyFicheValues();
  if (!d) return base;
  for (const f of TEXT_FIELDS) base[f] = d[f] ?? '';
  for (const f of NUMERIC_FIELDS) base[f] = d[f] != null ? String(d[f]) : '';
  for (const f of INTEGER_FIELDS) base[f] = d[f] != null ? String(d[f]) : '';
  for (const f of BOOLEAN_FIELDS) base[f] = !!d[f];
  for (const f of JSONB_FIELDS) base[f] = Array.isArray(d[f]) ? d[f] : [];
  return base;
}

export function serializeFicheForSave(values: FicheValues): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of TEXT_FIELDS) out[f] = values[f]?.toString().trim() || null;
  for (const f of NUMERIC_FIELDS) {
    const v = values[f];
    out[f] = v === '' || v == null ? null : Number(v);
  }
  for (const f of INTEGER_FIELDS) {
    const v = values[f];
    out[f] = v === '' || v == null ? null : Math.round(Number(v));
  }
  for (const f of BOOLEAN_FIELDS) out[f] = !!values[f];
  for (const f of JSONB_FIELDS) out[f] = Array.isArray(values[f]) ? values[f] : [];
  return out;
}
