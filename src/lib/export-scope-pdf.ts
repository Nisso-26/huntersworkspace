import jsPDF from 'jspdf';
import {
  C, FONT, LAYOUT, SPACING,
  drawHeader, drawFooter, drawSectionTitle, drawCoverPage,
  ensureSpace, loadLogo, bodyStartY, sanitizePdfText,
} from '@/lib/pdf-design-system';
import { HUNTERS_LABEL } from '@/lib/mandataire-signature';

export type ScopeKind = 'financement' | 'montage' | 'structure_juridique_fiscale';

// Périmètres alignés sur scopesForSpecialite() et sur get_partner_portal_payload()
export const SCOPE_SECTIONS: Record<ScopeKind, string[]> = {
  financement: ['situation_financiere', 'projet', 'financement_resume'],
  montage: ['patrimoine', 'projet', 'montage'],
  structure_juridique_fiscale: ['structure_juridique_fiscale', 'projet'],
};

export const SECTION_LABELS: Record<string, string> = {
  situation_financiere: 'Situation financière',
  patrimoine: 'Patrimoine & fiscalité',
  projet: 'Projet',
  montage: 'Montage juridique et fiscal',
  financement_resume: 'Financement — résumé',
  structure_juridique_fiscale: 'Structure juridique et fiscale',
};

export const FIELD_LABELS: Record<string, string> = {
  // Situation financière
  revenus_nets_mensuels: 'Revenus nets mensuels',
  revenus_conjoint: 'Revenus du conjoint',
  revenus_locatifs_existants: 'Revenus locatifs existants',
  autres_revenus: 'Autres revenus',
  charges_mensuelles_fixes: 'Charges mensuelles fixes',
  capacite_epargne_mensuelle: "Capacité d'épargne mensuelle",
  epargne_disponible: 'Épargne disponible',
  apport_disponible: 'Apport disponible',
  taux_endettement_actuel: "Taux d'endettement actuel",
  statut_professionnel: 'Statut professionnel',
  // Patrimoine
  regime_matrimonial: 'Régime matrimonial',
  situation_familiale: 'Situation familiale',
  nombre_enfants: "Nombre d'enfants",
  tmi: 'Tranche marginale d’imposition',
  revenus_fiscaux_reference: 'Revenu fiscal de référence',
  impot_revenu_paye: 'Impôt sur le revenu payé',
  assujetti_ifi: 'Assujetti IFI',
  objectif_fiscal: 'Objectif fiscal',
  deficits_fonciers_existants: 'Déficits fonciers existants',
  dispositifs_fiscaux_en_cours: 'Dispositifs fiscaux en cours',
  autres_actifs: 'Autres actifs',
  passif_total: 'Passif total',
  biens_locatifs_existants: 'Biens locatifs existants',
  epargne_financiere: 'Épargne financière',
  // Projet
  budget: 'Budget',
  ville: 'Ville cible',
  type_bien_souhaite: 'Type de bien souhaité',
  type_location_souhaite: 'Type de location souhaité',
  objectif_principal: 'Objectif principal',
  horizon_investissement: "Horizon d'investissement",
  appetence_risque: 'Appétence au risque',
  contraintes_geographiques: 'Contraintes géographiques',
  delai_concretisation: 'Délai de concrétisation',
  // Montage
  strategie: 'Stratégie retenue',
  type_accompagnement: "Type d'accompagnement",
  // Financement
  capacite_emprunt_estimee: "Capacité d'emprunt estimée",
  duree_credit_souhaitee: 'Durée de crédit souhaitée',
  preference_taux: 'Préférence de taux',
};

const MONEY_KEYS = /revenus|charges|epargne|apport|budget|passif|impot|deficits|capacite_emprunt/;

export function formatScopedValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (Array.isArray(value)) return value.length ? `${value.length} élément(s) déclaré(s)` : '—';
  if (typeof value === 'object') return 'Renseigné';
  if (typeof value === 'number') {
    if (key === 'tmi' || key === 'taux_endettement_actuel') return `${value} %`;
    if (key === 'duree_credit_souhaitee') return `${value} ans`;
    if (MONEY_KEYS.test(key)) return `${value.toLocaleString('fr-FR')} €`;
    return String(value);
  }
  return String(value);
}

export type ScopedSections = Record<string, Record<string, unknown>>;

/** Construit les sections scopées à partir d'une ligne `dossiers` (même découpage que le RPC portail). */
export function sectionsFromDossier(dossier: Record<string, any>, kind: ScopeKind): ScopedSections {
  const pick = (keys: string[]) =>
    keys.reduce<Record<string, unknown>>((acc, k) => { acc[k] = dossier[k]; return acc; }, {});

  const all: ScopedSections = {
    situation_financiere: pick([
      'revenus_nets_mensuels', 'revenus_conjoint', 'revenus_locatifs_existants', 'autres_revenus',
      'charges_mensuelles_fixes', 'capacite_epargne_mensuelle', 'epargne_disponible',
      'apport_disponible', 'taux_endettement_actuel', 'statut_professionnel',
    ]),
    patrimoine: pick([
      'regime_matrimonial', 'situation_familiale', 'nombre_enfants', 'tmi',
      'revenus_fiscaux_reference', 'impot_revenu_paye', 'assujetti_ifi', 'objectif_fiscal',
      'deficits_fonciers_existants', 'dispositifs_fiscaux_en_cours', 'autres_actifs',
      'passif_total', 'biens_locatifs_existants', 'epargne_financiere',
    ]),
    projet: pick([
      'budget', 'ville', 'type_bien_souhaite', 'type_location_souhaite', 'objectif_principal',
      'horizon_investissement', 'appetence_risque', 'contraintes_geographiques', 'delai_concretisation',
    ]),
    montage: pick(['strategie', 'type_accompagnement']),
    structure_juridique_fiscale: pick([
      'regime_matrimonial', 'situation_familiale', 'nombre_enfants', 'tmi', 'assujetti_ifi',
      'objectif_fiscal', 'dispositifs_fiscaux_en_cours', 'deficits_fonciers_existants',
      'strategie', 'type_accompagnement',
    ]),
    financement_resume: pick(['capacite_emprunt_estimee', 'duree_credit_souhaitee', 'preference_taux', 'budget']),
  };

  return SCOPE_SECTIONS[kind].reduce<ScopedSections>((acc, s) => { acc[s] = all[s]; return acc; }, {});
}

const TITRES: Record<ScopeKind, { type: string; titre: string; sousTitre: string }> = {
  financement: {
    type: 'Dossier de financement',
    titre: 'Dossier de financement',
    sousTitre: 'Pièce transmise au partenaire bancaire — périmètre financement',
  },
  montage: {
    type: 'Montage juridique & fiscal',
    titre: 'Dossier de montage',
    sousTitre: 'Consultation portail partenaire — diffusion interdite',
  },
  structure_juridique_fiscale: {
    type: 'Structure juridique & fiscale',
    titre: 'Dossier juridique et fiscal',
    sousTitre: 'Consultation partenaire — périmètre juridique et fiscal restreint',
  },
};

/** Génère le PDF scopé. Le montage est destiné à la consultation portail uniquement. */
export async function buildScopedPdf(opts: {
  kind: ScopeKind;
  refDossier?: string | null;
  sections: ScopedSections;
  client?: string;
  conseiller?: string;
  partenaire?: string | null;
}): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const meta = TITRES[opts.kind];
  const ref = opts.refDossier || 'DOSSIER';
  const logo = await loadLogo();

  await drawCoverPage(doc, {
    logo,
    typeDocument: meta.type,
    titre: meta.titre,
    sousTitre: meta.sousTitre,
    client: opts.client || 'Dossier anonymisé',
    conseiller: opts.conseiller || HUNTERS_LABEL,
    refDossier: ref,
    date: new Date().toLocaleDateString('fr-FR'),
    confidentiel: true,
  });

  doc.addPage();
  drawHeader(doc, ref, meta.type);
  let y = bodyStartY;

  if (opts.partenaire) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text(sanitizePdfText(`Destinataire : ${opts.partenaire}`), LAYOUT.marginL, y);
    y += SPACING.paragraph + 3;
  }

  for (const section of Object.keys(opts.sections)) {
    const fields = opts.sections[section] || {};
    y = ensureSpace(doc, y, 26, { refDossier: ref, titrePage: meta.type });
    y = drawSectionTitle(doc, SECTION_LABELS[section] || section, y);

    let i = 0;
    for (const key of Object.keys(fields)) {
      y = ensureSpace(doc, y, 8, { refDossier: ref, titrePage: meta.type });
      doc.setFillColor(...(i % 2 === 0 ? C.white : C.creamLight));
      doc.rect(LAYOUT.marginL, y - 4.5, LAYOUT.contentW, 7.2, 'F');

      doc.setFont(FONT.body, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...C.textMuted);
      doc.text(sanitizePdfText(FIELD_LABELS[key] || key), LAYOUT.marginL + 2, y);

      doc.setFont(FONT.body, 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.ink);
      const val = sanitizePdfText(formatScopedValue(key, fields[key]));
      doc.text(val.length > 60 ? `${val.slice(0, 57)}...` : val, LAYOUT.marginL + 88, y);
      y += 7.2;
      i++;
    }
    y += SPACING.section - 4;
  }

  y = ensureSpace(doc, y, 20, { refDossier: ref, titrePage: meta.type });
  doc.setFont(FONT.body, 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  const mention = opts.kind !== 'financement'
    ? "Document de consultation. Toute reproduction, impression ou rediffusion est interdite."
    : "Document confidentiel remis au partenaire dans le seul cadre de l'étude de financement.";
  doc.text(doc.splitTextToSize(sanitizePdfText(mention), LAYOUT.textW) as string[], LAYOUT.marginL, y);

  const total = doc.getNumberOfPages();
  for (let p = 2; p <= total; p++) {
    doc.setPage(p);
    drawFooter(doc, p, total, opts.kind !== 'financement' ? 'HUNTERS · Consultation portail — non diffusable' : 'HUNTERS · Document confidentiel');
  }

  return doc;
}
