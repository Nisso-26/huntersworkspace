// Génération PDF pour les documents générés depuis un modèle.
// Charte Hunters : vert #1A4D2E, or #F5A800, Montserrat (Helvetica en fallback jsPDF).
import jsPDF from 'jspdf';
import { fmtPdfEur, fmtPdfNum } from '@/lib/pdf-utils';
import { interpolate } from '@/lib/document-template';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import type { CompanySettings } from '@/hooks/use-company-settings';

const HUNTERS_GREEN: [number, number, number] = [26, 77, 46];
const HUNTERS_GOLD: [number, number, number] = [245, 168, 0];
const TEXT_DARK: [number, number, number] = [44, 44, 44];
const MUTED: [number, number, number] = [120, 120, 120];


export interface DocumentBuildContext {
  titre: string;
  sections: ModeleSection[];
  variables: Record<string, any>;
  // Pour chaque section "financier", valeurs calculées résolues
  financierValues: Record<string, Record<string, number>>;
  // Pour chaque section "text", texte (potentiellement édité) déjà interpolé
  textOverrides: Record<string, string>;
  // Pour chaque section "services_conditionnels", booléens
  services?: Record<string, boolean>;
  serviceLabels?: Record<string, string>;
  numeroDossier?: string | null;
  conseiller?: string | null;
  company?: Partial<CompanySettings> | null;
}

function header(doc: jsPDF, ctx: DocumentBuildContext, pageWidth: number) {
  // Bande verte
  doc.setFillColor(...HUNTERS_GREEN);
  doc.rect(0, 0, pageWidth, 22, 'F');
  // Trait or
  doc.setFillColor(...HUNTERS_GOLD);
  doc.rect(0, 22, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('HUNTERS', 12, 12);
  doc.setTextColor(...HUNTERS_GOLD);
  doc.text(' . ', 33, 12);
  doc.setTextColor(255, 255, 255);
  doc.text('IMMOBILIER', 37, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const adresse = ctx.company?.adresse_siege || '45 Rue Michel Colombe, 37000 Tours';
  const tel = ctx.company?.telephone || '+33 2 59 16 03 37';
  const mail = ctx.company?.email_contact || 'hunters@huntersimmobilier.fr';
  doc.text(`${adresse} · ${tel} · ${mail}`, pageWidth - 12, 12, { align: 'right' });

  if (ctx.numeroDossier) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Réf. ${ctx.numeroDossier}`, pageWidth - 12, 18, { align: 'right' });
  }
}

function footer(doc: jsPDF, pageNumber: number, totalPages: number, pageWidth: number, pageHeight: number) {
  doc.setDrawColor(...HUNTERS_GOLD);
  doc.setLineWidth(0.6);
  doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Hunters Immobilier · Cabinet de conseil en investissement immobilier · Tours',
    12,
    pageHeight - 8,
  );
  doc.text(`Page ${pageNumber} / ${totalPages}`, pageWidth - 12, pageHeight - 8, { align: 'right' });
}

function sectionTitle(doc: jsPDF, label: string, y: number, pageWidth: number): number {
  doc.setFillColor(...HUNTERS_GREEN);
  doc.rect(12, y, 3, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...HUNTERS_GREEN);
  doc.text(label.toUpperCase(), 18, y + 4.5);
  return y + 9;
}

function ensureRoom(doc: jsPDF, y: number, needed: number, pageHeight: number, ctx: DocumentBuildContext, pageWidth: number): number {
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    header(doc, ctx, pageWidth);
    return 30;
  }
  return y;
}

function renderText(doc: jsPDF, text: string, y: number, pageWidth: number, pageHeight: number, ctx: DocumentBuildContext): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_DARK);
  const lines = doc.splitTextToSize(text || '', pageWidth - 24);
  for (const line of lines) {
    y = ensureRoom(doc, y, 6, pageHeight, ctx, pageWidth);
    doc.text(line, 12, y);
    y += 5;
  }
  return y + 2;
}

function renderFinancier(
  doc: jsPDF,
  section: ModeleSection,
  values: Record<string, number>,
  y: number,
  pageWidth: number,
): number {
  const rows = (section.champs || []).map((c) => {
    const v = values[c.key] ?? 0;
    const isPct = /(%|pct|taux|rentabilite|vacance)/i.test(c.key);
    const formatted = isPct ? `${fmtPdfNum(v, 2)} %` : fmtPdfEur(v);
    return [c.label, formatted, c.type === 'calc' ? 'Calculé' : c.type === 'number' ? 'Saisie' : ''];
  });

  autoTable(doc, {
    startY: y,
    head: [['Poste', 'Valeur', 'Type']],
    body: rows,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: TEXT_DARK },
    headStyles: { fillColor: HUNTERS_GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
      2: { cellWidth: 30, textColor: MUTED, fontSize: 8 },
    },
    margin: { left: 12, right: 12 },
  });
  // @ts-expect-error - lastAutoTable provided by autoTable
  return (doc as any).lastAutoTable.finalY + 6;
}

export function buildDocumentPdf(ctx: DocumentBuildContext): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  header(doc, ctx, pageWidth);

  // Titre du document
  let y = 32;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...HUNTERS_GREEN);
  doc.text(ctx.titre, 12, y);
  y += 6;
  doc.setDrawColor(...HUNTERS_GOLD);
  doc.setLineWidth(0.8);
  doc.line(12, y, 60, y);
  y += 8;

  // En-tête contextuel
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const headerLines = [
    `Tours, le ${today}`,
    ctx.variables.nom_client ? `Client : ${ctx.variables.nom_client}` : null,
    ctx.numeroDossier ? `Dossier : ${ctx.numeroDossier}` : null,
    ctx.conseiller ? `Conseiller : ${ctx.conseiller}` : null,
  ].filter(Boolean) as string[];
  for (const l of headerLines) {
    doc.text(l, 12, y);
    y += 4.5;
  }
  y += 4;

  // Sections
  for (const section of ctx.sections) {
    if (section.type === 'header') continue; // déjà rendu

    y = ensureRoom(doc, y, 20, pageHeight, ctx, pageWidth);
    y = sectionTitle(doc, section.titre, y, pageWidth);

    if (section.type === 'text') {
      const raw = ctx.textOverrides[section.id] ?? section.contenu ?? '';
      const text = interpolate(raw, ctx.variables);
      y = renderText(doc, text, y, pageWidth, pageHeight, ctx);
    } else if (section.type === 'financier') {
      const values = ctx.financierValues[section.id] || {};
      y = renderFinancier(doc, section, values, y, pageWidth);
    } else if (section.type === 'services_conditionnels') {
      const services = ctx.services || {};
      const labels = ctx.serviceLabels || {};
      const activeKeys = Object.keys(services).filter((k) => services[k]);
      if (activeKeys.length === 0) {
        y = renderText(doc, 'Aucun service souscrit.', y, pageWidth, pageHeight, ctx);
      } else {
        for (const key of activeKeys) {
          y = ensureRoom(doc, y, 8, pageHeight, ctx, pageWidth);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...HUNTERS_GREEN);
          doc.text(`• ${labels[key] || key}`, 14, y);
          y += 5;
        }
        y += 3;
      }
    } else if (section.type === 'signatures') {
      y = ensureRoom(doc, y, 40, pageHeight, ctx, pageWidth);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT_DARK);
      const colW = (pageWidth - 36) / 2;
      doc.text('Pour Hunters Immobilier', 12, y);
      doc.text('Pour le client', 12 + colW + 12, y);
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.rect(12, y, colW, 28);
      doc.rect(12 + colW + 12, y, colW, 28);
      y += 32;
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text('Date et signature', 12, y);
      doc.text('Date et signature (précédée de "Lu et approuvé")', 12 + colW + 12, y);
      y += 6;
    }
  }

  // Pieds de page sur toutes les pages
  const total = (doc as any).getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    footer(doc, i, total, pageWidth, pageHeight);
  }

  return doc;
}
