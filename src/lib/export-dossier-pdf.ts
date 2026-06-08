// Exports PDF du dossier — 3 niveaux : intégral, fiche interne, fiche client
// Rendu basé sur pdf-design-system : charte HUNTERS sobre et institutionnelle.
import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from '@/hooks/use-dossiers';
import { SERVICE_LABELS, getServices, getWorkflowSteps, progressFromStatus } from '@/lib/workflow';
import { fmtPdfEur } from './pdf-utils';
import {
  C, T, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, ensureSpace, drawCoverPage, loadLogo,
} from '@/lib/pdf-design-system';

const fmtEur = (n: number) => fmtPdfEur(n);

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

// Carte ivoire indicateur clé
function drawIndicatorCard(doc: any, x: number, y: number, w: number, h: number, label: string, value: string) {
  doc.setFillColor(...C.ivoryDark);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.textMuted);
  doc.text(label.toUpperCase(), x + 3, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.green);
  doc.text(value || '—', x + 3, y + h - 3);
}

// ════════════════════════════════════════════════
// 1. FICHE CLIENT — couverture compacte + indicateurs
// ════════════════════════════════════════════════
export async function exportFicheClient(dossier: Dossier) {
  const [{ default: jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogo()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, pageW, contentW } = LAYOUT;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ─── COUVERTURE COMPACTE (demi-page) ──────────────────────────────────
  const coverH = 110;
  doc.setFillColor(...C.green);
  doc.rect(0, 0, pageW, coverH, 'F');
  doc.setFillColor(...C.gold);
  doc.rect(0, coverH, pageW, 1.2, 'F');

  if (logo) { try { doc.addImage(logo, 'JPEG', margin, 14, 20, 20); } catch { /* ignore */ } }
  doc.setTextColor(...C.gold);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HUNTERS', margin + 24, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Cabinet de conseil en investissement immobilier', margin + 24, 28);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text('SYNTHÈSE DE DOSSIER', margin, 54);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(dossier.client_name, margin, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text(`Réf. ${dossier.numero_dossier || dossier.id.slice(0, 8)}`, margin, 76);
  doc.setTextColor(255, 255, 255);
  doc.text(today, pageW - margin, 76, { align: 'right' });

  let y = coverH + 14;

  // ─── INDICATEURS CLÉS (2 colonnes) ───────────────────────────────────
  y = drawSectionTitle(doc, 'Indicateurs clés', y);
  const cardW = (contentW - 4) / 2;
  const cardH = 18;
  const inds = [
    { label: 'Ville cible',      value: dossier.ville || '—' },
    { label: 'Budget',           value: fmtEur(dossier.budget) },
    { label: 'Honoraires',       value: fmtEur(dossier.honoraires) },
    { label: 'Statut',           value: dossier.status },
  ];
  inds.forEach((ind, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawIndicatorCard(doc, margin + col * (cardW + 4), y + row * (cardH + 4), cardW, cardH, ind.label, ind.value);
  });
  y += 2 * (cardH + 4) + 4;

  // ─── SERVICES SOUSCRITS ──────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Services souscrits', y);
  const services = getServices(dossier);
  const activeServices = (Object.keys(services) as any[]).filter(k => services[k]);
  doc.setFont(T.body.font, T.body.style);
  doc.setFontSize(T.body.size);
  if (activeServices.length === 0) {
    doc.setTextColor(...C.textMuted);
    doc.text('Aucun service souscrit.', margin, y);
    y += 6;
  } else {
    let xs = margin;
    const chipW = 58;
    activeServices.forEach((k, i) => {
      const label = SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k;
      doc.setFillColor(...C.ivoryDark);
      doc.rect(xs, y, chipW, 8, 'F');
      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(label, xs + 3, y + 5.5);
      xs += chipW + 4;
      if ((i + 1) % 3 === 0) { xs = margin; y += 11; }
    });
    y += 14;
  }

  // ─── AVANCEMENT ──────────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Avancement', y);
  const p = progressFromStatus(dossier);
  doc.setFillColor(...C.border);
  doc.roundedRect(margin, y, contentW, 5, 1, 1, 'F');
  doc.setFillColor(...C.green);
  doc.roundedRect(margin, y, contentW * (p.current / p.total), 5, 1, 1, 'F');
  y += 9;
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  doc.text(`Étape ${p.current} / ${p.total}`, margin, y);
  y += 10;

  // ─── STRATÉGIE PATRIMONIALE ──────────────────────────────────────────
  y = drawSectionTitle(doc, 'Stratégie patrimoniale', y);
  const strat = parseStrategieShort(dossier);
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  strat.recos.forEach(r => {
    const lines = doc.splitTextToSize(`• ${r}`, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 1;
  });
  if (strat.rendement) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.text(`Rendement cible : ${strat.rendement}`, margin, y);
  }

  drawFooter(doc, 1, 1);

  doc.save(`fiche-client-${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`);
  await archive(dossier.id, 'fiche_client', dossier.numero_dossier);
}

// ════════════════════════════════════════════════
// 2. FICHE INTERNE — pas de couverture, en-tête sobre
// ════════════════════════════════════════════════
export async function exportFicheInterne(dossier: Dossier, conseillerNom: string) {
  const [{ default: jsPDF }, activites] = await Promise.all([
    import('jspdf'),
    fetchActivites(dossier.id, 5),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, contentW, headerH } = LAYOUT;
  const numero = dossier.numero_dossier;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const titre = 'Fiche interne';
  const ctxHeader = { refDossier: numero, titre };

  drawHeader(doc, numero, titre);
  let y = headerH + 8;

  // En-tête contextuel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.green);
  doc.text(dossier.client_name, margin, y + 4);
  doc.setFont(T.label.font, T.label.style);
  doc.setFontSize(T.label.size);
  doc.setTextColor(...C.textMuted);
  doc.text(`Conseiller : ${conseillerNom} · Extrait le ${dateStr}`, margin, y + 10);
  y += 16;

  // ─── PROFIL SYNTHÉTIQUE (cartes 4) ───────────────────────────────────
  y = drawSectionTitle(doc, 'Profil synthétique', y);
  const cardW = (contentW - 9) / 4;
  const cardH = 16;
  const profil = [
    { label: 'Ville',      value: dossier.ville || '—' },
    { label: 'Budget',     value: fmtEur(dossier.budget) },
    { label: 'Honoraires', value: fmtEur(dossier.honoraires) },
    { label: 'Statut',     value: dossier.status },
  ];
  profil.forEach((ind, i) => {
    drawIndicatorCard(doc, margin + i * (cardW + 3), y, cardW, cardH, ind.label, ind.value);
  });
  y += cardH + 6;

  // ─── SERVICES ────────────────────────────────────────────────────────
  y = drawSectionTitle(doc, 'Services souscrits', y);
  const services = getServices(dossier);
  const statuts = ((dossier.services_souscrits as any)?._statuts as Record<string, string>) || {};
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  (Object.keys(services) as any[]).filter(k => services[k]).forEach(k => {
    const s = statuts[k] || 'en_cours';
    doc.setTextColor(...C.gold);
    doc.text('▪', margin + 1, y);
    doc.setTextColor(...C.textDark);
    doc.text(`${SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k} — ${s}`, margin + 6, y);
    y += 5.5;
  });
  y += 4;

  // ─── AVANCEMENT ──────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 30, ctxHeader);
  y = drawSectionTitle(doc, 'Avancement', y);
  const steps = getWorkflowSteps(dossier);
  const p = progressFromStatus(dossier);
  doc.setFillColor(...C.border);
  doc.roundedRect(margin, y, contentW, 5, 1, 1, 'F');
  doc.setFillColor(...C.green);
  doc.roundedRect(margin, y, contentW * (p.current / p.total), 5, 1, 1, 'F');
  y += 9;
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(8.5);
  steps.forEach((s, i) => {
    const isCurrent = i + 1 === p.current;
    const isDone = i + 1 < p.current;
    doc.setTextColor(...(isCurrent ? C.green : isDone ? C.textDark : C.textMuted));
    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal');
    const dot = isDone || isCurrent ? '●' : '○';
    doc.text(`${dot} ${i + 1}. ${s.short}`, margin + (i % 5) * 36, y + Math.floor(i / 5) * 5.5);
  });
  y += Math.ceil(steps.length / 5) * 5.5 + 6;

  // ─── STRATÉGIE ───────────────────────────────────────────────────────
  y = ensureSpace(doc, y, 30, ctxHeader);
  y = drawSectionTitle(doc, 'Stratégie patrimoniale', y);
  const strat = parseStrategieShort(dossier);
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  strat.recos.forEach(r => {
    const lines = doc.splitTextToSize(`• ${r}`, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 1;
  });
  if (strat.rendement) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.green);
    doc.text(`Rendement cible : ${strat.rendement}`, margin, y);
    y += 6;
  }

  // ─── ACTIVITÉ RÉCENTE (nouvelle page) ────────────────────────────────
  doc.addPage();
  drawHeader(doc, numero, titre);
  let y2 = headerH + 10;
  y2 = drawSectionTitle(doc, 'Dernière activité', y2);
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  doc.setTextColor(...C.textDark);
  if (activites.length === 0) {
    doc.setTextColor(...C.textMuted);
    doc.text('Aucune activité récente.', margin, y2);
  } else {
    activites.forEach(a => {
      y2 = ensureSpace(doc, y2, 12, ctxHeader);
      const dt = new Date(a.created_at).toLocaleDateString('fr-FR');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.green);
      doc.text(`${dt} · ${a.type}`, margin, y2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textDark);
      const lines = doc.splitTextToSize(a.commentaire || '', contentW);
      doc.text(lines, margin, y2 + 5);
      y2 += 5 + lines.length * 5 + 3;
    });
  }

  // Pieds de page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i, total, `HUNTERS · ${dateStr} · Usage interne confidentiel`);
  }

  doc.save(`fiche-interne-${numero || dossier.id.slice(0, 8)}.pdf`);
  await archive(dossier.id, 'fiche_interne', numero);
}

// ════════════════════════════════════════════════
// 3. DOSSIER INTÉGRAL — couverture complète + sections
// ════════════════════════════════════════════════
export async function exportDossierIntegral(dossier: Dossier, conseillerNom: string) {
  const [{ default: jsPDF }, logo, activites, biens, historique, docsGenres, signatures] = await Promise.all([
    import('jspdf'),
    loadLogo(),
    fetchActivites(dossier.id, 50),
    fetchBiens(dossier.id),
    fetchHistorique(dossier.id),
    fetchDocsGeneres(dossier.id),
    fetchSignatures(dossier.id),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { margin, contentW, headerH } = LAYOUT;
  const numero = dossier.numero_dossier;
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const titre = 'Dossier intégral';
  const ctxHeader = { refDossier: numero, titre };

  // ─── COUVERTURE COMPLÈTE ─────────────────────────────────────────────
  await drawCoverPage(doc, {
    logo,
    typeDocument: 'Dossier client',
    titre: 'Dossier intégral',
    sousTitre: `Vue exhaustive du dossier de ${dossier.client_name}`,
    client: dossier.client_name,
    conseiller: conseillerNom,
    refDossier: numero,
    date: dateStr,
    confidentiel: true,
  });

  const renderTextBlock = (lines: string[], y: number): number => {
    doc.setFont(T.body.font, 'normal');
    doc.setFontSize(T.body.size);
    doc.setTextColor(...C.textDark);
    for (const l of lines) {
      const wrapped = doc.splitTextToSize(l, contentW);
      y = ensureSpace(doc, y, wrapped.length * 5.5 + 1, ctxHeader);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 5.5 + 1;
    }
    return y;
  };

  const beginSection = (label: string): number => {
    doc.addPage();
    drawHeader(doc, numero, titre);
    return drawSectionTitle(doc, label, headerH + 10);
  };

  // ─── PROFIL CLIENT ───────────────────────────────────────────────────
  let y = beginSection('Profil client');
  y = renderTextBlock([
    `Nom : ${dossier.client_name}`,
    `Email : ${dossier.email || '—'}`,
    `Téléphone : ${dossier.phone || '—'}`,
    `Ville cible : ${dossier.ville || '—'}`,
    '',
    'Notes / Situation :',
    dossier.notes || '—',
  ], y);

  // ─── CAPACITÉ FINANCIÈRE ─────────────────────────────────────────────
  y = beginSection('Capacité financière');
  const cardW = (contentW - 4) / 2;
  const cardH = 18;
  drawIndicatorCard(doc, margin, y, cardW, cardH, 'Budget total', fmtEur(dossier.budget));
  drawIndicatorCard(doc, margin + cardW + 4, y, cardW, cardH, 'Honoraires', fmtEur(dossier.honoraires));
  y += cardH + 6;
  y = renderTextBlock(['Détail à compléter via la stratégie patrimoniale.'], y);

  // ─── SERVICES SOUSCRITS ──────────────────────────────────────────────
  y = beginSection('Services souscrits');
  const services = getServices(dossier);
  const statuts = ((dossier.services_souscrits as any)?._statuts as Record<string, string>) || {};
  doc.setFont(T.body.font, 'normal');
  doc.setFontSize(T.body.size);
  (Object.keys(services) as any[]).forEach(k => {
    const active = services[k];
    const s = statuts[k] || (active ? 'en_cours' : '—');
    doc.setTextColor(...(active ? C.green : C.textMuted));
    doc.setFont('helvetica', active ? 'bold' : 'normal');
    doc.text(`${active ? '●' : '○'} ${SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k} — ${active ? s : 'non souscrit'}`, margin, y);
    y += 6;
  });
  y += 4;
  doc.setTextColor(...C.textDark);
  doc.setFont('helvetica', 'normal');
  doc.text(`Type d'accompagnement : ${dossier.type_accompagnement || 'cle_en_main'}`, margin, y);

  // ─── STRATÉGIE ───────────────────────────────────────────────────────
  y = beginSection('Stratégie patrimoniale');
  const strat = parseStrategieShort(dossier);
  renderTextBlock(strat.recos.map(r => `• ${r}`).concat(strat.rendement ? ['', `Rendement cible : ${strat.rendement}`] : []), y);

  // ─── BIENS ──────────────────────────────────────────────────────────
  y = beginSection('Biens identifiés');
  if (biens.length === 0) renderTextBlock(['Aucun bien identifié pour ce dossier.'], y);
  else biens.forEach((b: any) => {
    y = renderTextBlock([`${b.reference || '—'} · ${b.ville || ''} · ${fmtEur(Number(b.prix_acquisition) || 0)} · Statut : ${b.statut}`], y);
  });

  // ─── ACTIVITÉ ───────────────────────────────────────────────────────
  y = beginSection("Journal d'activité");
  if (activites.length === 0) renderTextBlock(['Aucune activité.'], y);
  else activites.slice(0, 25).forEach(a => {
    const dt = new Date(a.created_at).toLocaleDateString('fr-FR');
    y = renderTextBlock([`${dt} · ${a.type} — ${a.commentaire || ''}`], y);
  });

  // ─── DOCUMENTS & SIGNATURES ─────────────────────────────────────────
  y = beginSection('Documents et signatures');
  renderTextBlock([
    'Documents générés :',
    ...docsGenres.map((d: any) => `· ${d.type} — ${new Date(d.date_generation).toLocaleDateString('fr-FR')}`),
    '',
    'Signatures :',
    ...signatures.map((s: any) => `· ${s.document_name} — ${s.status}${s.signed_at ? ' le ' + new Date(s.signed_at).toLocaleDateString('fr-FR') : ''}`),
  ], y);

  // ─── HISTORIQUE ─────────────────────────────────────────────────────
  y = beginSection('Historique des statuts');
  if (historique.length === 0) renderTextBlock(['Aucun changement de statut enregistré.'], y);
  else historique.forEach((h: any) => {
    const dt = new Date(h.date_changement).toLocaleDateString('fr-FR');
    y = renderTextBlock([`${dt} · ${h.ancien_statut || '—'} → ${h.nouveau_statut}`], y);
  });

  // ─── SYNTHÈSE ───────────────────────────────────────────────────────
  y = beginSection('Synthèse');
  const p = progressFromStatus(dossier);
  doc.setFillColor(...C.border);
  doc.roundedRect(margin, y, contentW, 6, 1, 1, 'F');
  doc.setFillColor(...C.green);
  doc.roundedRect(margin, y, contentW * (p.current / p.total), 6, 1, 1, 'F');
  y += 12;
  drawIvoryBox(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.green);
  doc.text(`Étape ${p.current} / ${p.total}   ·   Statut actuel : ${dossier.status}`, margin + 4, y + 5.5);
  y += 14;
  renderTextBlock([
    'Prochaines actions recommandées :',
    '· Mettre à jour les coordonnées si manquantes',
    '· Finaliser la stratégie patrimoniale',
    '· Avancer vers l\'étape suivante du workflow',
  ], y);

  // ─── PIEDS DE PAGE (hors couverture) ────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, total - 1, `HUNTERS · Confidentiel · Usage interne · ${dateStr}`);
  }

  doc.save(`dossier-integral-${numero || dossier.id.slice(0, 8)}.pdf`);
  await archive(dossier.id, 'dossier_integral', numero);
}

// ─── Helpers DB ───────────────────────────────────
async function fetchActivites(dossierId: string, limit: number) {
  const { data } = await supabase.from('activites').select('*').eq('dossier_id', dossierId).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
async function fetchBiens(dossierId: string) {
  const { data } = await (supabase.from('biens') as any).select('*').eq('dossier_id', dossierId);
  return data || [];
}
async function fetchHistorique(dossierId: string) {
  const { data } = await (supabase.from('historique_statuts' as any) as any).select('*').eq('dossier_id', dossierId).order('date_changement', { ascending: false });
  return data || [];
}
async function fetchDocsGeneres(dossierId: string) {
  const { data } = await (supabase.from('documents_generes' as any) as any).select('*').eq('dossier_id', dossierId).order('date_generation', { ascending: false });
  return data || [];
}
async function fetchSignatures(dossierId: string) {
  const { data } = await supabase.from('signature_requests').select('*').eq('dossier_id', dossierId);
  return data || [];
}

function parseStrategieShort(dossier: Dossier): { recos: string[]; rendement: string | null } {
  const s = dossier.strategie;
  if (!s) return { recos: ['Stratégie patrimoniale à générer.'], rendement: null };
  if (typeof s === 'string') {
    const lines = s.split('\n').filter(l => /^[-•*]/.test(l.trim())).slice(0, 3).map(l => l.replace(/^[-•*]\s*/, '').trim());
    return { recos: lines.length ? lines : [s.slice(0, 300)], rendement: null };
  }
  const obj = s as any;
  const recos = (obj.recommandations || []).slice(0, 3).map((r: any) => r.titre || r.description || '').filter(Boolean);
  const rendement = obj.recommandations?.[0]?.rendement_brut_estime_pct ? `${obj.recommandations[0].rendement_brut_estime_pct}%` : null;
  return { recos: recos.length ? recos : ['Stratégie en cours.'], rendement };
}
