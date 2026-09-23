import jsPDF from 'jspdf';
import {
  C, FONT, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle, drawIvoryBox,
  ensureSpace, sanitizePdfText,
} from '@/lib/pdf-design-system';
import { partnerPortalProfile } from '@/lib/partner-portal-profile';

export interface QuitusContenu {
  numero_dossier?: string;
  nature_validation?: string | null;
  partenaire_nom?: string;
  partenaire_specialite?: string;
  partenaire_societe?: string | null;
  verdict?: string;
  justification?: string;
  proposition?: string | null;
  proposition_alternative?: string | null;
  perimetre?: string[];
  certification?: string;
  horodatage?: string;
  token_id?: string;
  code_confirmation?: string;
}

const SCOPE_LABELS: Record<string, string> = {
  situation_financiere: 'Situation financière',
  patrimoine: 'Patrimoine & fiscalité',
  projet: 'Projet',
  montage: 'Montage juridique et fiscal',
  financement_resume: 'Financement (résumé)',
  structure_juridique_fiscale: 'Structure juridique et fiscale',
};

// Quitus partenaire — document de traçabilité figé (sans IP de session).
export function buildQuitusPdf(contenu: QuitusContenu): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { marginL, contentW, pageW } = LAYOUT;
  const ref = contenu.numero_dossier || 'DOSSIER';

  // Bandeau vert profond
  doc.setFillColor(...C.greenDeep);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.5);
  doc.line(marginL, 30, marginL + 40, 30);
  doc.setTextColor(...C.white);
  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(18);
  doc.text('Quitus partenaire', marginL, 20);
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(8.5);
  doc.text(`Dossier ${ref}`, pageW - LAYOUT.marginR, 20, { align: 'right' });

  let y = 46;

  const line = (label: string, value?: string | null) => {
    y = ensureSpace(doc, y, 7, { refDossier: ref, titrePage: 'Quitus partenaire' });
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textMuted);
    doc.text(sanitizePdfText(label), marginL, y);
    doc.setFont(FONT.body, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.ink);
    doc.text(sanitizePdfText(value || '—'), marginL + 55, y);
    y += 6.2;
  };

  y = drawSectionTitle(doc, 'Identification', y);
  line('Numéro de dossier', ref);
  line('Nature de la validation', contenu.nature_validation || 'Validation montage');
  y += 4;

  y = drawSectionTitle(doc, 'Partenaire', y);
  line('Nom', contenu.partenaire_nom);
  line('Spécialité', contenu.partenaire_specialite);
  line('Société', contenu.partenaire_societe || '—');
  y += 4;

  y = drawSectionTitle(doc, 'Décision', y);
  const decisionLabels = partnerPortalProfile(contenu.partenaire_specialite);
  line('Verdict', contenu.verdict === 'quitus' ? decisionLabels.labelQuitus : decisionLabels.labelInvalidation);
  y += 2;

  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  for (const l of doc.splitTextToSize(sanitizePdfText(contenu.justification || ''), LAYOUT.textW) as string[]) {
    y = ensureSpace(doc, y, 7, { refDossier: ref, titrePage: 'Quitus partenaire' });
    doc.text(l, marginL, y);
    y += 5.5;
  }
  y += 6;

  const propositionAlternative = contenu.proposition_alternative || contenu.proposition;
  if (propositionAlternative) {
    y = drawSectionTitle(doc, 'Proposition du partenaire', y);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.ink);
    for (const l of doc.splitTextToSize(sanitizePdfText(propositionAlternative), LAYOUT.textW) as string[]) {
      y = ensureSpace(doc, y, 7, { refDossier: ref, titrePage: 'Quitus partenaire' });
      doc.text(l, marginL, y);
      y += 5.5;
    }
    y += 6;
  }

  y = drawSectionTitle(doc, 'Périmètre consulté', y);
  const badges = (contenu.perimetre || []).map((s) => SCOPE_LABELS[s] || s);
  let bx = marginL;
  y = ensureSpace(doc, y, 12, { refDossier: ref, titrePage: 'Quitus partenaire' });
  doc.setFontSize(8);
  doc.setFont(FONT.body, 'normal');
  for (const b of badges) {
    const label = sanitizePdfText(b);
    const w = doc.getTextWidth(label) + 6;
    if (bx + w > marginL + contentW) { bx = marginL; y += 8; }
    doc.setFillColor(...C.cream);
    doc.rect(bx, y - 4.2, w, 6.4, 'F');
    doc.setTextColor(...C.green);
    doc.text(label, bx + 3, y);
    bx += w + 3;
  }
  y += 12;

  y = ensureSpace(doc, y, 26, { refDossier: ref, titrePage: 'Quitus partenaire' });
  const boxY = y;
  drawIvoryBox(doc, y, 20);
  doc.setFont(FONT.body, 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.ink);
  let cy = boxY + 6;
  for (const l of doc.splitTextToSize(sanitizePdfText(contenu.certification || ''), contentW - 12) as string[]) {
    doc.text(l, marginL + 6, cy);
    cy += 4.6;
  }
  y = boxY + 26;

  y = drawSectionTitle(doc, 'Traçabilité', y);
  line('Horodatage serveur', contenu.horodatage);
  line('Identifiant du lien', contenu.token_id);
  line('Code de confirmation', contenu.code_confirmation);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i > 1) drawHeader(doc, ref, 'Quitus partenaire');
    drawFooter(doc, i, total);
  }
  return doc;
}
