import huntersLogoAsset from '@/assets/hunters-symbol-dark.png.asset.json';
import jsPDF from 'jspdf';

// ─── PALETTE CHARTE HUNTERS V2.0 ─────────────────────────────────────────────

// Source : Charte graphique V2.0 — Édition 2026

// Pantone et CMJN conformes au référentiel officiel

export const C = {

  green:     [0, 70, 33]     as [number, number, number], // #004621 Vert HUNTERS

  greenDeep: [6, 56, 30]     as [number, number, number], // #06381E Vert profond

  gold:      [200, 150, 47]  as [number, number, number], // #C8962F Or laiton — décor/fond sombre uniquement

  goldText:  [168, 124, 37]  as [number, number, number], // #A87C25 Or renforcé — texte sur fond clair

  cream:     [244, 236, 216] as [number, number, number], // #F4ECD8 Crème

  ink:       [35, 41, 31]    as [number, number, number], // #23291F Encre

  white:     [255, 255, 255] as [number, number, number],

  border:    [220, 214, 196] as [number, number, number], // crème foncée — filets

  creamDark: [232, 224, 202] as [number, number, number], // crème soutenue — fonds alternés

  textMuted: [107, 117, 102] as [number, number, number], // #6B7566 neutre charte

  // Alias de compatibilité — mappés sur la palette charte V2.0
  textDark:   [35, 41, 31]    as [number, number, number], // → C.ink
  textLight:  [107, 117, 102] as [number, number, number], // → C.textMuted
  ivory:      [244, 236, 216] as [number, number, number], // → C.cream
  ivoryDark:  [232, 224, 202] as [number, number, number], // → C.creamDark
  greenLight: [45, 122, 79]   as [number, number, number], // → couleur d'état succès (digital only)

  // Couleurs d'état — DIGITAL UNIQUEMENT — jamais dans les PDFs clients (charte V2.0 p.6)

  // Ne pas utiliser dans les fonctions de rendu PDF

};

// ─── TYPOGRAPHIE — EXPORT T ───────────────────────────────────────────────────
// Alias utilisés par les fichiers PDF existants
// Substitutions charte V2.0 : Marcellus → times · Jost → helvetica
export const T = {
  coverTitle:    { size: 24,   font: 'times',     style: 'normal' },
  coverSubtitle: { size: 10,   font: 'helvetica', style: 'normal' },
  sectionTitle:  { size: 13,   font: 'times',     style: 'normal' },
  body:          { size: 9.5,  font: 'helvetica', style: 'normal' },
  label:         { size: 8,    font: 'helvetica', style: 'normal' },
  small:         { size: 7,    font: 'helvetica', style: 'normal' },
  tableHeader:   { size: 8.5,  font: 'helvetica', style: 'bold'   },
  tableCell:     { size: 8.5,  font: 'helvetica', style: 'normal' },
  caption:       { size: 7.5,  font: 'helvetica', style: 'italic' },
};

// ─── GRILLE A4 — CHARTE V2.0 PAGE 7 ─────────────────────────────────────────

// Marges : 20mm haut · 20mm bas · 18mm gauche · 22mm droite

// En-tête : 22mm · Pied de page : 15mm

export const LAYOUT = {

  pageW:     210,

  pageH:     297,

  marginTop: 20,

  marginBot: 20,

  marginL:   18,

  marginR:   22,

  margin:    18,       // alias — préférer marginL/marginR pour précision

  contentW:  170,      // 210 - 18 - 22

  headerH:   22,       // charte : zone réservée en-tête 22mm

  footerY:   277,      // 297 - 20mm

  footerH:   15,

};

// ─── TYPOGRAPHIE PDF ──────────────────────────────────────────────────────────

// jsPDF embarque uniquement Helvetica, Times et Courier

// Substitutions officielles charte V2.0 page 6 :

//   Marcellus → Times New Roman → 'times' dans jsPDF

//   Jost      → Arial / Helvetica Neue → 'helvetica' dans jsPDF

export const FONT = {

  heading: 'times',      // Marcellus → Times

  body:    'helvetica',  // Jost → Helvetica

};

// ─── NETTOYAGE TEXTE ─────────────────────────────────────────────────────────

// Supprime les caractères non supportés par Helvetica/Times jsPDF

// Corrige les artefacts d'encodage identifiés dans les PDFs existants

export function sanitizePdfText(s: string): string {

  return (s || '')

    .replace(/[\u202F\u00A0]/g, ' ')   // espaces insécables

    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '') // caractères hors latin

    .replace(/!'/g, '')                 // artefact historique

    .replace(/\s+/g, ' ')

    .trim();

}

// ─── CHARGEMENT LOGO ─────────────────────────────────────────────────────────

// Logo image en couverture uniquement — nom textuel dans l'en-tête courant

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

// ─── EN-TÊTE COURANT ─────────────────────────────────────────────────────────

// 22mm — logo horizontal textuel + filet or — charte page 7

// Logo image uniquement en couverture — pas ici

export function drawHeader(

  doc: jsPDF,

  refDossier?: string | null,

  titrePage?: string,

): void {

  const { pageW, marginL, marginR, headerH } = LAYOUT;

  // Fond vert HUNTERS #004621

  doc.setFillColor(...C.green);

  doc.rect(0, 0, pageW, headerH, 'F');

  // Filet or sous l'en-tête — 1pt charte page 7

  doc.setFillColor(...C.gold);

  doc.rect(0, headerH, pageW, 0.35, 'F');

  // HUNTERS — or sur vert = combinaison autorisée charte

  doc.setTextColor(...C.gold);

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(11);

  doc.text('HUNTERS', marginL, 13);

  // Sous-titre sobre

  doc.setTextColor(...C.cream);

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.text('Cabinet de conseil en investissement immobilier', marginL + 26, 13);

  // Titre de page — or à droite

  if (titrePage) {

    doc.setFontSize(7);

    doc.setTextColor(...C.goldText);

    doc.text(sanitizePdfText(titrePage), pageW - marginR, 8, { align: 'right' });

  }

  // Référence dossier

  if (refDossier) {

    doc.setFont(FONT.body, 'normal');

    doc.setFontSize(7.5);

    doc.setTextColor(...C.cream);

    doc.text(`Ref. ${sanitizePdfText(refDossier)}`, pageW - marginR, 14.5, { align: 'right' });

  }

}

// ─── PIED DE PAGE ─────────────────────────────────────────────────────────────

// 15mm — filet or + numéro centré + URL — charte page 7

export function drawFooter(

  doc: jsPDF,

  pageNum: number,

  totalPages: number,

  mention?: string,

): void {

  const { pageW, marginL, marginR, footerY } = LAYOUT;

  // Filet or 1pt — charte page 7

  doc.setDrawColor(...C.gold);

  doc.setLineWidth(0.35);

  doc.line(marginL, footerY, pageW - marginR, footerY);

  // Mention gauche

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7);

  doc.setTextColor(...C.textMuted);

  doc.text(

    mention || 'Hunters Immobilier · 45 rue Michel Colombe, 37000 Tours · huntersimmobilier.fr',

    marginL,

    footerY + 5,
  );

  // Pagination droite

  doc.text(

    `${pageNum} / ${totalPages}`,

    pageW - marginR,

    footerY + 5,

    { align: 'right' }

  );

}

// ─── TITRE DE SECTION H2 ──────────────────────────────────────────────────────

// Barre verticale vert 3mm + filet or 40mm — charte page 7

export function drawSectionTitle(

  doc: jsPDF,

  label: string,

  y: number,

): number {

  const { marginL } = LAYOUT;

  // Barre verticale verte 3mm × 8mm

  doc.setFillColor(...C.green);

  doc.rect(marginL, y, 3, 8, 'F');

  // Titre H2 — Times (Marcellus) 13pt

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(13);

  doc.setTextColor(...C.green);

  doc.text(sanitizePdfText(label), marginL + 7, y + 6.2);

  // Filet or 1pt · 40mm — charte page 7

  doc.setDrawColor(...C.gold);

  doc.setLineWidth(0.35);

  doc.line(marginL, y + 10, marginL + 40, y + 10);

  return y + 15;

}

// ─── ENCADRÉ CRÈME ────────────────────────────────────────────────────────────

// Fond crème + bord gauche 3pt vert — encadré citation charte page 7

export function drawIvoryBox(

  doc: jsPDF,

  y: number,

  h: number,

  label?: string,

): number {

  const { marginL, contentW } = LAYOUT;

  // Fond crème

  doc.setFillColor(...C.cream);

  doc.roundedRect(marginL, y, contentW, h, 2, 2, 'F');

  // Bord gauche 3pt vert — charte

  doc.setFillColor(...C.green);

  doc.rect(marginL, y, 2.5, h, 'F');

  if (label) {

    doc.setFont(FONT.body, 'normal');

    doc.setFontSize(7.5);

    doc.setTextColor(...C.textMuted);

    doc.text(sanitizePdfText(label).toUpperCase(), marginL + 6, y + 6.5);

    return y + 11;

  }

  return y + 5;

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

    return LAYOUT.headerH + 8;

  }

  return y;

}

// ─── ZONE DE SIGNATURE ────────────────────────────────────────────────────────

// Ligne manuscrite + nom (Times/Marcellus) + qualité (Helvetica/Jost)

export function drawSignatureZone(

  doc: jsPDF,

  x: number,

  y: number,

  w: number,

  nom: string,

  qualite: string,

  label: string = 'Signature',

): void {

  // Label

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(...C.textMuted);

  doc.text(sanitizePdfText(label), x, y);

  // Mention manuscrite

  doc.setFont(FONT.body, 'italic');

  doc.setFontSize(7);

  doc.setTextColor(...C.textMuted);

  doc.text('Lu et approuve - Bon pour accord', x, y + 5);

  // Ligne de signature — filet crème foncée

  doc.setDrawColor(...C.border);

  doc.setLineWidth(0.5);

  doc.line(x, y + 18, x + w, y + 18);

  // Nom — Times (Marcellus) encre

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(9);

  doc.setTextColor(...C.ink);

  doc.text(sanitizePdfText(nom), x, y + 23);

  // Qualité — Helvetica (Jost) muted

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(...C.textMuted);

  doc.text(sanitizePdfText(qualite), x, y + 28);

}

// ─── PAGE DE COUVERTURE ───────────────────────────────────────────────────────

// Fond vert profond #06381E haut 42% + crème bas 58% — charte pages 8-9

// Logo image en couverture uniquement

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

  // Fond vert profond haut 42%

  doc.setFillColor(...C.greenDeep);

  doc.rect(0, 0, pageW, pageH * 0.42, 'F');

  // Filet or séparation — 1.2mm

  doc.setFillColor(...C.gold);

  doc.rect(0, pageH * 0.42, pageW, 1.2, 'F');

  // Fond crème bas 58% — charte page 8

  doc.setFillColor(...C.cream);

  doc.rect(0, pageH * 0.42 + 1.2, pageW, pageH * 0.58, 'F');

  // Logo image en haut à gauche

  if (opts.logo) {

    try {

      doc.addImage(opts.logo, 'JPEG', marginL, 14, 22, 22);

    } catch { /* ignore si logo absent */ }

  }

  // HUNTERS — Times/Marcellus or sur vert profond = autorisé charte

  doc.setTextColor(...C.gold);

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(13);

  doc.text('HUNTERS', marginL + 26, 22);

  // Sous-nom — crème

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(8);

  doc.setTextColor(...C.cream);

  doc.text('CABINET DE CONSEIL IMMOBILIER', marginL + 26, 29);

  // Type document — H4 style charte : caps, espacé

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(8);

  doc.setTextColor(...C.gold);

  doc.text(

    sanitizePdfText(opts.typeDocument).toUpperCase(),

    marginL,

    pageH * 0.28

  );

  // Titre principal — Times H1 charte 24pt — crème sur vert

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(24);

  doc.setTextColor(...C.cream);

  const titreLines = doc.splitTextToSize(sanitizePdfText(opts.titre), contentW);

  doc.text(titreLines, marginL, pageH * 0.33);

  // Sous-titre

  if (opts.sousTitre) {

    doc.setFont(FONT.body, 'normal');

    doc.setFontSize(10);

    doc.setTextColor(...C.cream);

    doc.text(

      sanitizePdfText(opts.sousTitre),

      marginL,

      pageH * 0.33 + titreLines.length * 9 + 5

    );

  }

  // ── Bloc infos — partie crème ─────────────────────────────────────────────

  const infoY = pageH * 0.42 + 16;

  // Filet vertical or décoratif

  doc.setFillColor(...C.gold);

  doc.rect(marginL - 6, infoY - 2, 2, 34, 'F');

  // Préparé pour

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(...C.textMuted);

  doc.text('Prepare pour', marginL, infoY);

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(14);

  doc.setTextColor(...C.ink);

  doc.text(sanitizePdfText(opts.client), marginL, infoY + 8);

  // Conseiller

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(...C.textMuted);

  doc.text('Conseiller referent', marginL, infoY + 18);

  doc.setFont(FONT.heading, 'normal');

  doc.setFontSize(10);

  doc.setTextColor(...C.ink);

  doc.text(sanitizePdfText(opts.conseiller), marginL, infoY + 25);

  // Référence dossier à droite

  if (opts.refDossier) {

    doc.setFont(FONT.body, 'normal');

    doc.setFontSize(7.5);

    doc.setTextColor(...C.textMuted);

    doc.text('Reference dossier', pageW - marginR, infoY, { align: 'right' });

    doc.setFont(FONT.heading, 'normal');

    doc.setFontSize(10);

    doc.setTextColor(...C.ink);

    doc.text(sanitizePdfText(opts.refDossier), pageW - marginR, infoY + 8, { align: 'right' });

  }

  // Date

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7.5);

  doc.setTextColor(...C.textMuted);

  doc.text(sanitizePdfText(opts.date), pageW - marginR, infoY + 18, { align: 'right' });

  // Encadré confidentiel — fond crème soutenu + bord vert gauche

  if (opts.confidentiel) {

    doc.setFillColor(...C.creamDark);

    doc.roundedRect(marginL, pageH - 28, contentW, 9, 1, 1, 'F');

    doc.setFillColor(...C.green);

    doc.rect(marginL, pageH - 28, 2.5, 9, 'F');

    doc.setFont(FONT.body, 'normal');

    doc.setFontSize(7.5);

    doc.setTextColor(...C.green);

    doc.text(

      'Document confidentiel - Usage exclusif HUNTERS Immobilier et du destinataire',

      pageW / 2,

      pageH - 22.5,

      { align: 'center' }

    );

  }

  // Pied de couverture sobre

  doc.setFont(FONT.body, 'normal');

  doc.setFontSize(7);

  doc.setTextColor(...C.textMuted);

  doc.text(

    '45 rue Michel Colombe, 37000 Tours · huntersimmobilier.fr',

    pageW / 2,

    pageH - 10,

    { align: 'center' }

  );

}
