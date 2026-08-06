import jsPDF from 'jspdf';
import { fmtPdfEur, fmtPdfNum } from '@/lib/pdf-utils';
import { interpolate } from '@/lib/document-template';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import type { CompanySettings } from '@/hooks/use-company-settings';
import {
  C, FONT, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, drawSignatureZone,
  ensureSpace, sanitizePdfText, loadLogo, drawCoverPage,
} from '@/lib/pdf-design-system';

export interface DocumentBuildContext {
  titre: string;
  sections: ModeleSection[];
  variables: Record<string, any>;
  financierValues: Record<string, Record<string, number>>;
  textOverrides: Record<string, string>;
  services?: Record<string, boolean>;
  serviceLabels?: Record<string, string>;
  numeroDossier?: string | null;
  conseiller?: string | null;
  company?: Partial<CompanySettings> | null;
  client?: string | null;
  avecCouverture?: boolean; // true pour mandat, convention, lettre de mission, pack
}

// ─── TABLEAU FINANCIER ────────────────────────────────────────────────────────
function renderFinancier(
  doc: jsPDF,
  section: ModeleSection,
  values: Record<string, number>,
  y: number,
  ctx: DocumentBuildContext,
): number {
  const { marginL, marginR, contentW, pageW, pageH, footerY } = LAYOUT;
  const rowH = 7;
  const colLabelW = 100;
  const colValX = marginL + colLabelW;
  const colTypeX = pageW - marginR - 22;

  // En-tête tableau — vert HUNTERS #004621
  doc.setFillColor(...C.green);
  doc.rect(marginL, y, contentW, rowH, 'F');
  doc.setTextColor(...C.white);
  doc.setFont(FONT.body, 'bold');
  doc.setFontSize(8.5);
  doc.text('Poste', marginL + 3, y + 5);
  doc.text('Valeur', colTypeX - 3, y + 5, { align: 'right' });
  doc.text('Type', colTypeX + 3, y + 5);
  y += rowH;

  let zebra = false;
  for (const c of section.champs || []) {
    y = ensureSpace(doc, y, rowH + 2,
      { refDossier: ctx.numeroDossier, titrePage: ctx.titre });

    // Alternance crème/blanc — charte
    doc.setFillColor(...(zebra ? C.cream : C.white));
    doc.rect(marginL, y, contentW, rowH, 'F');
    zebra = !zebra;

    const v = values[c.key] ?? 0;
    const isPct = /(%|pct|taux|rentabilite|vacance)/i.test(c.key);
    const formatted = isPct
      ? `${fmtPdfNum(v, 2)} %`
      : fmtPdfEur(v);

    doc.setTextColor(...C.ink);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9);
    doc.text(sanitizePdfText(c.label), marginL + 3, y + 5);

    doc.setFont(FONT.body, 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.green);
    doc.text(formatted, colTypeX - 3, y + 5, { align: 'right' });

    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text(c.type === 'calc' ? 'Calcule' : 'Saisie', colTypeX + 3, y + 5);

    y += rowH;
  }

  // Bordure horizontale basse — filet crème foncée
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginL + contentW, y);

  return y + 6;
}

// ─── SECTION TEXTE ────────────────────────────────────────────────────────────
function renderText(
  doc: jsPDF,
  text: string,
  y: number,
  ctx: DocumentBuildContext,
): number {
  const { marginL, textW } = LAYOUT;

  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);

  // Les retours a la ligne du modele sont conserves (paragraphes, listes, blocs parties)
  for (const paragraph of (text || '').split('\n')) {
    const clean = sanitizePdfText(paragraph);
    if (clean === '') { y += 3; continue; }
    const lines = doc.splitTextToSize(clean, textW) as string[];
    for (const line of lines) {
      y = ensureSpace(doc, y, 6.5,
        { refDossier: ctx.numeroDossier, titrePage: ctx.titre });
      doc.text(line, marginL, y);
      y += 5.8;
    }
  }
  return y + 3.5;
}



// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export async function buildDocumentPdf(ctx: DocumentBuildContext): Promise<jsPDF> {
  const [logo] = await Promise.all([
    ctx.avecCouverture ? loadLogo() : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { marginL, marginR, pageW, headerH, contentW } = LAYOUT;

  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // ── Couverture si demandée ────────────────────────────────────────────────
  const CATS_AVEC_COUVERTURE = [
    'mandat_recherche', 'convention_honoraires',
    'lettre_mission_amo', 'lettre_mission_deco', 'contrat_pack',
  ];
  const needsCover = ctx.avecCouverture ?? false;

  if (needsCover) {
    await drawCoverPage(doc, {
      logo,
      typeDocument: 'Document contractuel',
      titre: sanitizePdfText(ctx.titre),
      client: sanitizePdfText(ctx.client || ctx.variables?.nom_client || ''),
      conseiller: sanitizePdfText(ctx.conseiller || ''),
      refDossier: ctx.numeroDossier,
      date: today,
      confidentiel: false,
    });
    doc.addPage();
  }

  drawHeader(doc, ctx.numeroDossier, sanitizePdfText(ctx.titre));
  let y = LAYOUT.headerH + 4.2 + 6;

  // ── Titre du document — Marcellus 20pt ───────────────────────────────────
  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(20);
  doc.setTextColor(...C.green);
  doc.text(sanitizePdfText(ctx.titre), marginL, y);
  y += 6;

  // Filet or 1.5pt · 80pt
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.53);
  doc.line(marginL, y, marginL + 28, y);
  y += 8;


  // ── Bloc contextuel sobre ───────────────────────────────────────────────
  const ctxLines = [
    `Tours, le ${today}`,
    ctx.variables?.nom_client ? `Client : ${sanitizePdfText(ctx.variables.nom_client)}` : null,
    ctx.numeroDossier ? `Dossier : ${ctx.numeroDossier}` : null,
    ctx.conseiller ? `Conseiller : ${sanitizePdfText(ctx.conseiller)}` : null,
  ].filter(Boolean) as string[];

  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMuted);
  for (const l of ctxLines) {
    doc.text(l, marginL, y);
    y += 5;
  }
  y += 6;

  // ── Sections ─────────────────────────────────────────────────────────────
  for (const section of ctx.sections) {
    if (section.type === 'header') continue;

    y = ensureSpace(doc, y, 22,
      { refDossier: ctx.numeroDossier, titrePage: ctx.titre });
    y = drawSectionTitle(doc, section.titre, y);

    if (section.type === 'text') {
      const raw = ctx.textOverrides[section.id] ?? section.contenu ?? '';
      const text = interpolate(raw, ctx.variables);
      y = renderText(doc, text, y, ctx);

    } else if (section.type === 'financier') {
      const values = ctx.financierValues[section.id] || {};
      y = renderFinancier(doc, section, values, y, ctx);

    } else if (section.type === 'services_conditionnels') {
      const services = ctx.services || {};
      const labels = ctx.serviceLabels || {};
      const activeKeys = Object.keys(services).filter((k) => services[k]);

      if (activeKeys.length === 0) {
        y = renderText(doc, 'Aucun service souscrit.', y, ctx);
      } else {
        for (const key of activeKeys) {
          y = ensureSpace(doc, y, 8,
            { refDossier: ctx.numeroDossier, titrePage: ctx.titre });
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.green);
          doc.text(`· ${sanitizePdfText(labels[key] || key)}`, marginL + 4, y);
          y += 6;
        }
        y += 3;
      }

    } else if (section.type === 'signatures') {
      y = ensureSpace(doc, y, 45,
        { refDossier: ctx.numeroDossier, titrePage: ctx.titre });

      // Encadré crème avant les signatures
      const ivoireY = y;
      drawIvoryBox(doc, y, 10);
      doc.setFont(FONT.body, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...C.textMuted);
      doc.text(
        sanitizePdfText(
          ctx.textOverrides[section.id] ||
          section.contenu ||
          `Fait a Tours, le ${today}`
        ),
        marginL + 6,
        y + 7,
      );
      y = ivoireY + 14;

      // Zones de signature double colonne
      const colW = contentW / 2 - 6;
      const nomClient = sanitizePdfText(
        ctx.client || ctx.variables?.nom_client || 'Le Client'
      );
      const nomConseiller = sanitizePdfText(ctx.conseiller || 'Anais SAIZONOU');

      drawSignatureZone(
        doc, marginL, y, colW,
        nomClient, 'Client',
        'Signature client',
      );
      drawSignatureZone(
        doc, marginL + contentW / 2 + 6, y, colW,
        nomConseiller, 'Conseiller HUNTERS Immobilier',
        'Pour HUNTERS Immobilier',
      );
      y += 35;
    }
  }

  // ── Pieds de page sur toutes les pages ───────────────────────────────────
  const total = doc.getNumberOfPages();
  const startPage = needsCover ? 2 : 1;
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    if (i >= startPage) {
      drawFooter(doc, i - (needsCover ? 1 : 0), total - (needsCover ? 1 : 0));
    }
  }

  return doc;
}