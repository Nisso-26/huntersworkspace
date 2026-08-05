import huntersLogoAsset from '@/assets/hunters-symbol-dark.png.asset.json';
import jsPDF from 'jspdf';

// ─── PALETTE CHARTE HUNTERS V2.0 ─────────────────────────────────────────────
// Source : Charte graphique V2.0 — Édition 2026
export const C = {
  green:     [0, 70, 33]     as [number, number, number], // #004621 Vert HUNTERS
  greenDeep: [6, 56, 30]     as [number, number, number], // #06381E Vert profond
  gold:      [200, 150, 47]  as [number, number, number], // #C8962F Or laiton — décor uniquement
  goldText:  [168, 124, 37]  as [number, number, number], // #A87C25 Or renforcé (petits libellés)
  cream:     [244, 236, 216] as [number, number, number], // #F4ECD8 Crème
  creamLight:[250, 247, 239] as [number, number, number], // crème très clair — lignes alternées
  ink:       [35, 41, 31]    as [number, number, number], // #23291F Encre
  white:     [255, 255, 255] as [number, number, number],
  border:    [236, 230, 216] as [number, number, number], // #ECE6D8 filets
  creamDark: [232, 224, 202] as [number, number, number], // crème soutenue — fonds alternés
  textMuted: [107, 117, 102] as [number, number, number], // #6B7566 neutre charte

  // Alias de compatibilité
  textDark:   [35, 41, 31]    as [number, number, number],
  textLight:  [107, 117, 102] as [number, number, number],
  ivory:      [244, 236, 216] as [number, number, number],
  ivoryDark:  [232, 224, 202] as [number, number, number],
  greenLight: [45, 122, 79]   as [number, number, number],
};

// ─── TYPOGRAPHIE ──────────────────────────────────────────────────────────────
// jsPDF n'embarque que Helvetica / Times / Courier
// Substitutions charte V2.0 : Marcellus → times · Jost → helvetica
export const FONT = {
  heading: 'times',
  body:    'helvetica',
};

export const T = {
  coverTitle:    { size: 20,   font: 'times',     style: 'normal' },
  coverBrand:    { size: 26,   font: 'times',     style: 'normal' },
  coverSubtitle: { size: 9,    font: 'helvetica', style: 'normal' },
  sectionTitle:  { size: 20,   font: 'times',     style: 'normal' },
  body:          { size: 11,   font: 'helvetica', style: 'normal' },
  label:         { size: 9,    font: 'helvetica', style: 'normal' },
  small:         { size: 8,    font: 'helvetica', style: 'normal' },
  tableHeader:   { size: 10,   font: 'helvetica', style: 'bold'   },
  tableCell:     { size: 10,   font: 'helvetica', style: 'normal' },
  caption:       { size: 9,    font: 'helvetica', style: 'italic' },
  quote:         { size: 13,   font: 'times',     style: 'italic' },
};

// Rythme vertical (mm) — 1pt ≈ 0.3528mm
export const SPACING = {
  paragraph: 3.5,   // 10pt entre paragraphes
  section:   9.9,   // 28pt entre sections
  bodyLine:  5.8,   // 11pt × 1.5 d'interligne
  afterHead: 4.2,   // 12pt après l'en-tête
};

// ─── GRILLE A4 — CHARTE V2.0 PAGE 7 ──────────────────────────────────────────
export const LAYOUT = {
  pageW:     210,
  pageH:     297,
  marginTop: 20,
  marginBot: 20,
  marginL:   18,
  marginR:   22,
  margin:    18,
  contentW:  170,      // 210 - 18 - 22
  textW:     140,      // largeur de colonne de lecture max
  headerH:   22,
  footerY:   277,
  footerH:   15,
};

// ─── NETTOYAGE TEXTE ─────────────────────────────────────────────────────────
export function sanitizePdfText(s: string): string {
  return (s || '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/!'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tracking (letter-spacing) — em → mm à une taille donnée
function tracking(doc: jsPDF, sizePt: number, em: number): void {
  doc.setCharSpace(sizePt * em * 0.3528);
}
function resetTracking(doc: jsPDF): void {
  doc.setCharSpace(0);
}
// Compense l'espace de tracking ajoute apres le dernier caractere
// pour un texte centre optiquement
function centerOffset(sizePt: number, em: number): number {
  return -(sizePt * em * 0.3528) / 2;
}

// ─── CHARGEMENT LOGO ─────────────────────────────────────────────────────────
export async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(huntersLogoAsset.url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── EN-TÊTE COURANT — 22mm ──────────────────────────────────────────────────
// Logo horizontal textuel vert + libellé de section à droite + filet or 1pt
export function drawHeader(
  doc: jsPDF,
  refDossier?: string | null,
  titrePage?: string,
): void {
  const { pageW, marginL, marginR, headerH } = LAYOUT;

  // Fond blanc — pas de bandeau vert pleine largeur en page intérieure
  doc.setFillColor(...C.white);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Logo horizontal : chevron or + HUNTERS Marcellus 13pt tracking 0.14em
  doc.setFillColor(...C.gold);
  doc.rect(marginL, 11.4, 2.2, 2.2, 'F');

  doc.setTextColor(...C.green);
  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(13);
  tracking(doc, 13, 0.14);
  doc.text('HUNTERS', marginL + 4.5, 13.6);
  resetTracking(doc);

  // Libellé de section à droite — Jost Medium 11pt tracking 0.14em
  if (titrePage) {
    doc.setFont(FONT.body, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.green);
    tracking(doc, 11, 0.14);
    doc.text(sanitizePdfText(titrePage).toUpperCase(), pageW - marginR, 13.6, { align: 'right' });
    resetTracking(doc);
  }

  // Référence dossier — sous le libellé
  if (refDossier) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(`Ref. ${sanitizePdfText(refDossier)}`, pageW - marginR, 18.4, { align: 'right' });
  }

  // Filet or 1pt en bas de l'en-tête
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.35);
  doc.line(marginL, headerH, pageW - marginR, headerH);
}

// Ordonnée de départ du corps après l'en-tête (12pt d'air)
export const bodyStartY = LAYOUT.headerH + SPACING.afterHead;

// ─── PIED DE PAGE — 15mm ─────────────────────────────────────────────────────
export function drawFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  mention?: string,
): void {
  const { pageW, marginL, marginR, footerY } = LAYOUT;

  // Filet or 1pt
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.35);
  doc.line(marginL, footerY, pageW - marginR, footerY);

  // Mention gauche
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  tracking(doc, 7.5, 0.04);
  doc.text('hunters-immobilier.fr', marginL, footerY + 5);

  // Mention droite
  doc.text(
    mention || 'HUNTERS · Document confidentiel',
    pageW - marginR,
    footerY + 5,
    { align: 'right' },
  );
  resetTracking(doc);

  // Pagination centrée — Jost Regular 8pt
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(`${pageNum} / ${totalPages}`, pageW / 2, footerY + 5, { align: 'center' });
}

// ─── TITRE DE SECTION H1 ─────────────────────────────────────────────────────
// Marcellus 20pt + filet or 1.5pt largeur 80pt (≈28mm) + 9pt d'air
export function drawSectionTitle(
  doc: jsPDF,
  label: string,
  y: number,
): number {
  const { marginL } = LAYOUT;

  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(20);
  doc.setTextColor(...C.green);
  doc.text(sanitizePdfText(label), marginL, y + 6.5);

  // Filet or 1.5pt · 80pt
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.53);
  doc.line(marginL, y + 10, marginL + 28, y + 10);

  return y + 10 + 3.2; // 9pt d'air avant le corps
}

// ─── ENCADRÉ CITATION ────────────────────────────────────────────────────────
// Fond crème, bord gauche 3pt vert, padding 16pt (≈5.6mm)
export function drawIvoryBox(
  doc: jsPDF,
  y: number,
  h: number,
  label?: string,
): number {
  const { marginL, contentW } = LAYOUT;

  doc.setFillColor(...C.cream);
  doc.rect(marginL, y, contentW, h, 'F');

  // Bord gauche 3pt vert
  doc.setFillColor(...C.green);
  doc.rect(marginL, y, 1.06, h, 'F');

  if (label) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    tracking(doc, 9, 0.1);
    doc.text(sanitizePdfText(label).toUpperCase(), marginL + 5.6, y + 6.5);
    resetTracking(doc);
    return y + 11;
  }
  return y + 5.6;
}

// Texte de citation — Marcellus italique 13pt vert
export function drawQuote(
  doc: jsPDF,
  texte: string,
  y: number,
  attribution?: string,
): number {
  const { marginL, contentW } = LAYOUT;
  const innerW = contentW - 11.2;
  doc.setFont(FONT.heading, 'italic');
  doc.setFontSize(13);
  const lines = doc.splitTextToSize(sanitizePdfText(texte), innerW) as string[];
  const h = 11.2 + lines.length * 6 + (attribution ? 5 : 0);

  drawIvoryBox(doc, y, h);

  doc.setTextColor(...C.green);
  doc.setFont(FONT.heading, 'italic');
  doc.setFontSize(13);
  doc.text(lines, marginL + 5.6, y + 10);

  if (attribution) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text(sanitizePdfText(attribution), marginL + 5.6, y + 10 + lines.length * 6 + 1);
  }
  return y + h + SPACING.paragraph;
}

// ─── TABLEAU DE DONNÉES ──────────────────────────────────────────────────────
// En-tête vert / texte crème · lignes alternées blanc & crème très clair
// Filets horizontaux 0.5pt uniquement
export function drawTableHeader(
  doc: jsPDF,
  y: number,
  cols: { label: string; x: number; align?: 'left' | 'right' }[],
  h = 8,
): number {
  const { marginL, contentW } = LAYOUT;
  doc.setFillColor(...C.green);
  doc.rect(marginL, y, contentW, h, 'F');
  doc.setFont(FONT.body, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.cream);
  cols.forEach((c) => {
    doc.text(sanitizePdfText(c.label), c.x, y + h / 2 + 1.6, { align: c.align || 'left' });
  });
  return y + h;
}

export function drawTableRow(
  doc: jsPDF,
  y: number,
  cells: { value: string; x: number; align?: 'left' | 'right'; bold?: boolean }[],
  index: number,
  h = 7.5,
): number {
  const { marginL, contentW } = LAYOUT;
  doc.setFillColor(...(index % 2 === 0 ? C.white : C.creamLight));
  doc.rect(marginL, y, contentW, h, 'F');

  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  cells.forEach((c) => {
    doc.setFont(FONT.body, c.bold ? 'bold' : 'normal');
    doc.text(sanitizePdfText(c.value), c.x, y + h / 2 + 1.5, { align: c.align || 'left' });
  });

  // Filet horizontal fin
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.18);
  doc.line(marginL, y + h, marginL + contentW, y + h);

  return y + h;
}

// ─── VÉRIFICATION ESPACE ─────────────────────────────────────────────────────
export function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  ctx: { refDossier?: string | null; titrePage?: string },
): number {
  if (y + needed > LAYOUT.footerY - 8) {
    doc.addPage();
    drawHeader(doc, ctx.refDossier, ctx.titrePage);
    return bodyStartY;
  }
  return y;
}

// ─── ZONE DE SIGNATURE ───────────────────────────────────────────────────────
export function drawSignatureZone(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  nom: string,
  qualite: string,
  label: string = 'Signature',
): void {
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.text(sanitizePdfText(label), x, y);

  doc.setFont(FONT.body, 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('Lu et approuve - Bon pour accord', x, y + 5);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(x, y + 18, x + w, y + 18);

  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...C.ink);
  doc.text(sanitizePdfText(nom), x, y + 23);

  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  doc.text(sanitizePdfText(qualite), x, y + 28);
}

// ─── PAGE DE COUVERTURE ──────────────────────────────────────────────────────
// Bloc haut vert profond #06381E 60% · bloc bas crème 40%
export async function drawCoverPage(
  doc: jsPDF,
  opts: {
    logo: string | null;
    typeDocument: string;
    titre: string;
    sousTitre?: string;
    client: string;
    conseiller: string;
    refDossier?: string | null;
    date: string;
    confidentiel?: boolean;
  }
): Promise<void> {
  const { pageW, pageH, marginL, marginR, contentW } = LAYOUT;
  const split = pageH * 0.6;

  // Bloc haut — vert profond 60%
  doc.setFillColor(...C.greenDeep);
  doc.rect(0, 0, pageW, split, 'F');

  // Filet or de séparation
  doc.setFillColor(...C.gold);
  doc.rect(0, split, pageW, 0.53, 'F');

  // Bloc bas — crème 40%
  doc.setFillColor(...C.cream);
  doc.rect(0, split + 0.53, pageW, pageH - split - 0.53, 'F');

  // Symbole centré (64pt ≈ 22.6mm)
  const symH = 22.6;
  const symW = 20.5;
  if (opts.logo) {
    try {
      doc.addImage(opts.logo, 'PNG', (pageW - symW) / 2, split * 0.38 - symH, symW, symH);
    } catch { /* logo absent */ }
  }

  // HUNTERS — Marcellus 26pt tracking 0.28em, crème
  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(26);
  doc.setTextColor(...C.cream);
  tracking(doc, 26, 0.28);
  doc.text('HUNTERS', pageW / 2 + centerOffset(26, 0.28), split * 0.38 + 10, { align: 'center' });
  resetTracking(doc);

  // Baseline — Jost Light 9pt tracking 0.3em
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.cream);
  tracking(doc, 9, 0.3);
  doc.text('CABINET DE CONSEIL IMMOBILIER', pageW / 2 + centerOffset(9, 0.3), split * 0.38 + 18, { align: 'center' });
  resetTracking(doc);

  // Type de document — petit libellé or sur fond sombre (autorisé)
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  tracking(doc, 9, 0.2);
  doc.text(sanitizePdfText(opts.typeDocument).toUpperCase(), pageW / 2 + centerOffset(9, 0.2), split - 20, { align: 'center' });
  resetTracking(doc);

  // ── Bloc bas crème ────────────────────────────────────────────────────────
  let y = split + 24;

  // Titre document — Marcellus 20pt
  doc.setFont(FONT.heading, 'normal');
  doc.setFontSize(20);
  doc.setTextColor(...C.ink);
  const titreLines = doc.splitTextToSize(sanitizePdfText(opts.titre), contentW) as string[];
  doc.text(titreLines, marginL, y);
  y += titreLines.length * 8;

  // Filet or 1.5pt largeur 32pt (≈11.3mm)
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.53);
  doc.line(marginL, y, marginL + 11.3, y);
  y += 9;

  if (opts.sousTitre) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.textMuted);
    doc.text(sanitizePdfText(opts.sousTitre), marginL, y);
    y += 8;
  }

  // Nom client — Jost Regular 11pt #6B7566
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...C.textMuted);
  doc.text(sanitizePdfText(opts.client), marginL, y);
  y += 7;

  // Conseiller · référence · date — Jost Light 9pt
  doc.setFontSize(9);
  doc.setTextColor(...C.textMuted);
  if (opts.conseiller) {
    doc.text(`Conseiller referent : ${sanitizePdfText(opts.conseiller)}`, marginL, y);
    y += 5;
  }
  if (opts.refDossier) {
    doc.text(`Reference dossier : ${sanitizePdfText(opts.refDossier)}`, marginL, y);
    y += 5;
  }
  doc.text(sanitizePdfText(opts.date), marginL, y);

  // Mention de confidentialité
  if (opts.confidentiel) {
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(
      'Document confidentiel - Usage exclusif HUNTERS Immobilier et du destinataire',
      marginL,
      pageH - 22,
    );
  }

  // Pied de couverture
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(
    '45 rue Michel Colombe, 37000 Tours · hunters-immobilier.fr',
    marginL,
    pageH - 14,
  );
}
