// Génération PDF pour les documents générés depuis un modèle.
// Rendu basé sur pdf-design-system : charte Hunters sobre et institutionnelle.
import jsPDF from 'jspdf';
import { fmtPdfEur, fmtPdfNum } from '@/lib/pdf-utils';
import { interpolate } from '@/lib/document-template';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import type { CompanySettings } from '@/hooks/use-company-settings';
import {
  C, T, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, ensureSpace, drawSignatureZone, drawCoverPage,
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
  categorie?: string | null;
}

const COVER_CATEGORIES = new Set([
  'mandat_recherche',
  'convention_honoraires',
  'lettre_mission_amo',
  'lettre_mission_deco',
  'contrat_pack',
]);

const CATEGORIE_LABELS: Record<string, string> = {
  mandat_recherche:       'Mandat de recherche',
  convention_honoraires:  'Convention d’honoraires',
  lettre_mission_amo:     'Lettre de mission AMO',
  lettre_mission_deco:    'Lettre de mission Décoration',
  contrat_pack:           'Contrat Pack clé en main',
  proposition_commerciale:'Proposition commerciale',
  fiche_rentabilite:      'Fiche de rentabilité',
  compte_rendu:           'Compte-rendu de visite',
  autre:                  'Document',
};

function renderText(
  doc: jsPDF,
  text: string,
  y: number,
  ctxHeader: { refDossier?: string | null; titre?: string },
): number {
  const { margin, contentW } = LAYOUT;
  doc.setFont(T.body.font, T.body.style);
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  const lines = doc.splitTextToSize(text || '', contentW);
  for (const line of lines) {
    y = ensureSpace(doc, y, 5.5, ctxHeader);
    doc.text(line, margin, y);
    y += 5.5;
  }
  return y + 3;
}

function renderFinancier(
  doc: jsPDF,
  section: ModeleSection,
  values: Record<string, number>,
  y: number,
  ctxHeader: { refDossier?: string | null; titre?: string },
): number {
  const { margin, contentW } = LAYOUT;
  const left = margin;
  const right = margin + contentW;
  const colTypeX = right - 28;        // colonne type
  const colValueX = colTypeX - 4;     // valeur alignée droite avant type
  const rowH = 6.5;

  // En-tête tableau
  doc.setFillColor(...C.green);
  doc.rect(left, y, contentW, rowH, 'F');
  doc.setTextColor(...C.white);
  doc.setFont(T.tableHeader.font, T.tableHeader.style);
  doc.setFontSize(T.tableHeader.size);
  doc.text('POSTE', left + 3, y + 4.3);
  doc.text('VALEUR', colValueX, y + 4.3, { align: 'right' });
  doc.text('TYPE', colTypeX + 2, y + 4.3);
  y += rowH;

  const champs = section.champs || [];
  let zebra = false;
  let totalKey: string | null = null;
  // Détection ligne de total (clé contenant "total" ou "net" ou "rentabilite")
  for (const c of champs) {
    if (/^(total|resultat_final|rendement_net|cash_flow_net)$/i.test(c.key)) {
      totalKey = c.key;
    }
  }

  for (const c of champs) {
    y = ensureSpace(doc, y, rowH + 2, ctxHeader);
    const isTotal = c.key === totalKey;

    // Fond
    if (isTotal) {
      doc.setFillColor(...C.ivoryDark);
      doc.rect(left, y, contentW, rowH, 'F');
    } else if (zebra) {
      doc.setFillColor(...C.ivory);
      doc.rect(left, y, contentW, rowH, 'F');
    }
    zebra = !zebra;

    const v = values[c.key] ?? 0;
    const isPct = /(%|pct|taux|rentabilite|vacance|rendement)/i.test(c.key);
    const formatted = isPct ? `${fmtPdfNum(v, 2)} %` : fmtPdfEur(v);

    // Label
    doc.setFont(T.tableCell.font, isTotal ? 'bold' : 'normal');
    doc.setFontSize(T.tableCell.size);
    doc.setTextColor(...(isTotal ? C.green : C.textMuted));
    doc.text(c.label, left + 3, y + 4.3);

    // Valeur
    doc.setFont(T.tableCell.font, 'bold');
    doc.setTextColor(...(isTotal ? C.green : C.textDark));
    doc.text(formatted, colValueX, y + 4.3, { align: 'right' });

    // Type
    doc.setFont(T.label.font, T.label.style);
    doc.setFontSize(T.label.size);
    doc.setTextColor(...C.textLight);
    doc.text(c.type === 'calc' ? 'Calculé' : 'Saisie', colTypeX + 2, y + 4.3);

    y += rowH;
  }

  // Bordure légère
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.rect(left, y - rowH * (champs.length + 1) - rowH, contentW, rowH * (champs.length + 1) + rowH);

  return y + 5;
}

export function buildDocumentPdf(ctx: DocumentBuildContext): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { margin, pageW, contentW } = LAYOUT;
  const ctxHeader = { refDossier: ctx.numeroDossier ?? null, titre: ctx.titre };

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ─── Page de couverture pour certaines catégories ──────────────────────
  const hasCover = ctx.categorie ? COVER_CATEGORIES.has(ctx.categorie) : false;
  if (hasCover) {
    // drawCoverPage est async mais sans await interne quand logo=null
    // -> rendu synchrone sur le doc
    void drawCoverPage(doc, {
      logo: null,
      typeDocument: CATEGORIE_LABELS[ctx.categorie!] || 'Document',
      titre: ctx.titre,
      sousTitre: ctx.variables.nom_client ? `Préparé pour ${ctx.variables.nom_client}` : undefined,
      client: ctx.variables.nom_client || '—',
      conseiller: ctx.conseiller || '—',
      refDossier: ctx.numeroDossier ?? null,
      date: today,
      confidentiel: true,
    });
    doc.addPage();
  }

  // ─── En-tête courant ───────────────────────────────────────────────────
  drawHeader(doc, ctxHeader.refDossier, ctxHeader.titre);
  let y = LAYOUT.headerH + 8;

  // Titre du document
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.green);
  doc.text(ctx.titre, margin, y);
  y += 5;
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 40, y);
  y += 7;

  // Bloc contextuel
  doc.setFont(T.label.font, T.label.style);
  doc.setFontSize(T.label.size);
  doc.setTextColor(...C.textMuted);
  const headerLines = [
    `Tours, le ${today}`,
    ctx.variables.nom_client ? `Client : ${ctx.variables.nom_client}` : null,
    ctx.numeroDossier ? `Dossier : ${ctx.numeroDossier}` : null,
    ctx.conseiller ? `Conseiller : ${ctx.conseiller}` : null,
  ].filter(Boolean) as string[];
  for (const l of headerLines) {
    doc.text(l, margin, y);
    y += 4.2;
  }
  y += 5;

  // ─── Sections ──────────────────────────────────────────────────────────
  for (const section of ctx.sections) {
    if (section.type === 'header') continue;

    y = ensureSpace(doc, y, 22, ctxHeader);
    y = drawSectionTitle(doc, section.titre, y);

    if (section.type === 'text') {
      const raw = ctx.textOverrides[section.id] ?? section.contenu ?? '';
      const text = interpolate(raw, ctx.variables);
      y = renderText(doc, text, y, ctxHeader);
    } else if (section.type === 'financier') {
      const values = ctx.financierValues[section.id] || {};
      y = renderFinancier(doc, section, values, y, ctxHeader);
    } else if (section.type === 'services_conditionnels') {
      const services = ctx.services || {};
      const labels = ctx.serviceLabels || {};
      const activeKeys = Object.keys(services).filter((k) => services[k]);
      if (activeKeys.length === 0) {
        y = renderText(doc, 'Aucun service souscrit.', y, ctxHeader);
      } else {
        doc.setFont(T.body.font, T.body.style);
        doc.setFontSize(T.body.size);
        for (const key of activeKeys) {
          y = ensureSpace(doc, y, 6, ctxHeader);
          doc.setTextColor(...C.gold);
          doc.text('▪', margin + 1, y);
          doc.setTextColor(...C.textDark);
          doc.text(labels[key] || key, margin + 6, y);
          y += 5.5;
        }
        y += 3;
      }
    } else if (section.type === 'signatures') {
      y = ensureSpace(doc, y, 38, ctxHeader);
      const colW = (contentW - 10) / 2;
      drawSignatureZone(
        doc,
        margin,
        y,
        colW,
        ctx.variables.nom_client || 'Le client',
        'Client',
        'Signature du client',
      );
      drawSignatureZone(
        doc,
        margin + colW + 10,
        y,
        colW,
        ctx.conseiller || 'HUNTERS Immobilier',
        'Pour HUNTERS Immobilier',
        'Signature du mandataire',
      );
      y += 32;
    }
  }

  // ─── Pied de page sur toutes les pages (hors couverture) ──────────────
  const total = (doc as any).getNumberOfPages();
  const firstContentPage = hasCover ? 2 : 1;
  for (let i = firstContentPage; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i - (hasCover ? 1 : 0), total - (hasCover ? 1 : 0));
  }

  return doc;
}
