// Export PDF de la stratégie d'investissement
// Rendu basé sur pdf-design-system : charte HUNTERS sobre et institutionnelle.

import {
  C, T, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, ensureSpace, drawCoverPage, loadLogo,
} from '@/lib/pdf-design-system';

function fmtEur(v: number): string {
  return `${Math.round(v || 0).toLocaleString('fr-FR').replace(/[\u202F\u00A0]/g, ' ')} €`;
}

export async function exportStrategiePdf(
  strategie: any,
  clientName: string,
  conseiller: string,
  numeroDossier?: string | null,
) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const { margin, contentW, pageW, headerH } = LAYOUT;
  const titre = 'Stratégie d\'investissement';
  const ctxHeader = { refDossier: numeroDossier ?? null, titre };
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ─── COUVERTURE ──────────────────────────────────────────────────────
  const logo = await loadLogo();
  await drawCoverPage(doc, {
    logo,
    typeDocument: 'Stratégie d\'investissement',
    titre: 'Stratégie d\'investissement immobilier',
    sousTitre: `Préparée pour ${clientName}`,
    client: clientName,
    conseiller,
    refDossier: numeroDossier ?? null,
    date: today,
    confidentiel: true,
  });

  // ─── PAGE DE CONTENU ─────────────────────────────────────────────────
  doc.addPage();
  drawHeader(doc, ctxHeader.refDossier, ctxHeader.titre);
  let y = headerH + 10;

  // ─── SYNTHÈSE (encadré ivoire) ───────────────────────────────────────
  if (strategie.synthese) {
    doc.setFont(T.body.font, T.body.style);
    doc.setFontSize(T.body.size);
    const synthLines: string[] = doc.splitTextToSize(strategie.synthese, contentW - 8);
    const boxH = 10 + synthLines.length * 4.8 + 4;

    y = ensureSpace(doc, y, boxH + 4, ctxHeader);
    const innerY = drawIvoryBox(doc, y, boxH, 'Synthèse');

    doc.setFont(T.body.font, 'normal');
    doc.setFontSize(T.body.size);
    doc.setTextColor(...C.textDark);
    let ty = innerY;
    for (const l of synthLines) {
      doc.text(l, margin + 4, ty);
      ty += 4.8;
    }
    y += boxH + 6;
  }

  // ─── INDICATEURS CLÉS (grille 2×2) ───────────────────────────────────
  if (strategie.indicateurs_cles) {
    y = ensureSpace(doc, y, 40, ctxHeader);
    y = drawSectionTitle(doc, 'Indicateurs clés', y);

    const inds = [
      { label: 'Revenus nets / mois',  value: fmtEur(strategie.indicateurs_cles.revenus_nets_totaux_mensuels) },
      { label: 'Taux d\'endettement',  value: `${strategie.indicateurs_cles.taux_effort_actuel_pct || 0} %` },
      { label: 'Capacité d\'emprunt',  value: fmtEur(strategie.indicateurs_cles.capacite_emprunt_estimee) },
      { label: 'Cash-flow libre',      value: `${fmtEur(strategie.indicateurs_cles.cash_flow_mensuel_libre)} / mois` },
    ];

    const gap = 4;
    const cardW = (contentW - gap) / 2;
    const cardH = 18;

    inds.forEach((ind, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (cardW + gap);
      const cy = y + row * (cardH + gap);

      doc.setFillColor(...C.ivoryDark);
      doc.rect(x, cy, cardW, cardH, 'F');
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.3);
      doc.rect(x, cy, cardW, cardH, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.textMuted);
      doc.text(ind.label.toUpperCase(), x + 4, cy + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...C.green);
      doc.text(ind.value, x + 4, cy + 14);
    });
    y += 2 * (cardH + gap) + 2;
  }

  // ─── RECOMMANDATIONS ─────────────────────────────────────────────────
  if (strategie.recommandations?.length) {
    y = ensureSpace(doc, y, 24, ctxHeader);
    y = drawSectionTitle(doc, 'Recommandations', y);

    strategie.recommandations.forEach((rec: any) => {
      // En-tête recommandation
      y = ensureSpace(doc, y, 14, ctxHeader);
      doc.setFillColor(...C.green);
      doc.rect(margin, y, contentW, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.white);
      doc.text(`${rec.rang}. ${rec.titre}`, margin + 4, y + 6);
      doc.setFontSize(8);
      doc.setTextColor(...C.gold);
      doc.text(
        `${rec.rendement_brut_estime_pct}% brut · ${rec.dispositif}`,
        pageW - margin - 4, y + 6, { align: 'right' },
      );
      y += 13;

      // Description
      if (rec.description) {
        doc.setFont(T.body.font, T.body.style);
        doc.setFontSize(T.body.size);
        doc.setTextColor(...C.textDark);
        const descLines: string[] = doc.splitTextToSize(rec.description, contentW);
        for (const l of descLines) {
          y = ensureSpace(doc, y, 5, ctxHeader);
          doc.text(l, margin, y);
          y += 5;
        }
        y += 2;
      }

      // Tableau chiffres clés (3 colonnes via tableau standardisé)
      const chiffres: Array<[string, string]> = [
        ['Budget total',        fmtEur(rec.budget_acquisition_total)],
        ['Apport recommandé',   fmtEur(rec.apport_recommande)],
        ['Mensualité crédit',   `${fmtEur(rec.mensualite_credit_estimee)} / mois`],
        ['Loyer brut estimé',   `${fmtEur(rec.loyer_brut_mensuel_estime)} / mois`],
        ['Cash-flow net',       `${fmtEur(rec.cash_flow_net_mensuel_estime)} / mois`],
        ['Éco. fiscale / an',   fmtEur(rec.economie_fiscale_annuelle_estimee)],
      ];
      y = renderKeyValueTable(doc, chiffres, y, ctxHeader);

      // Avantages / Vigilance
      if (rec.avantages?.length || rec.points_vigilance?.length) {
        y = ensureSpace(doc, y, 26, ctxHeader);
        const halfW = (contentW - 6) / 2;

        if (rec.avantages?.length) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...C.green);
          doc.text('Avantages', margin, y);
          doc.setFont(T.body.font, 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...C.textDark);
          rec.avantages.slice(0, 3).forEach((a: string, i: number) => {
            const lines = doc.splitTextToSize(`• ${a}`, halfW);
            doc.text(lines[0], margin, y + 5 + i * 4.5);
          });
        }
        if (rec.points_vigilance?.length) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...C.gold);
          doc.text('Points de vigilance', margin + halfW + 6, y);
          doc.setFont(T.body.font, 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(...C.textDark);
          rec.points_vigilance.slice(0, 3).forEach((p: string, i: number) => {
            const lines = doc.splitTextToSize(`• ${p}`, halfW);
            doc.text(lines[0], margin + halfW + 6, y + 5 + i * 4.5);
          });
        }
        y += 22;
      }

      // Point clé : horizon + zones — encadré ivoire de mise en évidence
      if (rec.horizon_recommande || rec.zones_suggerees?.length) {
        y = ensureSpace(doc, y, 14, ctxHeader);
        drawIvoryBox(doc, y, 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.green);
        doc.text(
          `Horizon ${rec.horizon_recommande || '—'}   ·   Zones : ${(rec.zones_suggerees || []).join(', ') || '—'}`,
          margin + 4, y + 6.5,
        );
        y += 14;
      }
      y += 4;
    });
  }

  // ─── PLAN D'ACTION ───────────────────────────────────────────────────
  if (strategie.plan_action?.length) {
    y = ensureSpace(doc, y, 30, ctxHeader);
    y = drawSectionTitle(doc, 'Plan d\'action', y);

    strategie.plan_action.forEach((step: any) => {
      y = ensureSpace(doc, y, 16, ctxHeader);
      // Pastille étape
      doc.setFillColor(...C.green);
      doc.circle(margin + 3.5, y + 3.5, 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...C.white);
      doc.text(String(step.etape), margin + 3.5, y + 5, { align: 'center' });

      // Titre + délai
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...C.textDark);
      doc.text(step.titre || '', margin + 10, y + 4);
      const titreW = doc.getTextWidth(step.titre || '');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.gold);
      doc.text(`  —  ${step.delai || ''}`, margin + 10 + titreW, y + 4);

      // Description
      if (step.description) {
        doc.setFont(T.body.font, 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...C.textMuted);
        const lines = doc.splitTextToSize(step.description, contentW - 12);
        doc.text(lines.slice(0, 2), margin + 10, y + 9);
      }
      y += 15;
    });
  }

  // ─── DISCLAIMER ──────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 22, ctxHeader);
  y += 4;
  const disclaimer = strategie.disclaimer ||
    'Cette analyse est fournie à titre indicatif par HUNTERS Immobilier dans le cadre d\'un accompagnement personnalisé. Elle ne constitue pas un conseil en investissement au sens juridique du terme.';
  const dLines: string[] = doc.splitTextToSize(disclaimer, contentW - 8);
  const dH = 6 + dLines.length * 4;
  drawIvoryBox(doc, y, dH);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text(dLines, margin + 4, y + 5);

  // ─── PIEDS DE PAGE (hors couverture) ─────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, total - 1);
  }

  const fileName = `Strategie_Hunters_${clientName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
  doc.save(fileName);
}

// ─── Tableau libellé/valeur : en-tête vert, lignes alternées, bordures horiz. ──
function renderKeyValueTable(
  doc: any,
  rows: Array<[string, string]>,
  y: number,
  ctxHeader: { refDossier?: string | null; titre?: string },
): number {
  const { margin, contentW } = LAYOUT;
  const rowH = 6.2;
  const valX = margin + contentW - 4;

  // En-tête
  y = ensureSpace(doc, y, rowH + rows.length * rowH + 4, ctxHeader);
  doc.setFillColor(...C.green);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFont(T.tableHeader.font, T.tableHeader.style);
  doc.setFontSize(T.tableHeader.size);
  doc.setTextColor(...C.white);
  doc.text('POSTE', margin + 3, y + 4.2);
  doc.text('VALEUR', valX, y + 4.2, { align: 'right' });
  y += rowH;

  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);

  rows.forEach(([label, value], i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...C.ivory);
      doc.rect(margin, y, contentW, rowH, 'F');
    }
    doc.setFont(T.tableCell.font, 'normal');
    doc.setFontSize(T.tableCell.size);
    doc.setTextColor(...C.textMuted);
    doc.text(label, margin + 3, y + 4.2);

    doc.setFont(T.tableCell.font, 'bold');
    doc.setTextColor(...C.textDark);
    doc.text(value, valX, y + 4.2, { align: 'right' });

    // Bordure horizontale uniquement
    doc.line(margin, y + rowH, margin + contentW, y + rowH);
    y += rowH;
  });

  return y + 4;
}
