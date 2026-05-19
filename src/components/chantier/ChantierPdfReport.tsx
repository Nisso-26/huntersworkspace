// jsPDF chargé dynamiquement dans generateChantierPdf pour alléger le bundle initial
import { supabase } from '@/integrations/supabase/client';
import type { Chantier } from '@/hooks/use-chantiers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const GREEN = [26, 77, 46] as const;
const GOLD = [212, 160, 23] as const;

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
  const doc = new jsPDF();
  const w = 210;
  let y = 0;

  // Helper
  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (need: number) => { if (y + need > 275) addPage(); };

  // Header bar
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, w, 30, 'F');
  doc.setTextColor(...GOLD);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('HUNTERS', 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('Chasseur Immobilier', 14, 22);
  doc.setFontSize(11);
  doc.text(`Rapport de suivi chantier`, w - 14, 12, { align: 'right' });
  doc.setFontSize(9);
  doc.text(`${chantier.reference} — ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, w - 14, 20, { align: 'right' });

  y = 40;

  // Infos générales
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informations générales', 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const infos = [
    ['Bien', `${chantier.bien_reference || '—'} ${chantier.bien_ville ? `(${chantier.bien_ville})` : ''}`],
    ['Conseiller', chantier.mandataire_name || '—'],
    ['Statut', chantier.statut],
    ['Début prévu', chantier.date_debut_prevue || '—'],
    ['Fin prévue', chantier.date_fin_prevue || '—'],
  ];
  infos.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 50, y);
    y += 5;
  });

  // Budget summary
  y += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Récapitulatif budgétaire', 14, y);
  y += 8;

  const lots = chantier.lots || [];
  const totalDevis = lots.reduce((s, l) => s + l.montant_devis, 0);
  const totalEngage = lots.reduce((s, l) => s + l.montant_engage, 0);
  const totalFacture = lots.reduce((s, l) => s + l.montant_facture, 0);
  const budgetAlloue = chantier.budget_alloue;
  const pct = budgetAlloue > 0 ? Math.min(100, (totalFacture / budgetAlloue) * 100) : 0;

  // Progress bar
  doc.setFillColor(230, 230, 230);
  doc.rect(14, y, 120, 5, 'F');
  const barColor = totalFacture > budgetAlloue ? [220, 50, 50] : GREEN;
  doc.setFillColor(...(barColor as [number, number, number]));
  doc.rect(14, y, 120 * (pct / 100), 5, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`${Math.round(pct)}%`, 138, y + 4);
  y += 10;

  // Lots table header
  doc.setFontSize(8);
  doc.setFillColor(240, 240, 240);
  doc.rect(14, y, w - 28, 6, 'F');
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  const cols = [14, 50, 85, 105, 130, 155, 175];
  const headers = ['Lot', 'Artisan', 'Devis', 'Engagé', 'Facturé', 'Reste', '%'];
  headers.forEach((h, i) => doc.text(h, cols[i], y + 4));
  y += 8;

  doc.setFont('helvetica', 'normal');
  lots.forEach(lot => {
    checkPage(6);
    doc.text(lot.designation.substring(0, 20), cols[0], y);
    doc.text((lot.artisan || '—').substring(0, 18), cols[1], y);
    doc.text(fmtPdfNum(lot.montant_devis, 0), cols[2], y);
    doc.text(fmtPdfNum(lot.montant_engage, 0), cols[3], y);
    doc.text(fmtPdfNum(lot.montant_facture, 0), cols[4], y);
    doc.text(fmtPdfNum(lot.montant_devis - lot.montant_facture, 0), cols[5], y);
    doc.text(`${lot.avancement}%`, cols[6], y);
    y += 5;
  });

  // Totals
  checkPage(8);
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', cols[0], y);
  doc.text(fmtPdfNum(totalDevis, 0), cols[2], y);
  doc.text(fmtPdfNum(totalEngage, 0), cols[3], y);
  doc.text(fmtPdfNum(totalFacture, 0), cols[4], y);
  doc.text(fmtPdfNum(totalDevis - totalFacture, 0), cols[5], y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Budget alloué: ${fmtPdfEur(budgetAlloue)} | Déco: ${fmtPdfEur(chantier.total_deco || 0)}`, 14, y);
  y += 10;

  // Visites
  const visites = chantier.visites || [];
  if (visites.length > 0) {
    checkPage(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Comptes-rendus de visite', 14, y);
    y += 8;

    for (const visite of visites) {
      checkPage(30);
      doc.setFillColor(...GREEN);
      doc.rect(14, y, w - 28, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(format(new Date(visite.date_visite), 'dd/MM/yyyy HH:mm', { locale: fr }), 16, y + 4);
      if (visite.personnes_presentes) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Présents: ${visite.personnes_presentes}`, 60, y + 4);
      }
      y += 10;

      doc.setTextColor(0);
      if (visite.observations) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Observations:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(visite.observations, w - 28);
        lines.forEach((line: string) => {
          checkPage(5);
          doc.text(line, 14, y);
          y += 4;
        });
        y += 2;
      }

      if (visite.points_vigilance) {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...GOLD);
        doc.text('⚠ Points de vigilance:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        const lines = doc.splitTextToSize(visite.points_vigilance, w - 28);
        lines.forEach((line: string) => {
          checkPage(5);
          doc.text(line, 14, y);
          y += 4;
        });
        y += 2;
      }

      // Photos grid (2x3)
      if (visite.photos && visite.photos.length > 0) {
        checkPage(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Photos:', 14, y);
        y += 4;
        const photoUrls = visite.photos.slice(0, 6);
        let col = 0;
        let photoY = y;
        for (const photo of photoUrls) {
          const url = supabase.storage.from('visites-photos').getPublicUrl(photo.file_path).data.publicUrl;
          const img = await loadImageAsBase64(url);
          if (img) {
            const x = 14 + (col % 3) * 62;
            const py = photoY + Math.floor(col / 3) * 35;
            checkPage(35);
            try {
              doc.addImage(img, 'JPEG', x, py, 58, 32);
            } catch { /* skip broken image */ }
          }
          col++;
        }
        y = photoY + Math.ceil(photoUrls.length / 3) * 35 + 4;
      }

      // Actions
      if (visite.prochaines_actions.length > 0) {
        checkPage(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Prochaines actions:', 14, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        visite.prochaines_actions.forEach(a => {
          checkPage(5);
          doc.text(`• ${a.action} — ${a.responsable} ${a.deadline ? `(${a.deadline})` : ''}`, 16, y);
          y += 4;
        });
      }

      y += 6;
    }
  }

  // Signatures
  checkPage(30);
  y += 5;
  doc.setDrawColor(200);
  doc.line(14, y, w - 14, y);
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature mandataire :', 14, y);
  doc.text('Signature client :', 110, y);
  y += 20;
  doc.line(14, y, 80, y);
  doc.line(110, y, w - 14, y);

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`HUNTERS — Rapport chantier ${chantier.reference} — Page ${i}/${pages}`, w / 2, 292, { align: 'center' });
  }

  doc.save(`rapport-chantier-${chantier.reference}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
