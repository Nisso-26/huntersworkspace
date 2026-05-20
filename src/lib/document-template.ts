// Évaluation de formules numériques pour les modèles de documents.
// Les formules sont des expressions JS simples sur des identifiants déjà résolus.
// Exemple : "honoraires_ht * (1 - remise_pct/100)"

export function evalFormula(formula: string, vars: Record<string, number>): number {
  try {
    const keys = Object.keys(vars);
    const values = keys.map((k) => Number(vars[k]) || 0);
    // eslint-disable-next-line no-new-func
    const fn = new Function(...keys, `return (${formula});`);
    const out = fn(...values);
    const n = Number(out);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

// Pré-remplit les champs financiers d'une section "financier" à partir
// du dossier et des valeurs précédemment saisies.
export function computeFinancierValues(
  champs: Array<{ key: string; type: string; defaut?: any; formule?: string; auto_from?: string }>,
  saisies: Record<string, number>,
  autoSource: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  // Pass 1 : valeurs saisies / défaut / auto
  for (const c of champs) {
    if (c.type === 'number') {
      if (saisies[c.key] !== undefined && saisies[c.key] !== null && !Number.isNaN(saisies[c.key])) {
        out[c.key] = Number(saisies[c.key]) || 0;
      } else if (c.auto_from && autoSource[c.auto_from] !== undefined) {
        out[c.key] = Number(autoSource[c.auto_from]) || 0;
      } else {
        out[c.key] = Number(c.defaut) || 0;
      }
    }
  }
  // Pass 2 : calculs en cascade (plusieurs passes pour résoudre les dépendances)
  for (let pass = 0; pass < 5; pass++) {
    for (const c of champs) {
      if (c.type === 'calc' && c.formule) {
        out[c.key] = evalFormula(c.formule, out);
      }
    }
  }
  return out;
}

export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(n)
    .replace(/\u00a0/g, ' ')
    .replace(/\u202f/g, ' ');
}

// Remplace {{variable}} dans un texte par les valeurs du contexte.
export function interpolate(text: string, ctx: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const v = ctx[key];
    if (v === undefined || v === null || v === '') return `[${key}]`;
    return String(v);
  });
}
