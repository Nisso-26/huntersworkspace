import jsPDF from 'jspdf';

// ─── PALETTE ─────────────────────────────────────────────────────────────────

export const C = {
  green:      [26, 77, 46]    as [number, number, number],
  greenLight: [45, 122, 79]   as [number, number, number],
  gold:       [245, 166, 35]  as [number, number, number],
  ivory:      [249, 247, 244] as [number, number, number],
  ivoryDark:  [232, 242, 236] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  textDark:   [44, 44, 44]    as [number, number, number],
  textMuted:  [107, 126, 114] as [number, number, number],
  textLight:  [160, 160, 160] as [number, number, number],
  border:     [212, 226, 217] as [number, number, number],
};

// ─── MISE EN PAGE ─────────────────────────────────────────────────────────────

export const LAYOUT = {
  pageW:    210,
  pageH:    297,
  margin:   18,
  contentW: 174,
  headerH:  14,
  footerY:  282,
};

// ─── TYPOGRAPHIE ──────────────────────────────────────────────────────────────

export const T = {
  coverTitle:    { size: 26, font: 'helvetica', style: 'bold'   },
  coverSubtitle: { size: 13, font: 'helvetica', style: 'normal' },
  sectionTitle:  { size: 12, font: 'helvetica', style: 'bold'   },
  body:          { size: 9.5, font: 'helvetica', style: 'normal' },
  label:         { size: 8,  font: 'helvetica', style: 'normal' },
  small:         { size: 7,  font: 'helvetica', style: 'normal' },
  tableHeader:   { size: 8.5, font: 'helvetica', style: 'bold'   },
  tableCell:     { size: 8.5, font: 'helvetica', style: 'normal' },
  caption:       { size: 7.5, font: 'helvetica', style: 'italic' },
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────

export async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/assets/hunters-logo.jpg');
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

// ─── EN-TÊTE COURANT ──────────────────────────────────────────────────────────

// Sobre — 14mm — logo textuel uniquement — sur toutes les pages sauf couverture

export function drawHeader(
  doc: jsPDF,
  refDossier?: string | null,
  titrePage?: string,
): void {
  const { pageW, margin, headerH } = LAYOUT;

  doc.setFillColor(...C.green);
  doc.rect(0, 0, pageW, headerH, 'F');

  doc.setFillColor(...C.gold);
  doc.rect(0, headerH, pageW, 0.4, 'F');

  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('HUNTERS', margin, 9);

  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Immobilier · Cabinet de conseil en investissement', margin + 22, 9);

  if (titrePage) {
    doc.setFontSize(7);
    doc.setTextColor(...C.gold);
    doc.text(titrePage, pageW - margin, 5.5, { align: 'right' });
  }

  if (refDossier) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(`Ref. ${refDossier}`, pageW - margin, 9, { align: 'right' });
  }
}

// ─── PIED DE PAGE ─────────────────────────────────────────────────────────────

export function drawFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  mention?: string,
): void {
  const { pageW, margin, footerY } = LAYOUT;

  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text(
    mention || 'Hunters Immobilier · 45 rue Michel Colombe, 37000 Tours · huntersimmobilier.fr',
    margin,
    footerY + 5,
  );

  doc.text(`${pageNum} / ${totalPages}`, pageW - margin, footerY + 5, { align: 'right' });
}

// ─── TITRE DE SECTION ─────────────────────────────────────────────────────────

// Barre verticale verte 3mm + filet léger — jamais de fond plein large

export function drawSectionTitle(
  doc: jsPDF,
  label: string,
  y: number,
): number {
  const { margin, contentW } = LAYOUT;

  doc.setFillColor(...C.green);
  doc.rect(margin, y, 3, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.green);
  doc.text(label, margin + 6, y + 5.2);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 9, margin + contentW, y + 9);

  return y + 13;
}

// ─── ENCADRÉ IVOIRE ───────────────────────────────────────────────────────────

export function drawIvoryBox(
  doc: jsPDF,
  y: number,
  h: number,
  label?: string,
): number {
  const { margin, contentW } = LAYOUT;

  doc.setFillColor(...C.ivoryDark);
  doc.roundedRect(margin, y, contentW, h, 2, 2, 'F');

  if (label) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.green);
    doc.text(label.toUpperCase(), margin + 4, y + 6);
    return y + 10;
  }

  return y + 4;
}

// ─── VÉRIFICATION ESPACE ──────────────────────────────────────────────────────

export function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  ctx: { refDossier?: string | null; titrePage?: string },
): number {
  if (y + needed > LAYOUT.footerY - 10) {
    doc.addPage();
    drawHeader(doc, ctx.refDossier, ctx.titrePage);
    return LAYOUT.headerH + 10;
  }
  return y;
}

// ─── ZONE DE SIGNATURE ────────────────────────────────────────────────────────

// Ligne manuscrite + nom + qualité — 2 colonnes côte à côte

export function drawSignatureZone(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  nom: string,
  qualite: string,
  label: string = 'Signature',
): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  doc.text('Lu et approuve - Bon pour accord', x, y + 5);

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(x, y + 18, x + w, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text(nom, x, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(qualite, x, y + 26);
}

// ─── PAGE DE COUVERTURE ───────────────────────────────────────────────────────

// Logo image en couverture — nom textuel dans l'en-tête courant

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
  const { pageW, pageH, margin, contentW } = LAYOUT;

  // Fond vert haut 42%
  doc.setFillColor(...C.green);
  doc.rect(0, 0, pageW, pageH * 0.42, 'F');

  // Filet or séparation
  doc.setFillColor(...C.gold);
  doc.rect(0, pageH * 0.42, pageW, 1.2, 'F');

  // Logo image en haut à gauche
  if (opts.logo) {
    try { doc.addImage(opts.logo, 'JPEG', margin, 14, 22, 22); } catch { /* ignore */ }
  }

  // Nom textuel à côté du logo
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HUNTERS', margin + 26, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.gold);
  doc.text('IMMOBILIER', margin + 26, 28);

  doc.setFontSize(7);
  doc.setTextColor(...C.white);
  doc.text('Cabinet de conseil en investissement immobilier', margin + 26, 33);

  // Type de document
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text(opts.typeDocument.toUpperCase(), margin, pageH * 0.28);

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  const titreLines = doc.splitTextToSize(opts.titre, contentW);
  doc.text(titreLines, margin, pageH * 0.33);

  // Sous-titre
  if (opts.sousTitre) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text(opts.sousTitre, margin, pageH * 0.33 + titreLines.length * 9 + 4);
  }

  // Bloc infos — partie blanche
  const infoY = pageH * 0.42 + 18;

  // Filet vertical or décoratif
  doc.setFillColor(...C.gold);
  doc.rect(margin - 6, infoY - 4, 2, 36, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('Prepare pour', margin, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.textDark);
  doc.text(opts.client, margin, infoY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('Conseiller referent', margin, infoY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.textDark);
  doc.text(opts.conseiller, margin, infoY + 23);

  if (opts.refDossier) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text('Reference dossier', pageW - margin, infoY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.textDark);
    doc.text(opts.refDossier, pageW - margin, infoY + 7, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(opts.date, pageW - margin, infoY + 17, { align: 'right' });

  // Mention confidentiel
  if (opts.confidentiel) {
    doc.setFillColor(...C.ivoryDark);
    doc.roundedRect(margin, pageH - 30, contentW, 10, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.green);
    doc.text(
      'Document confidentiel - Usage exclusif HUNTERS Immobilier et du destinataire',
      pageW / 2,
      pageH - 23.5,
      { align: 'center' }
    );
  }

  // Pied de couverture
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  doc.text(
    '45 rue Michel Colombe, 37000 Tours · huntersimmobilier.fr',
    pageW / 2,
    pageH - 10,
    { align: 'center' }
  );
}

// ─── NETTOYAGE TEXTE ──────────────────────────────────────────────────────────

// Supprime les caractères non supportés par Helvetica jsPDF

export function sanitizePdfText(s: string): string {
  return (s || '')
    .replace(/[\u202F\u00A0]/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/!'/g, '')
    .trim();
}
