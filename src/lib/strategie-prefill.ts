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
function matchOption(v: any, options: string[]): string {
  if (!v) return '';
  const s = String(v).trim();
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
    situation_familiale: matchOption(d.situation_familiale, SITUATION_OPTIONS),
    enfants: d.nombre_enfants != null ? String(d.nombre_enfants) : '',
    profession: d.profession || '',
    statut_pro: matchOption(d.statut_professionnel, STATUT_PRO_OPTIONS),
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
    objectifs: d.objectif_principal || '',
    horizon: matchOption(d.horizon_investissement, HORIZON_OPTIONS),
    implication: d.aversion_gestion || '',
    tolerance_risque: matchOption(d.appetence_risque, RISQUE_OPTIONS),
    zones_souhaitees: d.contraintes_geographiques || '',
    types_biens: d.type_bien_souhaite || '',
    delai_decision: d.delai_concretisation || '',
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
