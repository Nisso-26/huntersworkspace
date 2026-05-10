/**
 * Parser et helpers partagés pour le champ `dossier.strategie`.
 *
 * La colonne reste un TEXT en base (JSON sérialisé) mais peut aussi contenir
 * du texte libre legacy. Ce module garantit qu'aucune donnée invalide ne
 * provoque de crash côté UI et que l'affichage reste cohérent partout
 * (composant StrategieIA, tableau Dossiers, export CSV).
 */

export interface StrategieIndicateurs {
  revenus_nets_totaux_mensuels: number;
  taux_effort_actuel_pct: number;
  capacite_emprunt_estimee: number;
  mensualite_max_supplementaire: number;
  cash_flow_mensuel_libre: number;
}

export interface StrategieRecommandation {
  rang: number;
  titre: string;
  dispositif: string;
  description: string;
  budget_acquisition_total: number;
  apport_recommande: number;
  mensualite_credit_estimee: number;
  loyer_brut_mensuel_estime: number;
  cash_flow_net_mensuel_estime: number;
  rendement_brut_estime_pct: number;
  economie_fiscale_annuelle_estimee: number;
  avantages: string[];
  points_vigilance: string[];
  horizon_recommande: string;
  zones_suggerees: string[];
}

export interface StrategiePlanAction {
  etape: number;
  titre: string;
  description: string;
  delai: string;
}

export interface StrategieData {
  synthese: string;
  profil_investisseur: string;
  indicateurs_cles: StrategieIndicateurs;
  recommandations: StrategieRecommandation[];
  plan_action: StrategiePlanAction[];
  points_attention: string[];
  disclaimer: string;
}

export type StrategieParseError =
  | 'empty'
  | 'not_json'
  | 'not_object'
  | 'missing_synthese'
  | 'missing_indicateurs'
  | 'missing_recommandations'
  | 'parse_exception';

export interface StrategieParseResult {
  /** Stratégie validée et nettoyée, ou null si non utilisable. */
  strategie: StrategieData | null;
  /** Code d'erreur machine (cf. STRATEGIE_ERROR_MESSAGES). */
  error: StrategieParseError | null;
  /** True si l'entrée était une simple chaîne libre (legacy / texte non-JSON). */
  isPlainText: boolean;
  /** Texte brut conservé pour fallback d'affichage. */
  rawText: string;
}

export const STRATEGIE_ERROR_MESSAGES: Record<StrategieParseError, string> = {
  empty: 'Aucune stratégie enregistrée.',
  not_json: 'Stratégie au format texte libre — pas d\'analyse IA structurée.',
  not_object: 'Format de stratégie invalide (objet attendu).',
  missing_synthese: 'Stratégie incomplète : la synthèse est manquante.',
  missing_indicateurs: 'Stratégie incomplète : les indicateurs clés sont manquants.',
  missing_recommandations: 'Stratégie incomplète : aucune recommandation valide.',
  parse_exception: 'Stratégie illisible : JSON invalide ou corrompu.',
};

// ---------- Helpers internes ----------

const toNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toString = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v.trim() : v == null ? fallback : String(v);

const toStringArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => toString(x)).filter((s) => s.length > 0)
    : [];

const cleanIndicateurs = (v: any): StrategieIndicateurs => ({
  revenus_nets_totaux_mensuels: toNumber(v?.revenus_nets_totaux_mensuels),
  taux_effort_actuel_pct: toNumber(v?.taux_effort_actuel_pct),
  capacite_emprunt_estimee: toNumber(v?.capacite_emprunt_estimee),
  mensualite_max_supplementaire: toNumber(v?.mensualite_max_supplementaire),
  cash_flow_mensuel_libre: toNumber(v?.cash_flow_mensuel_libre),
});

const cleanRecommandation = (
  v: any,
  index: number,
): StrategieRecommandation | null => {
  if (!v || typeof v !== 'object') return null;
  const titre = toString(v.titre);
  // Une recommandation sans titre est inutilisable
  if (!titre) return null;
  return {
    rang: toNumber(v.rang, index + 1),
    titre,
    dispositif: toString(v.dispositif),
    description: toString(v.description),
    budget_acquisition_total: toNumber(v.budget_acquisition_total),
    apport_recommande: toNumber(v.apport_recommande),
    mensualite_credit_estimee: toNumber(v.mensualite_credit_estimee),
    loyer_brut_mensuel_estime: toNumber(v.loyer_brut_mensuel_estime),
    cash_flow_net_mensuel_estime: toNumber(v.cash_flow_net_mensuel_estime),
    rendement_brut_estime_pct: toNumber(v.rendement_brut_estime_pct),
    economie_fiscale_annuelle_estimee: toNumber(v.economie_fiscale_annuelle_estimee),
    avantages: toStringArray(v.avantages),
    points_vigilance: toStringArray(v.points_vigilance),
    horizon_recommande: toString(v.horizon_recommande),
    zones_suggerees: toStringArray(v.zones_suggerees),
  };
};

const cleanPlanAction = (v: any, index: number): StrategiePlanAction | null => {
  if (!v || typeof v !== 'object') return null;
  const titre = toString(v.titre);
  if (!titre) return null;
  return {
    etape: toNumber(v.etape, index + 1),
    titre,
    description: toString(v.description),
    delai: toString(v.delai),
  };
};

// ---------- API publique ----------

/**
 * Parse, valide et nettoie une stratégie stockée (objet ou JSON string).
 * Ne lance jamais d'exception. Retourne toujours un objet exploitable.
 */
export function parseStrategie(raw: unknown): StrategieParseResult {
  // Cas vide
  if (raw === null || raw === undefined) {
    return { strategie: null, error: 'empty', isPlainText: false, rawText: '' };
  }

  let obj: any = null;
  let rawText = '';
  let isPlainText = false;

  try {
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      obj = raw;
      rawText = '';
    } else if (typeof raw === 'string') {
      rawText = raw;
      const trimmed = raw.trim();
      if (!trimmed) {
        return { strategie: null, error: 'empty', isPlainText: false, rawText: '' };
      }
      if (!trimmed.startsWith('{')) {
        // Texte libre legacy → pas une erreur bloquante
        return {
          strategie: null,
          error: 'not_json',
          isPlainText: true,
          rawText: trimmed,
        };
      }
      obj = JSON.parse(trimmed);
    } else {
      return {
        strategie: null,
        error: 'not_object',
        isPlainText: false,
        rawText: String(raw),
      };
    }
  } catch (err) {
    console.warn('parseStrategie: JSON.parse a échoué', err);
    return {
      strategie: null,
      error: 'parse_exception',
      isPlainText: false,
      rawText,
    };
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { strategie: null, error: 'not_object', isPlainText: false, rawText };
  }

  // Validation stricte des champs essentiels
  const synthese = toString(obj.synthese);
  if (!synthese) {
    return { strategie: null, error: 'missing_synthese', isPlainText: false, rawText };
  }
  if (!obj.indicateurs_cles || typeof obj.indicateurs_cles !== 'object') {
    return { strategie: null, error: 'missing_indicateurs', isPlainText: false, rawText };
  }
  if (!Array.isArray(obj.recommandations)) {
    return {
      strategie: null,
      error: 'missing_recommandations',
      isPlainText: false,
      rawText,
    };
  }

  const recommandations = obj.recommandations
    .map((r: any, i: number) => cleanRecommandation(r, i))
    .filter((r: StrategieRecommandation | null): r is StrategieRecommandation => r !== null);

  if (recommandations.length === 0) {
    return {
      strategie: null,
      error: 'missing_recommandations',
      isPlainText: false,
      rawText,
    };
  }

  const planAction = Array.isArray(obj.plan_action)
    ? obj.plan_action
        .map((p: any, i: number) => cleanPlanAction(p, i))
        .filter((p: StrategiePlanAction | null): p is StrategiePlanAction => p !== null)
    : [];

  const cleaned: StrategieData = {
    synthese,
    profil_investisseur: toString(obj.profil_investisseur),
    indicateurs_cles: cleanIndicateurs(obj.indicateurs_cles),
    recommandations,
    plan_action: planAction,
    points_attention: toStringArray(obj.points_attention),
    disclaimer: toString(obj.disclaimer),
  };

  return { strategie: cleaned, error: null, isPlainText: false, rawText };
}

/**
 * Résumé court et cohérent pour les contextes d'affichage compact :
 * tableau Dossiers, export CSV, etc.
 *
 *  - "✓ IA"     → stratégie IA structurée valide
 *  - texte brut → stratégie au format libre (legacy)
 *  - "—"        → vide ou illisible
 */
export function summarizeStrategie(raw: unknown): string {
  const { strategie, isPlainText, rawText } = parseStrategie(raw);
  if (strategie) return '✓ IA';
  if (isPlainText && rawText) return rawText;
  return '—';
}
