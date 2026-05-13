// Export PDF de la stratégie d'investissement
// Utilise jsPDF chargé dynamiquement

export async function exportStrategiePdf(strategie: any, clientName: string, conseiller: string, numeroDossier?: string | null) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const MARGIN = 18;
  const CONTENT_W = W - MARGIN * 2;
  const GREEN = [26, 77, 46] as [number, number, number];
  const GOLD = [245, 168, 0] as [number, number, number];
  const GRAY = [107, 126, 114] as [number, number, number];
  const TEXT = [17, 17, 17] as [number, number, number];

  let y = 0;

  const addPage = () => {
    doc.addPage();
    y = MARGIN;
  };

  const checkSpace = (needed: number) => {
    if (y + needed > 270) addPage();
  };

  // ── COUVERTURE ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 60, 'F');

  // Barre or
  doc.setFillColor(...GOLD);
  doc.rect(0, 58, W, 2, 'F');

  // Titre
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('STRATÉGIE D\'INVESTISSEMENT', MARGIN, 22);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('IMMOBILIER', MARGIN, 30);

  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text('HUNTERS IMMOBILIER · TOURS', MARGIN, 42);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Préparée pour : ${clientName}`, MARGIN, 50);
  doc.text(`Conseiller : ${conseiller}  ·  ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, MARGIN, 56);

  y = 72;

  // ── SYNTHÈSE ──
  doc.setFillColor(232, 242, 236);
  doc.roundedRect(MARGIN, y, CONTENT_W, 32, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('SYNTHÈSE', MARGIN + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  const synthLines = doc.splitTextToSize(strategie.synthese || '', CONTENT_W - 8);
  doc.text(synthLines.slice(0, 3), MARGIN + 4, y + 14);
  y += 38;

  // ── INDICATEURS CLÉS ──
  if (strategie.indicateurs_cles) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text('INDICATEURS CLÉS', MARGIN, y);
    y += 6;

    const inds = [
      { label: 'Revenus nets/mois', value: `${(strategie.indicateurs_cles.revenus_nets_totaux_mensuels || 0).toLocaleString('fr-FR')} €` },
      { label: 'Taux d\'endettement', value: `${strategie.indicateurs_cles.taux_effort_actuel_pct || 0}%` },
      { label: 'Capacité d\'emprunt', value: `${(strategie.indicateurs_cles.capacite_emprunt_estimee || 0).toLocaleString('fr-FR')} €` },
      { label: 'Cash-flow libre', value: `${(strategie.indicateurs_cles.cash_flow_mensuel_libre || 0).toLocaleString('fr-FR')} €/mois` },
    ];

    const colW = CONTENT_W / 2 - 3;
    inds.forEach((ind, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN + col * (colW + 6);
      const iy = y + row * 14;
      doc.setFillColor(248, 250, 249);
      doc.rect(x, iy, colW, 12, 'F');
      doc.setDrawColor(212, 226, 217);
      doc.rect(x, iy, colW, 12, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(ind.label, x + 3, iy + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...TEXT);
      doc.text(ind.value, x + 3, iy + 10);
    });
    y += 32;
  }

  // ── RECOMMANDATIONS ──
  (strategie.recommandations || []).forEach((rec: any, idx: number) => {
    checkSpace(60);
    y += 6;

    // Header recommandation
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN, y, CONTENT_W, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${rec.rang}. ${rec.titre}`, MARGIN + 4, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(`${rec.rendement_brut_estime_pct}% brut · ${rec.dispositif}`, W - MARGIN - 4, y + 7, { align: 'right' });
    y += 14;

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const descLines = doc.splitTextToSize(rec.description || '', CONTENT_W);
    checkSpace(descLines.length * 4 + 4);
    doc.text(descLines, MARGIN, y);
    y += descLines.length * 4 + 4;

    // Chiffres clés
    const chiffres = [
      { label: 'Budget total', value: `${(rec.budget_acquisition_total || 0).toLocaleString('fr-FR')} €` },
      { label: 'Apport recommandé', value: `${(rec.apport_recommande || 0).toLocaleString('fr-FR')} €` },
      { label: 'Mensualité crédit', value: `${(rec.mensualite_credit_estimee || 0).toLocaleString('fr-FR')} €/mois` },
      { label: 'Cash-flow net', value: `${(rec.cash_flow_net_mensuel_estime || 0).toLocaleString('fr-FR')} €/mois` },
      { label: 'Loyer brut estimé', value: `${(rec.loyer_brut_mensuel_estime || 0).toLocaleString('fr-FR')} €/mois` },
      { label: 'Éco. fiscale/an', value: `${(rec.economie_fiscale_annuelle_estimee || 0).toLocaleString('fr-FR')} €` },
    ];

    checkSpace(24);
    const cW = CONTENT_W / 3 - 2;
    chiffres.forEach((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * (cW + 3);
      const cy = y + row * 12;
      doc.setFillColor(248, 250, 249);
      doc.rect(x, cy, cW, 10, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...GRAY);
      doc.text(c.label, x + 2, cy + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...TEXT);
      doc.text(c.value, x + 2, cy + 9);
    });
    y += 28;

    // Avantages et vigilance
    if (rec.avantages?.length || rec.points_vigilance?.length) {
      checkSpace(20);
      const halfW = CONTENT_W / 2 - 3;

      if (rec.avantages?.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(46, 125, 50);
        doc.text('✓ Avantages', MARGIN, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT);
        rec.avantages.slice(0, 3).forEach((a: string, i: number) => {
          doc.text(`• ${a}`, MARGIN, y + 5 + i * 4.5);
        });
      }

      if (rec.points_vigilance?.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(230, 100, 0);
        doc.text('⚠ Points de vigilance', MARGIN + halfW + 6, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...TEXT);
        rec.points_vigilance.slice(0, 3).forEach((p: string, i: number) => {
          doc.text(`• ${p}`, MARGIN + halfW + 6, y + 5 + i * 4.5);
        });
      }
      y += 22;
    }

    // Horizon + zones
    checkSpace(10);
    doc.setFillColor(252, 249, 235);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GOLD);
    doc.text(`⏱ ${rec.horizon_recommande || ''}  ·  📍 ${(rec.zones_suggerees || []).join(', ')}`, MARGIN + 3, y + 5.5);
    y += 12;
  });

  // ── PLAN D'ACTION ──
  if (strategie.plan_action?.length) {
    checkSpace(40);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text('PLAN D\'ACTION', MARGIN, y);

    doc.setFillColor(...GOLD);
    doc.rect(MARGIN, y + 2, 30, 0.5, 'F');
    y += 10;

    strategie.plan_action.forEach((step: any) => {
      checkSpace(14);
      doc.setFillColor(...GREEN);
      doc.circle(MARGIN + 3.5, y + 3.5, 3.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(step.etape), MARGIN + 2.2, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...TEXT);
      doc.text(`${step.titre} — `, MARGIN + 10, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...GOLD);
      const titleWidth = doc.getTextWidth(`${step.titre} — `);
      doc.text(step.delai || '', MARGIN + 10 + titleWidth, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const descLines = doc.splitTextToSize(step.description || '', CONTENT_W - 12);
      doc.text(descLines.slice(0, 2), MARGIN + 10, y + 8.5);
      y += 14;
    });
  }

  // ── DISCLAIMER ──
  checkSpace(20);
  y += 8;
  doc.setFillColor(244, 244, 244);
  doc.rect(MARGIN, y, CONTENT_W, 16, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  const disclaimer = doc.splitTextToSize(
    strategie.disclaimer || 'Cette analyse est fournie à titre indicatif par Hunters Immobilier dans le cadre d\'un accompagnement personnalisé. Elle ne constitue pas un conseil en investissement au sens juridique du terme.',
    CONTENT_W - 6
  );
  doc.text(disclaimer, MARGIN + 3, y + 6);

  // ── PIED DE PAGE ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...GREEN);
    doc.rect(0, 285, W, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text('HUNTERS IMMOBILIER', MARGIN, 292);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Cabinet de conseil en investissement immobilier · Tours', W / 2, 292, { align: 'center' });
    doc.text(`Page ${i} / ${pageCount}`, W - MARGIN, 292, { align: 'right' });
  }

  const fileName = `Strategie_Hunters_${clientName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
  doc.save(fileName);
}
