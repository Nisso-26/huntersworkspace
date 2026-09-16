// Mention unique du mandataire sur les documents contractuels / commerciaux.
//
// Règle : le mandataire affiché est TOUJOURS celui assigné au dossier
// (dossiers.mandataire_id → profiles.full_name, exposé en `mandataire_name`).
// Jamais l'utilisateur connecté, jamais un nom codé en dur. Si le dossier n'a
// pas de mandataire exploitable, on n'affiche que « HUNTERS Immobilier ».

export const HUNTERS_LABEL = 'HUNTERS Immobilier';
export const QUALITE_MANDATAIRE = 'Mandataire HUNTERS Immobilier';

/** Valeurs de remplissage renvoyées par les hooks quand aucun profil n'est lié. */
const PLACEHOLDERS = ['non assigné', 'non assigne', 'n/a', '—', '-'];

/** Nom du mandataire du dossier, ou chaîne vide si indisponible. */
export function mandataireNomDossier(dossier: any): string {
  const nom = String(dossier?.mandataire_name ?? '').trim();
  if (!nom || PLACEHOLDERS.includes(nom.toLowerCase())) return '';
  return nom;
}

/**
 * Bloc de signature côté HUNTERS : nom du mandataire + qualité rattachée à
 * HUNTERS. Sans mandataire, aucun nom de personne n'est substitué.
 */
export function signataireHunters(dossier: any): { nom: string; qualite: string } {
  return signataireHuntersFromNom(mandataireNomDossier(dossier));
}

/** Même règle, à partir d'un nom déjà résolu (peut être vide). */
export function signataireHuntersFromNom(nom?: string | null): { nom: string; qualite: string } {
  const n = String(nom ?? '').trim();
  if (!n || PLACEHOLDERS.includes(n.toLowerCase())) {
    return { nom: HUNTERS_LABEL, qualite: 'Pour HUNTERS Immobilier' };
  }
  return { nom: n, qualite: 'Conseiller HUNTERS Immobilier' };
}

/**
 * Mention en ligne (couverture PDF, bloc client d'une facture) rattachant
 * explicitement le mandataire à HUNTERS.
 */
export function mentionMandataireHunters(dossier: any): string {
  return mentionMandataireHuntersFromNom(mandataireNomDossier(dossier));
}

/** Même règle, à partir d'un nom déjà résolu (peut être vide). */
export function mentionMandataireHuntersFromNom(nom?: string | null): string {
  const n = String(nom ?? '').trim();
  if (!n || PLACEHOLDERS.includes(n.toLowerCase())) return HUNTERS_LABEL;
  return `${n} — ${QUALITE_MANDATAIRE}`;
}
