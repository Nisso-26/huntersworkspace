// Rapport de suivi chantier — rendu basé sur pdf-design-system.
import { supabase } from '@/integrations/supabase/client';
import type { Chantier } from '@/hooks/use-chantiers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { fmtPdfEur, fmtPdfNum } from '@/lib/pdf-utils';
import {
  C, T, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, ensureSpace, loadLogo,
} from '@/lib/pdf-design-system';

const RED: [number, number, number] = [192, 57, 43];

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateChantierPdf(chantier: Chantier) {
  const { default: jsPDF } = await import('jspdf');
  await loadLogo(); // chargé pour parité, non utilisé sur en-tête sobre
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { margin, contentW, pageW, headerH } = LAYOUT;
  const titre = `Rapport chantier · ${chantier.reference}`;
  const ctxHeader = { refDossier: chantier.reference, titre };

  drawHeader(doc, chantier.reference, titre);
  let y = headerH + 10;

  // ─── INFOS GÉNÉRALES ────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Informations générales', y);
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);

  const infos: Array<[string, string]> = [
    ['Bien',         `${chantier.bien_reference || '—'}${chantier.bien_ville ? ` (${chantier.bien_ville})` : ''}`],
    ['Conseiller',   chantier.mandataire_name || '—'],
    ['Statut',       chantier.statut],
    ['Début prévu',  chantier.date_debut_prevue || '—'],
    ['Fin prévue',   chantier.date_fin_prevue || '—'],
  ];
  infos.forEach(([label, val]) => {
    doc.setTextColor(...C.textMuted);
    doc.setFont('helvetica', 'normal');
    doc.text(`${label}`, margin, y);
    doc.setTextColor(...C.textDark);
    doc.setFont('helvetica', 'bold');
    doc.text(val, margin + 36, y);
    y += 5.5;
  });
  y += 4;

  // ─── RÉCAPITULATIF BUDGÉTAIRE ───────────────────────────────────────
  y = ensureSpace(doc, y, 40, ctxHeader);
  y = drawSectionTitle(doc, 'Récapitulatif budgétaire', y);

  const lots = chantier.lots || [];
  const totalDevis = lots.reduce((s, l) => s + l.montant_devis, 0);
  const totalEngage = lots.reduce((s, l) => s + l.montant_engage, 0);
  const totalFacture = lots.reduce((s, l) => s + l.montant_facture, 0);
  const budgetAlloue = chantier.budget_alloue;
  const pct = budgetAlloue > 0 ? Math.min(100, (totalFacture / budgetAlloue) * 100) : 0;
  const overBudget = totalFacture > budgetAlloue;

  // Encadré ivoire 4 valeurs clés
  drawIvoryBox(doc, y, 22);
  const valsW = contentW / 4;
  const vals: Array<[string, string]> = [
    ['Budget alloué', fmtPdfEur(budgetAlloue)],
    ['Total devis',   fmtPdfEur(totalDevis)],
    ['Engagé',        fmtPdfEur(totalEngage)],
    ['Facturé',       fmtPdfEur(totalFacture)],
  ];
  vals.forEach(([label, value], i) => {
    const x = margin + i * valsW + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(label.toUpperCase(), x, y + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...C.green);
    doc.text(value, x, y + 17);
  });
  y += 28;

  // Barre de progression
  doc.setFont(T.label.font, T.label.style);
  doc.setFontSize(T.label.size);
  doc.setTextColor(...C.textMuted);
  doc.text(`Consommation budgétaire : ${Math.round(pct)}%${overBudget ? ' — dépassement' : ''}`, margin, y);
  y += 3;
  doc.setFillColor(...C.border);
  doc.roundedRect(margin, y, contentW, 5, 1, 1, 'F');
  doc.setFillColor(...(overBudget ? C.gold : C.green));
  doc.roundedRect(margin, y, contentW * (pct / 100), 5, 1, 1, 'F');
  y += 11;

  // ─── TABLEAU DES LOTS ───────────────────────────────────────────────
  y = ensureSpace(doc, y, 20, ctxHeader);
  y = drawSectionTitle(doc, 'Lots et artisans', y);

  const cols = [
    { x: margin,             w: 50, label: 'Lot',     align: 'left'  as const },
    { x: margin + 50,        w: 38, label: 'Artisan', align: 'left'  as const },
    { x: margin + 88 + 22,   w: 0,  label: 'Devis',   align: 'right' as const },
    { x: margin + 88 + 44,   w: 0,  label: 'Engagé',  align: 'right' as const },
    { x: margin + 88 + 64,   w: 0,  label: 'Facturé', align: 'right' as const },
    { x: margin + 88 + 84,   w: 0,  label: 'Reste',   align: 'right' as const },
  ];

  const rowH = 6.2;
  // En-tête
  doc.setFillColor(...C.ivoryDark);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFont(T.tableHeader.font, T.tableHeader.style);
  doc.setFontSize(T.tableHeader.size);
  doc.setTextColor(...C.green);
  cols.forEach(c => {
    doc.text(c.label.toUpperCase(), c.x + (c.align === 'right' ? 0 : 1), y + 4.2, { align: c.align });
  });
  y += rowH;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);

  lots.forEach((lot, i) => {
    y = ensureSpace(doc, y, rowH, ctxHeader);
    if (i % 2 === 1) {
      doc.setFillColor(...C.ivory);
      doc.rect(margin, y, contentW, rowH, 'F');
    }
    const reste = lot.montant_devis - lot.montant_facture;
    doc.setFont(T.tableCell.font, 'normal');
    doc.setFontSize(T.tableCell.size);
    doc.setTextColor(...C.textDark);
    doc.text((lot.designation || '').substring(0, 28), cols[0].x + 1, y + 4.2);
    doc.setTextColor(...C.textMuted);
    doc.text((lot.artisan || '—').substring(0, 22), cols[1].x + 1, y + 4.2);
    doc.setTextColor(...C.textDark);
    doc.text(fmtPdfNum(lot.montant_devis, 0), cols[2].x, y + 4.2, { align: 'right' });
    doc.text(fmtPdfNum(lot.montant_engage, 0), cols[3].x, y + 4.2, { align: 'right' });
    doc.text(fmtPdfNum(lot.montant_facture, 0), cols[4].x, y + 4.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(reste < 0 ? RED : C.green));
    doc.text(fmtPdfNum(reste, 0), cols[5].x, y + 4.2, { align: 'right' });

    // Bordure horizontale uniquement
    doc.line(margin, y + rowH, margin + contentW, y + rowH);
    y += rowH;
  });

  // Total
  y = ensureSpace(doc, y, rowH + 4, ctxHeader);
  doc.setFillColor(...C.ivoryDark);
  doc.rect(margin, y, contentW, rowH, 'F');
  const totalReste = totalDevis - totalFacture;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(T.tableCell.size);
  doc.setTextColor(...C.green);
  doc.text('TOTAL', cols[0].x + 1, y + 4.2);
  doc.setTextColor(...C.textDark);
  doc.text(fmtPdfNum(totalDevis, 0),   cols[2].x, y + 4.2, { align: 'right' });
  doc.text(fmtPdfNum(totalEngage, 0),  cols[3].x, y + 4.2, { align: 'right' });
  doc.text(fmtPdfNum(totalFacture, 0), cols[4].x, y + 4.2, { align: 'right' });
  doc.setTextColor(...(totalReste < 0 ? RED : C.green));
  doc.text(fmtPdfNum(totalReste, 0),   cols[5].x, y + 4.2, { align: 'right' });
  y += rowH + 6;

  // Mention déco
  if (chantier.total_deco) {
    doc.setFont(T.label.font, T.label.style);
    doc.setFontSize(T.label.size);
    doc.setTextColor(...C.textMuted);
    doc.text(`Décoration & ameublement : ${fmtPdfEur(chantier.total_deco)}`, margin, y);
    y += 8;
  }

  // ─── VISITES ────────────────────────────────────────────────────────
  const visites = chantier.visites || [];
  if (visites.length > 0) {
    y = ensureSpace(doc, y, 20, ctxHeader);
    y = drawSectionTitle(doc, 'Comptes-rendus de visite', y);

    for (const visite of visites) {
      y = ensureSpace(doc, y, 30, ctxHeader);
      // Bandeau ivoire (rule 1 : pas de vert pleine largeur hors header/footer/cover)
      doc.setFillColor(...C.ivoryDark);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.green);
      doc.text(format(new Date(visite.date_visite), 'dd/MM/yyyy HH:mm', { locale: fr }), margin + 3, y + 4.8);
      if (visite.personnes_presentes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...C.textMuted);
        doc.text(`Présents : ${visite.personnes_presentes}`, pageW - margin - 3, y + 4.8, { align: 'right' });
      }
      y += 11;

      if (visite.observations) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.green);
        doc.text('Observations', margin, y);
        y += 4;
        doc.setFont(T.body.font, 'normal');
        doc.setFontSize(T.body.size);
        doc.setTextColor(...C.textDark);
        const lines = doc.splitTextToSize(visite.observations, contentW);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5, ctxHeader);
          doc.text(line, margin, y);
          y += 5.5;
        }
        y += 2;
      }

      if (visite.points_vigilance) {
        y = ensureSpace(doc, y, 10, ctxHeader);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.gold);
        doc.text('Points de vigilance', margin, y);
        y += 4;
        doc.setFont(T.body.font, 'normal');
        doc.setFontSize(T.body.size);
        doc.setTextColor(...C.textDark);
        const lines = doc.splitTextToSize(visite.points_vigilance, contentW);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5, ctxHeader);
          doc.text(line, margin, y);
          y += 5.5;
        }
        y += 2;
      }

      // Photos grid (2x3)
      if (visite.photos && visite.photos.length > 0) {
        y = ensureSpace(doc, y, 40, ctxHeader);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.green);
        doc.text('Photos', margin, y);
        y += 4;
        const photoUrls = visite.photos.slice(0, 6);
        const photoW = (contentW - 4) / 3;
        const photoH = 32;
        let col = 0;
        const startY = y;
        for (const photo of photoUrls) {
          const url = supabase.storage.from('visites-photos').getPublicUrl(photo.file_path).data.publicUrl;
          const img = await loadImageAsBase64(url);
          if (img) {
            const x = margin + (col % 3) * (photoW + 2);
            const py = startY + Math.floor(col / 3) * (photoH + 2);
            y = ensureSpace(doc, py + photoH, 0, ctxHeader);
            try {
              doc.addImage(img, 'JPEG', x, py, photoW, photoH);
            } catch { /* skip */ }
          }
          col++;
        }
        y = startY + Math.ceil(photoUrls.length / 3) * (photoH + 2) + 2;
      }

      // Actions
      if (visite.prochaines_actions.length > 0) {
        y = ensureSpace(doc, y, 12, ctxHeader);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.green);
        doc.text('Prochaines actions', margin, y);
        y += 4;
        doc.setFont(T.body.font, 'normal');
        doc.setFontSize(T.body.size);
        doc.setTextColor(...C.textDark);
        visite.prochaines_actions.forEach(a => {
          y = ensureSpace(doc, y, 5, ctxHeader);
          doc.text(`• ${a.action} — ${a.responsable}${a.deadline ? ` (${a.deadline})` : ''}`, margin + 2, y);
          y += 5.5;
        });
      }
      y += 6;
    }
  }

  // ─── PIEDS DE PAGE ──────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, `HUNTERS · Rapport chantier ${chantier.reference}`);
  }

  doc.save(`rapport-chantier-${chantier.reference}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
