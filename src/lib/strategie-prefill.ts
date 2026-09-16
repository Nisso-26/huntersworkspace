// Pré-remplissage du formulaire de stratégie patrimoniale depuis les colonnes
// de la table `dossiers` (mêmes colonnes que src/lib/fiche-client-fields.ts).
// Les valeurs restent locales au formulaire : aucune écriture vers `dossiers`.

export interface StrategieFormValues {
  age: string;
  situation_familiale: string;
  enfants: string;
  profession: string;
  statut_pro: string;
  revenus_nets_mensuels: string;
  revenus_conjoint_mensuels: string;
  autres_revenus_mensuels: string;
  tmi: string;
  charges_mensuelles: string;
  mensualites_credits: string;
  loyer_mensuel: string;
  epargne_disponible: string;
  capacite_epargne: string;
  patrimoine_immo: string;
  taux_credit: string;
  duree_credit: string;
  objectifs: string;
  horizon: string;
  revenu_cible: string;
  implication: string;
  tolerance_risque: string;
  zones_souhaitees: string;
  types_biens: string;
  delai_decision: string;
}

export const TMI_OPTIONS = ['0', '11', '30', '41', '45'];
export const HORIZON_OPTIONS = ['Court terme (< 5 ans)', 'Moyen terme (5-10 ans)', 'Long terme (> 10 ans)'];
export const RISQUE_OPTIONS = ['Faible', 'Modérée', 'Élevée'];
export const SITUATION_OPTIONS = ['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/veuve'];
export const STATUT_PRO_OPTIONS = ['Salarié CDI', 'Fonctionnaire', 'TNS', 'Gérant', 'Retraité', 'Autre'];


// La fiche dossier stocke des valeurs techniques (slugs) : on les traduit vers
// les libellés attendus par les listes déroulantes de ce formulaire.
const SLUG_MAPS: Record<string, Record<string, string>> = {
  situation_familiale: { celibataire: 'Célibataire', marie: 'Marié(e)', pacse: 'Pacsé(e)', divorce: 'Divorcé(e)', veuf: 'Veuf/veuve' },
  statut_pro: { salarie: 'Salarié CDI', tns: 'TNS', fonctionnaire: 'Fonctionnaire', retraite: 'Retraité', sans_activite: 'Autre' },
  horizon: { court: 'Court terme (< 5 ans)', moyen: 'Moyen terme (5-10 ans)', long: 'Long terme (> 10 ans)' },
  tolerance_risque: { prudent: 'Faible', equilibre: 'Modérée', dynamique: 'Élevée' },
};

const FREE_TEXT_LABELS: Record<string, Record<string, string>> = {
  objectifs: {
    revenus_complementaires: 'Revenus complémentaires',
    constitution_patrimoine: 'Constitution de patrimoine',
    retraite: 'Préparation retraite',
    transmission: 'Transmission',
    reduction_fiscale: 'Réduction fiscale',
  },
  types_biens: { appartement: 'Appartement', maison: 'Maison', immeuble: 'Immeuble', local_commercial: 'Local commercial' },
  implication: { delegue_tout: 'Délègue tout', gere_en_partie: 'Gère en partie', gere_tout: 'Gère tout seul' },
  delai_decision: { urgent: 'Urgent', '3_mois': '< 3 mois', '6_mois': '< 6 mois', '1_an': '< 1 an', flexible: 'Flexible' },
};

const humanize = (field: string, v: any): string => {
  if (!v) return '';
  const s = String(v).trim();
  return FREE_TEXT_LABELS[field]?.[s] ?? s;
};

export function emptyStrategieForm(): StrategieFormValues {
  return {
    age: '', situation_familiale: '', enfants: '0', profession: '', statut_pro: '',
    revenus_nets_mensuels: '', revenus_conjoint_mensuels: '', autres_revenus_mensuels: '',
    tmi: '', charges_mensuelles: '', mensualites_credits: '', loyer_mensuel: '',
    epargne_disponible: '', capacite_epargne: '', patrimoine_immo: '',
    taux_credit: '3.8', duree_credit: '20', objectifs: '', horizon: '', revenu_cible: '',
    implication: '', tolerance_risque: '', zones_souhaitees: '', types_biens: '', delai_decision: '',
  };
}

const num = (v: any): string => (v == null || v === '' ? '' : String(Number(v)));

function ageFromBirthdate(d: any): string {
  if (!d) return '';
  const birth = new Date(d);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age > 0 && age < 120 ? String(age) : '';
}

/** Ne garde la valeur que si elle correspond exactement à une option du select. */
function matchOption(v: any, options: string[], field?: string): string {
  if (!v) return '';
  const raw = String(v).trim();
  const s = (field && SLUG_MAPS[field]?.[raw.toLowerCase()]) || raw;
  const hit = options.find(o => o.toLowerCase() === s.toLowerCase());
  return hit ?? '';
}

function sumMensualitesCredits(credits: any): string {
  if (!Array.isArray(credits) || credits.length === 0) return '';
  const total = credits.reduce((s: number, c: any) => {
    const m = Number(c?.mensualite ?? c?.mensualite_mensuelle ?? c?.montant_mensuel ?? 0);
    return s + (Number.isFinite(m) ? m : 0);
  }, 0);
  return total > 0 ? String(total) : '';
}

function patrimoineImmo(d: any): string {
  let total = Number(d.residence_principale_valeur || 0);
  if (Array.isArray(d.biens_locatifs_existants)) {
    total += d.biens_locatifs_existants.reduce(
      (s: number, b: any) => s + (Number(b?.valeur ?? b?.valeur_estimee ?? 0) || 0),
      0,
    );
  }
  return total > 0 ? String(total) : '';
}

/**
 * Construit les valeurs du formulaire depuis le dossier.
 * Retourne aussi la liste des champs effectivement pré-remplis (indicateur visuel).
 */
export function prefillStrategieForm(dossier: any): {
  values: StrategieFormValues;
  prefilled: Set<keyof StrategieFormValues>;
} {
  const base = emptyStrategieForm();
  const d = dossier || {};

  const mapped: Partial<StrategieFormValues> = {
    age: ageFromBirthdate(d.date_naissance),
    situation_familiale: matchOption(d.situation_familiale, SITUATION_OPTIONS, 'situation_familiale'),
    enfants: d.nombre_enfants != null ? String(d.nombre_enfants) : '',
    profession: d.profession || '',
    statut_pro: matchOption(d.statut_professionnel, STATUT_PRO_OPTIONS, 'statut_pro'),
    revenus_nets_mensuels: num(d.revenus_nets_mensuels),
    revenus_conjoint_mensuels: num(d.revenus_conjoint),
    autres_revenus_mensuels: num(d.autres_revenus),
    tmi: matchOption(d.tmi != null ? String(d.tmi) : '', TMI_OPTIONS),
    charges_mensuelles: num(d.charges_mensuelles_fixes),
    mensualites_credits: sumMensualitesCredits(d.credits_en_cours),
    epargne_disponible: num(d.epargne_disponible),
    capacite_epargne: num(d.capacite_epargne_mensuelle),
    patrimoine_immo: patrimoineImmo(d),
    duree_credit: d.duree_credit_souhaitee != null ? String(d.duree_credit_souhaitee) : '',
    objectifs: humanize('objectifs', d.objectif_principal),
    horizon: matchOption(d.horizon_investissement, HORIZON_OPTIONS, 'horizon'),
    implication: humanize('implication', d.aversion_gestion),
    tolerance_risque: matchOption(d.appetence_risque, RISQUE_OPTIONS, 'tolerance_risque'),
    zones_souhaitees: d.contraintes_geographiques || '',
    types_biens: humanize('types_biens', d.type_bien_souhaite),
    delai_decision: humanize('delai_decision', d.delai_concretisation),
  };

  const values = { ...base };
  const prefilled = new Set<keyof StrategieFormValues>();
  for (const [k, v] of Object.entries(mapped) as [keyof StrategieFormValues, string][]) {
    if (v !== '' && v != null) {
      values[k] = v;
      prefilled.add(k);
    }
  }
  return { values, prefilled };
}

// ---------------------------------------------------------------------------
// Report explicite (jamais automatique) des valeurs du formulaire vers `dossiers`
// ---------------------------------------------------------------------------

/** Inverse des SLUG_MAPS : libellé affiché -> valeur technique stockée. */
function toSlug(field: string, label: string): string {
  const map = SLUG_MAPS[field];
  if (!map) return label;
  const hit = Object.entries(map).find(([, l]) => l.toLowerCase() === label.trim().toLowerCase());
  return hit ? hit[0] : label;
}

function toFreeSlug(field: string, label: string): string {
  const map = FREE_TEXT_LABELS[field];
  if (!map) return label;
  const hit = Object.entries(map).find(([, l]) => l.toLowerCase() === label.trim().toLowerCase());
  return hit ? hit[0] : label;
}

const toNum = (v: string): number | undefined => {
  if (v == null || String(v).trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const toInt = (v: string): number | undefined => {
  const n = toNum(v);
  return n == null ? undefined : Math.round(n);
};

/**
 * Construit un patch pour la table `dossiers` à partir des valeurs du formulaire.
 * Uniquement les champs qui ont une colonne équivalente. Les valeurs vides sont
 * ignorées (on n'efface jamais une donnée existante de la fiche).
 * N'inclut pas l'âge (la fiche stocke une date de naissance), ni les mensualités
 * de crédits (agrégat calculé), ni le patrimoine immobilier (agrégat calculé).
 */
export function strategieFormToDossierPatch(form: StrategieFormValues): Record<string, any> {
  const candidate: Record<string, any> = {
    situation_familiale: form.situation_familiale ? toSlug('situation_familiale', form.situation_familiale) : undefined,
    nombre_enfants: toInt(form.enfants),
    profession: form.profession?.trim() || undefined,
    statut_professionnel: form.statut_pro ? toSlug('statut_pro', form.statut_pro) : undefined,
    revenus_nets_mensuels: toNum(form.revenus_nets_mensuels),
    revenus_conjoint: toNum(form.revenus_conjoint_mensuels),
    autres_revenus: toNum(form.autres_revenus_mensuels),
    tmi: toInt(form.tmi),
    charges_mensuelles_fixes: toNum(form.charges_mensuelles),
    epargne_disponible: toNum(form.epargne_disponible),
    capacite_epargne_mensuelle: toNum(form.capacite_epargne),
    duree_credit_souhaitee: toInt(form.duree_credit),
    objectif_principal: form.objectifs ? toFreeSlug('objectifs', form.objectifs) : undefined,
    horizon_investissement: form.horizon ? toSlug('horizon', form.horizon) : undefined,
    appetence_risque: form.tolerance_risque ? toSlug('tolerance_risque', form.tolerance_risque) : undefined,
    contraintes_geographiques: form.zones_souhaitees?.trim() || undefined,
    type_bien_souhaite: form.types_biens ? toFreeSlug('types_biens', form.types_biens) : undefined,
    aversion_gestion: form.implication ? toFreeSlug('implication', form.implication) : undefined,
    delai_concretisation: form.delai_decision ? toFreeSlug('delai_decision', form.delai_decision) : undefined,
  };

  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(candidate)) {
    if (v !== undefined && v !== null && v !== '') patch[k] = v;
  }
  return patch;
}
