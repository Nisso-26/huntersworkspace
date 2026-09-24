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

export interface ScopedNarrativeBlock {
  title: string;
  text: string;
}

export interface ScopedStrategie {
  synthese: string;
  profil_investisseur?: string;
  recommandations: Array<{
    rang?: number;
    titre?: string;
    dispositif?: string;
    description?: string;
    budget_acquisition_total?: number;
    apport_recommande?: number;
    mensualite_credit_estimee?: number;
    rendement_brut_estime_pct?: number;
  }>;
  plan_action: Array<{ etape?: number; titre?: string; description?: string; delai?: string }>;
  points_attention?: string[];
  disclaimer?: string;
}

export function parseScopedStrategie(value: unknown): ScopedStrategie | string {
  const rawText = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      && typeof (parsed as Record<string, unknown>).synthese === 'string'
      && Array.isArray((parsed as Record<string, unknown>).recommandations)
      && Array.isArray((parsed as Record<string, unknown>).plan_action)
    ) {
      return parsed as ScopedStrategie;
    }
  } catch {
    // Les anciennes stratégies peuvent être enregistrées en texte libre.
  }
  return rawText;
}

function valueFromScopedSections(sections: ScopedSections, key: string): unknown {
  for (const fields of Object.values(sections)) {
    if (fields && Object.prototype.hasOwnProperty.call(fields, key)) return fields[key];
  }
  return undefined;
}

function hasNarrativeValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function asText(value: unknown): string | null {
  if (!hasNarrativeValue(value)) return null;
  if (typeof value === 'boolean') return value ? 'oui' : 'non';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (Array.isArray(value)) return value.length ? `${value.length} élément(s) déclaré(s)` : null;
  if (typeof value === 'object') return 'renseigné';
  const text = String(value).trim();
  return text || null;
}

function moneyText(value: unknown): string | null {
  if (!hasNarrativeValue(value)) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return asText(value);
  return `${n.toLocaleString('fr-FR')} €`;
}

function childrenText(value: unknown): string | null {
  if (!hasNarrativeValue(value)) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return 'sans enfant';
  return `avec ${n} enfant${n > 1 ? 's' : ''}`;
}

function deficitText(value: unknown): string | null {
  const amount = moneyText(value);
  if (!amount) return null;
  return `des déficits fonciers existants de ${amount}`;
}

function joinSentence(parts: string[]): string {
  const clean = parts.filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) return `${clean[0]}.`;
  return `${clean.slice(0, -1).join(', ')} et ${clean[clean.length - 1]}.`;
}

export function buildScopedNarratives(sections: ScopedSections): ScopedNarrativeBlock[] {
  const get = (key: string) => valueFromScopedSections(sections, key);
  const statut = asText(get('statut_professionnel'));
  const situation = asText(get('situation_familiale'));
  const enfants = childrenText(get('nombre_enfants'));
  const budget = moneyText(get('budget'));
  const ville = asText(get('ville'));
  const typeBien = asText(get('type_bien_souhaite'));
  const horizon = asText(get('horizon_investissement'));
  const risque = asText(get('appetence_risque'));
  const delai = asText(get('delai_concretisation'));

  const profilParts: string[] = [];
  if (statut) profilParts.push(`client ${statut}`);
  if (situation && enfants) profilParts.push(`${situation}, ${enfants}`);
  else if (situation) profilParts.push(situation);
  else if (enfants) profilParts.push(enfants);
  if (typeBien && ville) profilParts.push(`recherche ${typeBien} à ${ville}`);
  else if (typeBien) profilParts.push(`recherche ${typeBien}`);
  else if (ville) profilParts.push(`cible ${ville}`);
  if (budget) profilParts.push(`avec un budget de ${budget}`);
  if (horizon) profilParts.push(`sur un horizon ${horizon}`);
  if (risque) profilParts.push(`avec une appétence au risque ${risque}`);
  if (delai) profilParts.push(`pour une concrétisation ${delai}`);

  const objectif = asText(get('objectif_principal'));
  const objectifFiscal = asText(get('objectif_fiscal'));
  const strategieValue = parseScopedStrategie(get('strategie'));
  const strategie = typeof strategieValue === 'string'
    ? asText(strategieValue)
    : asText(strategieValue.synthese);
  const accompagnement = asText(get('type_accompagnement'));
  const dispositifs = asText(get('dispositifs_fiscaux_en_cours'));
  const deficits = deficitText(get('deficits_fonciers_existants'));

  const strategieParts: string[] = [];
  if (objectif) strategieParts.push(`l'objectif principal est ${objectif}`);
  if (objectifFiscal) strategieParts.push(`l'orientation fiscale recherchée est ${objectifFiscal}`);
  if (strategie) strategieParts.push(`la stratégie envisagée est ${strategie}`);
  if (accompagnement) strategieParts.push(`l'accompagnement prévu est ${accompagnement}`);
  if (dispositifs) strategieParts.push(`les dispositifs fiscaux en cours sont ${dispositifs}`);
  if (deficits) strategieParts.push(deficits);

  const blocks: ScopedNarrativeBlock[] = [];
  if (profilParts.length >= 2) {
    blocks.push({ title: 'Profil du client', text: joinSentence(profilParts) });
  }
  if (strategieParts.length >= 1) {
    blocks.push({ title: "Stratégie d'investissement", text: joinSentence(strategieParts) });
  }
  return blocks;
}

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

  const narratives = buildScopedNarratives(opts.sections);
  for (const block of narratives) {
    y = ensureSpace(doc, y, 24, { refDossier: ref, titrePage: meta.type });
    y = drawSectionTitle(doc, block.title, y);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(sanitizePdfText(block.text), LAYOUT.textW) as string[];
    doc.text(lines, LAYOUT.marginL, y);
    y += lines.length * 5 + SPACING.paragraph + 2;
  }

  for (const section of Object.keys(opts.sections)) {
    const fields = opts.sections[section] || {};
    y = ensureSpace(doc, y, 26, { refDossier: ref, titrePage: meta.type });
    y = drawSectionTitle(doc, SECTION_LABELS[section] || section, y);

    let i = 0;
    for (const key of Object.keys(fields)) {
      const strategie = key === 'strategie' ? parseScopedStrategie(fields[key]) : null;
      if (strategie && typeof strategie !== 'string') {
        const ctx = { refDossier: ref, titrePage: meta.type };
        const drawParagraph = (label: string, text: string, italic = false) => {
          if (!text) return;
          y = ensureSpace(doc, y, 14, ctx);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.green);
          doc.text(sanitizePdfText(label), LAYOUT.marginL, y);
          y += 5;
          doc.setFont(FONT.body, italic ? 'italic' : 'normal');
          doc.setFontSize(italic ? 8 : 9);
          doc.setTextColor(...(italic ? C.textMuted : C.ink));
          const lines = doc.splitTextToSize(sanitizePdfText(text), LAYOUT.textW) as string[];
          for (const line of lines) {
            y = ensureSpace(doc, y, 5, ctx);
            doc.text(line, LAYOUT.marginL, y);
            y += 4.6;
          }
          y += 3;
        };
        const formatMoney = (value?: number) => typeof value === 'number'
          ? `${value.toLocaleString('fr-FR')} €`
          : null;

        drawParagraph('Synthèse', strategie.synthese);
        if (strategie.profil_investisseur) drawParagraph('Profil investisseur', strategie.profil_investisseur);

        if (strategie.recommandations.length) {
          y = ensureSpace(doc, y, 14, ctx);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.green);
          doc.text('Recommandations', LAYOUT.marginL, y);
          y += 6;
          strategie.recommandations.forEach((rec, index) => {
            y = ensureSpace(doc, y, 18, ctx);
            doc.setFillColor(...C.creamLight);
            doc.rect(LAYOUT.marginL, y - 4, LAYOUT.contentW, 7, 'F');
            doc.setFont(FONT.body, 'bold');
            doc.setFontSize(9);
            doc.setTextColor(...C.ink);
            doc.text(sanitizePdfText(`${rec.rang ?? index + 1}. ${rec.titre || 'Recommandation'}`), LAYOUT.marginL + 2, y);
            y += 6;
            if (rec.dispositif) drawParagraph('Dispositif', rec.dispositif);
            if (rec.description) drawParagraph('Description', rec.description);
            const chiffres = [
              ['Budget total', formatMoney(rec.budget_acquisition_total)],
              ['Apport recommandé', formatMoney(rec.apport_recommande)],
              ['Mensualité estimée', formatMoney(rec.mensualite_credit_estimee)],
              ['Rendement brut estimé', typeof rec.rendement_brut_estime_pct === 'number' ? `${rec.rendement_brut_estime_pct} %` : null],
            ].filter((entry): entry is [string, string] => Boolean(entry[1]));
            chiffres.forEach(([label, value]) => {
              y = ensureSpace(doc, y, 6, ctx);
              doc.setFont(FONT.body, 'normal');
              doc.setFontSize(8.5);
              doc.setTextColor(...C.textMuted);
              doc.text(sanitizePdfText(label), LAYOUT.marginL + 2, y);
              doc.setFont(FONT.body, 'bold');
              doc.setTextColor(...C.ink);
              doc.text(sanitizePdfText(value), LAYOUT.marginL + 88, y);
              y += 5;
            });
            y += 3;
          });
        }

        if (strategie.plan_action.length) {
          y = ensureSpace(doc, y, 14, ctx);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.green);
          doc.text("Plan d'action", LAYOUT.marginL, y);
          y += 6;
          strategie.plan_action.forEach((step, index) => {
            const text = `${step.etape ?? index + 1}. ${step.titre || 'Étape'}${step.description ? ` — ${step.description}` : ''}${step.delai ? ` (${step.delai})` : ''}`;
            const lines = doc.splitTextToSize(sanitizePdfText(text), LAYOUT.textW) as string[];
            y = ensureSpace(doc, y, lines.length * 4.6 + 2, ctx);
            doc.setFont(FONT.body, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...C.ink);
            doc.text(lines, LAYOUT.marginL, y);
            y += lines.length * 4.6 + 2;
          });
          y += 2;
        }

        if (strategie.points_attention?.length) {
          y = ensureSpace(doc, y, 14, ctx);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.green);
          doc.text('Points de vigilance', LAYOUT.marginL, y);
          y += 6;
          strategie.points_attention.forEach((point) => {
            const lines = doc.splitTextToSize(sanitizePdfText(`• ${point}`), LAYOUT.textW) as string[];
            y = ensureSpace(doc, y, lines.length * 4.6 + 2, ctx);
            doc.setFont(FONT.body, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...C.ink);
            doc.text(lines, LAYOUT.marginL, y);
            y += lines.length * 4.6 + 2;
          });
        }
        if (strategie.disclaimer) drawParagraph('Avertissement', strategie.disclaimer, true);
        i++;
        continue;
      }
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
