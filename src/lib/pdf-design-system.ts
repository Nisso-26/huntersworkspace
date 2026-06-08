// ─── PALETTE ─────────────────────────────────────────────────────────────

export const C = {
  green:      [26, 77, 46]   as [number, number, number], // #1A4D2E
  greenLight: [45, 122, 79]  as [number, number, number], // #2D7A4F
  gold:       [245, 166, 35] as [number, number, number], // #F5A623
  ivory:      [249, 247, 244]as [number, number, number], // #F9F7F4
  ivoryDark:  [232, 242, 236]as [number, number, number], // #E8F2EC
  white:      [255, 255, 255]as [number, number, number],
  textDark:   [44, 44, 44]   as [number, number, number], // #2C2C2C
  textMuted:  [107, 126, 114]as [number, number, number], // #6B7E72
  textLight:  [160, 160, 160]as [number, number, number],
  border:     [212, 226, 217]as [number, number, number], // #D4E2D9
};

// ─── TYPOGRAPHIE ─────────────────────────────────────────────────────────

export const T = {
  coverTitle:    { size: 26, font: 'helvetica', style: 'bold'   },
  coverSubtitle: { size: 13, font: 'helvetica', style: 'normal' },
  sectionTitle:  { size: 12, font: 'helvetica', style: 'bold'   },
  body:          { size: 9.5,font: 'helvetica', style: 'normal' },
  label:         { size: 8,  font: 'helvetica', style: 'normal' },
  small:         { size: 7,  font: 'helvetica', style: 'normal' },
  tableHeader:   { size: 8.5,font: 'helvetica', style: 'bold'   },
  tableCell:     { size: 8.5,font: 'helvetica', style: 'normal' },
  caption:       { size: 7.5,font: 'helvetica', style: 'italic' },
};

// ─── MISE EN PAGE ─────────────────────────────────────────────────────────

export const LAYOUT = {
  pageW:    210,
  pageH:    297,
  margin:   18,
  contentW: 174, // 210 - 18 * 2
  headerH:  14,
  footerY:  282,
};

// ─── FONCTIONS COMMUNES ───────────────────────────────────────────────────

/**
 * Charge le logo HUNTERS depuis les assets
 */
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

/**
 * En-tête courant sobre — sur toutes les pages sauf la couverture
 * Logo textuel uniquement — hauteur 14mm
 */
export function drawHeader(
  doc: any,
  refDossier?: string | null,
  titre?: string,
): void {
  const { pageW, margin, headerH } = LAYOUT;

  // Fond vert fin
  doc.setFillColor(...C.green);
  doc.rect(0, 0, pageW, headerH, 'F');

  // Filet or
  doc.setFillColor(...C.gold);
  doc.rect(0, headerH, pageW, 0.4, 'F');

  // Nom textuel HUNTERS à gauche
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('HUNTERS', margin, 9);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Immobilier · Cabinet de conseil en investissement', margin + 22, 9);

  // Référence dossier + titre à droite
  if (refDossier) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Réf. ${refDossier}`, pageW - margin, 9, { align: 'right' });
  }

  if (titre) {
    doc.setFontSize(7);
    doc.setTextColor(...C.gold);
    doc.text(titre, pageW - margin, 5.5, { align: 'right' });
  }
}

/**
 * Pied de page sobre — filet or + pagination
 */
export function drawFooter(
  doc: any,
  pageNum: number,
  totalPages: number,
  mention?: string,
): void {
  const { pageW, margin, footerY } = LAYOUT;

  // Filet or fin
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(0.4);
  doc.line(margin, footerY, pageW - margin, footerY);

  // Mention gauche
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text(
    mention || 'Hunters Immobilier · 45 rue Michel Colombe, 37000 Tours · huntersimmobilier.fr',
    margin,
    footerY + 5,
  );

  // Pagination droite
  doc.text(`${pageNum} / ${totalPages}`, pageW - margin, footerY + 5, { align: 'right' });
}

/**
 * Titre de section avec barre verte verticale à gauche
 * Style institutionnel sobre
 */
export function drawSectionTitle(
  doc: any,
  label: string,
  y: number,
): number {
  const { margin } = LAYOUT;

  // Barre verte verticale 3mm × 7mm
  doc.setFillColor(...C.green);
  doc.rect(margin, y, 3, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.green);
  doc.text(label, margin + 6, y + 5.2);

  // Filet léger sous le titre
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 9, margin + LAYOUT.contentW, y + 9);

  return y + 13;
}

/**
 * Encadré ivoire — utilisé pour les synthèses et récapitulatifs
 */
export function drawIvoryBox(
  doc: any,
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

/**
 * Vérifie l'espace restant — ajoute une page si nécessaire
 */
export function ensureSpace(
  doc: any,
  y: number,
  needed: number,
  ctx: { refDossier?: string | null; titre?: string },
): number {
  if (y + needed > LAYOUT.footerY - 10) {
    doc.addPage();
    drawHeader(doc, ctx.refDossier, ctx.titre);
    return LAYOUT.headerH + 10;
  }
  return y;
}

/**
 * Zone de signature — ligne manuscrite + nom + qualité imprimés
 */
export function drawSignatureZone(
  doc: any,
  x: number,
  y: number,
  w: number,
  nom: string,
  qualite: string,
  label: string = 'Signature',
): void {
  // Label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(label, x, y);

  // Mention manuscrite
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...C.textLight);
  doc.text('Lu et approuvé — Bon pour accord', x, y + 5);

  // Ligne de signature
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.5);
  doc.line(x, y + 18, x + w, y + 18);

  // Nom et qualité sous la ligne
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.textDark);
  doc.text(nom, x, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(qualite, x, y + 26);
}

/**
 * Page de couverture — pour documents contractuels longs et rapports
 * Logo image en couverture
 */
export async function drawCoverPage(
  doc: any,
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
  const { pageW, pageH, margin } = LAYOUT;

  // Fond vert haut (40% de la page)
  doc.setFillColor(...C.green);
  doc.rect(0, 0, pageW, pageH * 0.42, 'F');

  // Filet or de séparation
  doc.setFillColor(...C.gold);
  doc.rect(0, pageH * 0.42, pageW, 1.2, 'F');

  // Logo image en haut à gauche
  if (opts.logo) {
    try {
      doc.addImage(opts.logo, 'JPEG', margin, 14, 22, 22);
    } catch { /* ignore */ }
  }

  // Nom textuel à côté du logo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HUNTERS', margin + 26, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.gold);
  doc.text('IMMOBILIER', margin + 26, 28);

  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Cabinet de conseil en investissement immobilier', margin + 26, 33);

  // Type de document — petit label or
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text(opts.typeDocument.toUpperCase(), margin, pageH * 0.28);

  // Titre principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  const titreLines = doc.splitTextToSize(opts.titre, pageW - margin * 2);
  doc.text(titreLines, margin, pageH * 0.33);

  // Sous-titre si présent
  if (opts.sousTitre) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(opts.sousTitre, margin, pageH * 0.33 + titreLines.length * 9 + 4);
  }

  // Bloc infos — partie blanche
  const infoY = pageH * 0.42 + 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('Préparé pour', margin, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...C.textDark);
  doc.text(opts.client, margin, infoY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text('Conseiller référent', margin, infoY + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...C.textDark);
  doc.text(opts.conseiller, margin, infoY + 23);

  // Filet vertical or décoratif
  doc.setFillColor(...C.gold);
  doc.rect(margin - 6, infoY - 4, 2, 36, 'F');

  // Référence dossier
  if (opts.refDossier) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(`Référence dossier`, pageW - margin, infoY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.textDark);
    doc.text(opts.refDossier, pageW - margin, infoY + 7, { align: 'right' });
  }

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(opts.date, pageW - margin, infoY + 17, { align: 'right' });

  // Mention confidentiel si applicable
  if (opts.confidentiel) {
    doc.setFillColor(...C.ivoryDark);
    doc.roundedRect(margin, pageH - 30, LAYOUT.contentW, 10, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.green);
    doc.text(
      'Document confidentiel — Usage exclusif de HUNTERS Immobilier et du destinataire',
      pageW / 2,
      pageH - 23.5,
      { align: 'center' }
    );
  }

  // Pied de couverture sobre
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
