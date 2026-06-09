import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from '@/hooks/use-dossiers';
import { SERVICE_LABELS, getWorkflowSteps } from '@/lib/workflow';
import { fmtPdfEur } from '@/lib/pdf-utils';
import {
  C, LAYOUT,
  loadLogo, drawHeader, drawFooter,
  drawSectionTitle, drawIvoryBox,
  ensureSpace, drawSignatureZone,
  drawCoverPage, sanitizePdfText,
} from '@/lib/pdf-design-system';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const today = () =>
  new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

async function archive(dossierId: string, type: string, numero: string | null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase.from('documents_generiques' as any) as any).insert({
      dossier_id: dossierId,
      type_export: type,
      numero_dossier: numero,
      genere_par: user?.id || null,
    });
  } catch (e) { console.error('archive', e); }
}

// Parse la stratégie patrimoniale — évite l'affichage du JSON brut
function parseStrategie(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return { synthese: sanitizePdfText(raw) }; }
  }
  return raw;
}

// Icônes ASCII pour les services — Helvetica ne supporte pas les icônes Unicode
const SERVICE_ICON = {
  en_cours:     '[v]',
  termine:      '[*]',
  non_souscrit: '[ ]',
};

function serviceIcon(statut: string): string {
  return SERVICE_ICON[statut as keyof typeof SERVICE_ICON] || '[ ]';
}

// ════════════════════════════════════════════════════════════════════════════
// 1. FICHE CLIENT — 1 page
// ════════════════════════════════════════════════════════════════════════════
export async function exportFicheClient(dossier: Dossier) {
  const [{ default: jsPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadLogo(),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, contentW, pageW } = LAYOUT;
  const ref = dossier.numero_dossier || null;

  // Couverture compacte
  await drawCoverPage(doc, {
    logo,
    typeDocument: 'Fiche client',
    titre: sanitizePdfText(dossier.client_name || 'Client'),
    sousTitre: 'Synthese de votre dossier investissement',
    client: sanitizePdfText(dossier.client_name || ''),
    conseiller: sanitizePdfText((dossier as any).mandataire_name || 'HUNTERS Immobilier'),
    refDossier: ref,
    date: today(),
    confidentiel: false,
  });

  doc.addPage();
  drawHeader(doc, ref, 'Fiche client');
  let y = LAYOUT.headerH + 10;

  // Coordonnées
  y = drawSectionTitle(doc, 'Coordonnees', y);
  const coords = [
    ['Nom', sanitizePdfText(dossier.client_name || '')],
    ['Email', sanitizePdfText(dossier.email || '')],
    ['Telephone', sanitizePdfText(dossier.phone || '')],
    ['Ville cible', sanitizePdfText(dossier.ville || '')],
    ['Budget', fmtPdfEur(dossier.budget)],
  ];
  coords.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.textDark);
    doc.text(val, margin + 40, y);
    y += 7;
  });

  // Services souscrits
  y += 4;
  y = drawSectionTitle(doc, 'Services souscrits', y);
  const services = dossier.services_souscrits as Record<string, any> || {};
  Object.entries(services).forEach(([key, val]) => {
    const statut = typeof val === 'string' ? val : (val ? 'en_cours' : 'non_souscrit');
    const icon = serviceIcon(statut);
    const label = SERVICE_LABELS[key as keyof typeof SERVICE_LABELS] || key;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(statut === 'non_souscrit' ? C.textLight[0] : C.textDark[0],
                     statut === 'non_souscrit' ? C.textLight[1] : C.textDark[1],
                     statut === 'non_souscrit' ? C.textLight[2] : C.textDark[2]);
    doc.text(`${icon}  ${sanitizePdfText(label)} — ${sanitizePdfText(statut.replace(/_/g, ' '))}`, margin, y);
    y += 6;
  });

  // Pied de page
  drawFooter(doc, 1, 1, 'HUNTERS Immobilier · Confidentiel · Usage interne');

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fiche-client-${ref || 'dossier'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  await archive(dossier.id, 'fiche_client', ref);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. FICHE INTERNE — usage mandataire
// ════════════════════════════════════════════════════════════════════════════
export async function exportFicheInterne(dossier: Dossier) {
  const [{ default: jsPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadLogo(),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, contentW, pageW } = LAYOUT;
  const ref = dossier.numero_dossier || null;

  drawHeader(doc, ref, 'Fiche interne');
  let y = LAYOUT.headerH + 10;
  let pageNum = 1;

  const newPage = () => {
    drawFooter(doc, pageNum, 99, 'HUNTERS · Confidentiel · Usage interne');
    doc.addPage();
    pageNum++;
    drawHeader(doc, ref, 'Fiche interne');
    y = LAYOUT.headerH + 10;
  };

  // Profil client
  y = drawSectionTitle(doc, 'Profil client', y);
  [
    ['Nom', dossier.client_name],
    ['Email', dossier.email],
    ['Telephone', dossier.phone],
    ['Ville', dossier.ville],
    ['Budget', fmtPdfEur(dossier.budget)],
    ['Honoraires', fmtPdfEur((dossier as any).honoraires)],
    ['Statut', dossier.status],
    ['Accompagnement', (dossier as any).type_accompagnement || ''],
  ].forEach(([l, v]) => {
    ({ y } = kv(doc, margin, y, sanitizePdfText(l||''), sanitizePdfText(v?.toString()||'')));
  });

  // Stratégie
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Fiche interne' });
  y = drawSectionTitle(doc, 'Strategie patrimoniale', y);
  const strat = parseStrategie((dossier as any).strategie);
  const synthese = sanitizePdfText(strat.synthese || 'Strategie en cours de redaction.');
  const lines = doc.splitTextToSize(synthese, contentW - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.textDark);
  lines.forEach((line: string) => {
    y = ensureSpace(doc, y, 6, { refDossier: ref, titrePage: 'Fiche interne' });
    doc.text(line, margin, y);
    y += 5.5;
  });

  // Services
  y = ensureSpace(doc, y + 8, 40, { refDossier: ref, titrePage: 'Fiche interne' });
  y = drawSectionTitle(doc, 'Services souscrits', y);
  const services = dossier.services_souscrits as Record<string, any> || {};
  Object.entries(services).forEach(([key, val]) => {
    const statut = typeof val === 'string' ? val : (val ? 'en_cours' : 'non_souscrit');
    const icon = serviceIcon(statut);
    const label = SERVICE_LABELS[key as keyof typeof SERVICE_LABELS] || key;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(statut === 'non_souscrit' ? C.textLight : C.textDark));
    doc.text(`${icon}  ${sanitizePdfText(label)} — ${sanitizePdfText(statut.replace(/_/g, ' '))}`, margin, y);
    y += 6;
  });

  // Journal
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Fiche interne' });
  y = drawSectionTitle(doc, "Journal d'activite", y);
  const activites: any[] = (dossier as any).activites || [];
  if (activites.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text('Aucune activite enregistree.', margin, y);
    y += 6;
  } else {
    activites.slice(0, 10).forEach((a) => {
      y = ensureSpace(doc, y, 8, { refDossier: ref, titrePage: 'Fiche interne' });
      const date = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '';
      const txt = sanitizePdfText(`${date} · ${a.type || ''} — ${a.contenu || ''}`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textDark);
      const wlines = doc.splitTextToSize(txt, contentW - 4);
      wlines.forEach((l: string) => { doc.text(l, margin, y); y += 5; });
      y += 1;
    });
  }

  drawFooter(doc, pageNum, pageNum, 'HUNTERS · Confidentiel · Usage interne');

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fiche-interne-${ref || 'dossier'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  await archive(dossier.id, 'fiche_interne', ref);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. DOSSIER INTEGRAL
// ════════════════════════════════════════════════════════════════════════════
export async function exportDossierIntegral(dossier: Dossier) {
  const [{ default: jsPDF }, logo] = await Promise.all([
    import('jspdf'),
    loadLogo(),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, contentW, pageW } = LAYOUT;
  const ref = dossier.numero_dossier || null;
  let pageNum = 1;
  let y = 0;

  const addPage = () => {
    drawFooter(doc, pageNum, 99, 'HUNTERS · Confidentiel · Usage interne');
    doc.addPage();
    pageNum++;
    drawHeader(doc, ref, 'Dossier integral');
    y = LAYOUT.headerH + 10;
  };

  // Couverture
  await drawCoverPage(doc, {
    logo,
    typeDocument: 'Dossier client',
    titre: 'Dossier integral',
    sousTitre: `Vue exhaustive du dossier de ${sanitizePdfText(dossier.client_name || '')}`,
    client: sanitizePdfText(dossier.client_name || ''),
    conseiller: sanitizePdfText((dossier as any).mandataire_name || 'HUNTERS Immobilier'),
    refDossier: ref,
    date: today(),
    confidentiel: true,
  });

  doc.addPage();
  pageNum++;
  drawHeader(doc, ref, 'Dossier integral');
  y = LAYOUT.headerH + 10;

  // 1. Profil client
  y = drawSectionTitle(doc, 'Profil client', y);
  [
    ['Nom', dossier.client_name],
    ['Email', dossier.email],
    ['Telephone', dossier.phone],
    ['Ville cible', dossier.ville],
    ['Notes', (dossier as any).notes],
  ].forEach(([l, v]) => {
    if (!v) return;
    ({ y } = kv(doc, margin, y, sanitizePdfText(l||''), sanitizePdfText(v?.toString()||'')));
  });

  // 2. Capacité financière
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Capacite financiere', y);
  [
    ['Budget total', fmtPdfEur(dossier.budget)],
    ['Honoraires', fmtPdfEur((dossier as any).honoraires)],
  ].forEach(([l, v]) => {
    ({ y } = kv(doc, margin, y, l||'', v||''));
  });
  y += 4;
  const ivoireY = y;
  drawIvoryBox(doc, y, 8);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMuted);
  doc.text('Detail a completer via la strategie patrimoniale.', margin + 4, y + 5.5);
  y = ivoireY + 12;

  // 3. Services
  y = ensureSpace(doc, y + 8, 50, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Services souscrits', y);
  const services = dossier.services_souscrits as Record<string, any> || {};
  Object.entries(services).forEach(([key, val]) => {
    const statut = typeof val === 'string' ? val : (val ? 'en_cours' : 'non_souscrit');
    const icon = serviceIcon(statut);
    const label = SERVICE_LABELS[key as keyof typeof SERVICE_LABELS] || key;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...(statut === 'non_souscrit' ? C.textLight : C.textDark));
    doc.text(`${icon}  ${sanitizePdfText(label)} — ${sanitizePdfText(statut.replace(/_/g, ' '))}`, margin, y);
    y += 6;
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.textMuted);
  const typeAcc = (dossier as any).type_accompagnement || '';
  if (typeAcc) {
    y += 2;
    doc.text(`Type d'accompagnement : ${sanitizePdfText(typeAcc)}`, margin, y);
    y += 6;
  }

  // 4. Stratégie
  y = ensureSpace(doc, y + 8, 40, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Strategie patrimoniale', y);
  const strat = parseStrategie((dossier as any).strategie);
  const synthese = sanitizePdfText(strat.synthese || 'Strategie en cours de redaction.');
  const slines = doc.splitTextToSize(synthese, contentW - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.textDark);
  slines.forEach((l: string) => {
    y = ensureSpace(doc, y, 6, { refDossier: ref, titrePage: 'Dossier integral' });
    doc.text(l, margin, y);
    y += 5.5;
  });

  // 5. Biens identifiés
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Biens identifies', y);
  const biens: any[] = (dossier as any).biens || [];
  if (biens.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text('Aucun bien identifie pour ce dossier.', margin, y);
    y += 6;
  } else {
    biens.forEach((b) => {
      y = ensureSpace(doc, y, 10, { refDossier: ref, titrePage: 'Dossier integral' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...C.textDark);
      doc.text(sanitizePdfText(b.adresse || b.titre || 'Bien'), margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textMuted);
      doc.text(`${fmtPdfEur(b.prix)} · ${sanitizePdfText(b.statut || '')}`, margin, y + 5);
      y += 10;
    });
  }

  // 6. Journal
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, "Journal d'activite", y);
  const activites: any[] = (dossier as any).activites || [];
  if (activites.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text('Aucune activite enregistree.', margin, y);
    y += 6;
  } else {
    activites.forEach((a) => {
      y = ensureSpace(doc, y, 8, { refDossier: ref, titrePage: 'Dossier integral' });
      const date = a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '';
      const txt = sanitizePdfText(`${date} · ${a.type || ''} — ${a.contenu || ''}`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textDark);
      const wlines = doc.splitTextToSize(txt, contentW - 4);
      wlines.forEach((l: string) => { doc.text(l, margin, y); y += 5; });
      y += 1;
    });
  }

  // 7. Documents et signatures
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Documents et signatures', y);
  const docs: any[] = (dossier as any).documents || [];
  const sigs: any[] = (dossier as any).signatures || [];
  if (docs.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.green);
    doc.text('Documents generes :', margin, y);
    y += 5;
    docs.forEach((d) => {
      const date = d.created_at ? new Date(d.created_at).toLocaleDateString('fr-FR') : '';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textDark);
      doc.text(`  · ${sanitizePdfText(d.type_export || d.titre || '')} — ${date}`, margin, y);
      y += 5;
    });
  }
  if (sigs.length > 0) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.green);
    doc.text('Signatures :', margin, y);
    y += 5;
    sigs.forEach((s) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textDark);
      doc.text(`  · ${sanitizePdfText(s.titre || s.label || '')} — ${sanitizePdfText(s.statut || '')}`, margin, y);
      y += 5;
    });
  }

  // 8. Historique statuts
  y = ensureSpace(doc, y + 8, 30, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Historique des statuts', y);
  const historique: any[] = (dossier as any).historique_statuts || [];
  if (historique.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    doc.text('Aucun historique disponible.', margin, y);
    y += 6;
  } else {
    historique.forEach((h) => {
      y = ensureSpace(doc, y, 6, { refDossier: ref, titrePage: 'Dossier integral' });
      const date = h.created_at ? new Date(h.created_at).toLocaleDateString('fr-FR') : '';
      const txt = sanitizePdfText(`${date} · ${h.statut_avant || ''} -> ${h.statut_apres || ''}`);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.textDark);
      doc.text(txt, margin, y);
      y += 5;
    });
  }

  // 9. Synthèse finale
  y = ensureSpace(doc, y + 8, 40, { refDossier: ref, titrePage: 'Dossier integral' });
  y = drawSectionTitle(doc, 'Synthese', y);
  const steps = getWorkflowSteps(dossier);
  const currentStep = steps.findIndex(s => s.key === dossier.statut);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.textDark);
  doc.text(`Etape ${currentStep + 1} / ${steps.length} · Statut actuel : ${sanitizePdfText(dossier.statut || '')}`, margin, y);
  y += 8;
  const iY2 = y;
  drawIvoryBox(doc, y, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.green);
  doc.text('Prochaines actions recommandees :', margin + 4, y + 6);
  [
    '· Mettre a jour les coordonnees si manquantes',
    '· Finaliser la strategie patrimoniale',
    '· Avancer vers l\'etape suivante du workflow',
  ].forEach((action, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(action, margin + 4, y + 13 + i * 5.5);
  });
  y = iY2 + 32;

  // Zones de signature
  y = ensureSpace(doc, y + 10, 35, { refDossier: ref, titrePage: 'Dossier integral' });
  drawSignatureZone(
    doc, margin, y, contentW / 2 - 6,
    sanitizePdfText(dossier.client_name || ''),
    'Client',
    'Signature client',
  );
  drawSignatureZone(
    doc, margin + contentW / 2 + 6, y, contentW / 2 - 6,
    sanitizePdfText((dossier as any).mandataire_name || 'Anais SAIZONOU'),
    'Conseiller HUNTERS Immobilier',
    'Signature conseiller',
  );

  drawFooter(doc, pageNum, pageNum, 'HUNTERS · Confidentiel · Usage interne');

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dossier-integral-${ref || 'dossier'}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  await archive(dossier.id, 'dossier_integral', ref);
}

// ─── HELPER KV ───────────────────────────────────────────────────────────────
function kv(doc: any, x: number, y: number, label: string, value: string): { y: number } {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...C.textMuted);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.textDark);
  doc.text(value || '—', x + 45, y);
  return { y: y + 7 };
}
