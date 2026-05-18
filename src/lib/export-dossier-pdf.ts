// Exports PDF du dossier — 3 niveaux : intégral, fiche interne, fiche client
import { supabase } from '@/integrations/supabase/client';
import type { Dossier } from '@/hooks/use-dossiers';
import { SERVICE_LABELS, getServices, getWorkflowSteps, progressFromStatus } from '@/lib/workflow';

const GREEN: [number, number, number] = [26, 77, 46];
const GOLD: [number, number, number] = [245, 168, 0];
const GREY: [number, number, number] = [120, 120, 120];
const DARK: [number, number, number] = [40, 40, 40];

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/assets/hunters-logo.jpg');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result as string);
      fr.onerror = () => r(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

function header(doc: any, logo: string | null, numero: string | null) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 14, 'F');
  if (logo) { try { doc.addImage(logo, 'JPEG', 15, 2, 10, 10); } catch { /* ignore */ } }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('HUNTERS IMMOBILIER', 28, 8);
  if (numero) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Réf. ${numero}`, 195, 8, { align: 'right' });
  }
  doc.setFillColor(...GOLD);
  doc.rect(0, 14, 210, 0.6, 'F');
}

function footer(doc: any, mention: string, page?: number, total?: number) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 284, 210, 0.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(mention, 105, 291, { align: 'center' });
  if (page && total) doc.text(`${page} / ${total}`, 195, 291, { align: 'right' });
}

function sectionTitle(doc: any, y: number, label: string) {
  doc.setFillColor(...GREEN);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(label.toUpperCase(), 18, y + 5.5);
  return y + 12;
}

function kv(doc: any, x: number, y: number, label: string, value: string) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(label, x, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(value || '—', x, y + 4.5);
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

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

// ════════════════════════════════════════════════
// 1. FICHE CLIENT — 1 page
// ════════════════════════════════════════════════
export async function exportFicheClient(dossier: Dossier) {
  const [{ default: jsPDF }, logo] = await Promise.all([import('jspdf'), loadLogoBase64()]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cover-style header
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 60, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 60, 210, 1.2, 'F');
  if (logo) { try { doc.addImage(logo, 'JPEG', 95, 12, 20, 20); } catch { /* ignore */ } }
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('HUNTERS IMMOBILIER', 105, 40, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text("Synthèse de votre dossier d'investissement", 105, 51, { align: 'center' });

  let y = 75;
  // Profil
  y = sectionTitle(doc, y, 'Profil');
  kv(doc, 18, y, 'Client', dossier.client_name);
  kv(doc, 95, y, 'Ville cible', dossier.ville || '—');
  kv(doc, 160, y, 'Budget', fmtEur(dossier.budget));
  y += 14;
  kv(doc, 18, y, 'Référence', dossier.numero_dossier || '—');
  y += 14;

  // Services
  y = sectionTitle(doc, y, 'Services souscrits');
  const services = getServices(dossier);
  const activeServices = (Object.keys(services) as any[]).filter(k => services[k]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  let xs = 18;
  activeServices.forEach(k => {
    const label = `✓ ${SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k}`;
    doc.setFillColor(245, 240, 220);
    doc.roundedRect(xs, y, 56, 8, 1.5, 1.5, 'F');
    doc.text(label, xs + 2, y + 5.5);
    xs += 60;
    if (xs > 150) { xs = 18; y += 11; }
  });
  y += 18;

  // Avancement
  y = sectionTitle(doc, y, 'Avancement');
  const p = progressFromStatus(dossier);
  const barW = 180;
  doc.setFillColor(235, 235, 235);
  doc.rect(15, y, barW, 6, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(15, y, barW * (p.current / p.total), 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  y += 12;
  doc.text(`Étape ${p.current} / ${p.total}`, 18, y);
  y += 12;

  // Stratégie
  y = sectionTitle(doc, y, 'Stratégie patrimoniale');
  const strat = parseStrategieShort(dossier);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  strat.recos.forEach(r => {
    const lines = doc.splitTextToSize(`• ${r}`, 175);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 1;
  });
  if (strat.rendement) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN);
    doc.text(`Rendement cible : ${strat.rendement}`, 18, y);
  }

  // Footer
  doc.setFillColor(...GREEN);
  doc.rect(0, 280, 210, 17, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 280, 210, 0.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Document établi par Hunters Immobilier · Cabinet de conseil en investissement immobilier · Tours', 105, 287, { align: 'center' });
  doc.text(new Date().toLocaleDateString('fr-FR'), 105, 292, { align: 'center' });

  doc.save(`fiche-client-${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`);
  await archive(dossier.id, 'fiche_client', dossier.numero_dossier);
}

// ════════════════════════════════════════════════
// 2. FICHE INTERNE — 2 pages
// ════════════════════════════════════════════════
export async function exportFicheInterne(dossier: Dossier, conseillerNom: string) {
  const [{ default: jsPDF }, logo, activites] = await Promise.all([
    import('jspdf'),
    loadLogoBase64(),
    fetchActivites(dossier.id, 5),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const numero = dossier.numero_dossier;
  const dateStr = new Date().toLocaleDateString('fr-FR');

  header(doc, logo, numero);
  let y = 22;

  // En-tête
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.text(dossier.client_name, 15, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(`Conseiller : ${conseillerNom} · Extrait le ${dateStr}`, 15, y + 11);
  y += 18;

  // Profil
  y = sectionTitle(doc, y, 'Profil synthétique');
  kv(doc, 18, y, 'Ville', dossier.ville || '—');
  kv(doc, 65, y, 'Budget', fmtEur(dossier.budget));
  kv(doc, 115, y, 'Honoraires', fmtEur(dossier.honoraires));
  kv(doc, 165, y, 'Statut', dossier.status);
  y += 16;

  // Services
  y = sectionTitle(doc, y, 'Services souscrits');
  const services = getServices(dossier);
  const statuts = ((dossier.services_souscrits as any)?._statuts as Record<string, string>) || {};
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  (Object.keys(services) as any[]).filter(k => services[k]).forEach(k => {
    const s = statuts[k] || 'en_cours';
    const icon = s === 'cloture' ? '●' : '○';
    doc.text(`${icon} ${SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k} — ${s}`, 18, y);
    y += 5.5;
  });
  y += 4;

  // Avancement
  y = sectionTitle(doc, y, 'Avancement');
  const steps = getWorkflowSteps(dossier);
  const p = progressFromStatus(dossier);
  doc.setFillColor(235, 235, 235);
  doc.rect(15, y, 180, 6, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(15, y, 180 * (p.current / p.total), 6, 'F');
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK);
  steps.forEach((s, i) => {
    const dot = i + 1 <= p.current ? '✓' : '·';
    doc.setTextColor(i + 1 === p.current ? GREEN[0] : DARK[0], i + 1 === p.current ? GREEN[1] : DARK[1], i + 1 === p.current ? GREEN[2] : DARK[2]);
    doc.text(`${dot} ${i + 1}. ${s.short}`, 18 + (i % 5) * 36, y + Math.floor(i / 5) * 6);
  });
  y += Math.ceil(steps.length / 5) * 6 + 6;

  // Stratégie
  y = sectionTitle(doc, y, 'Stratégie patrimoniale');
  const strat = parseStrategieShort(dossier);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  strat.recos.forEach(r => {
    const lines = doc.splitTextToSize(`• ${r}`, 175);
    doc.text(lines, 18, y);
    y += lines.length * 5 + 1;
  });
  if (strat.rendement) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREEN);
    doc.text(`Rendement cible : ${strat.rendement}`, 18, y);
    y += 6;
  }

  // Page 2 : activités
  doc.addPage();
  header(doc, logo, numero);
  let y2 = 22;
  y2 = sectionTitle(doc, y2, 'Dernière activité');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  if (activites.length === 0) {
    doc.text('Aucune activité récente.', 18, y2);
  } else {
    activites.forEach(a => {
      const dt = new Date(a.created_at).toLocaleDateString('fr-FR');
      doc.setFont('helvetica', 'bold');
      doc.text(`${dt} · ${a.type}`, 18, y2);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(a.commentaire || '', 175);
      doc.text(lines, 18, y2 + 5);
      y2 += 5 + lines.length * 5 + 3;
    });
  }

  footer(doc, `Hunters Immobilier · ${dateStr} · Usage interne confidentiel`);
  doc.setPage(1);
  footer(doc, `Hunters Immobilier · ${dateStr} · Usage interne confidentiel`);

  doc.save(`fiche-interne-${numero || dossier.id.slice(0, 8)}.pdf`);
  await archive(dossier.id, 'fiche_interne', numero);
}

// ════════════════════════════════════════════════
// 3. DOSSIER INTÉGRAL — 10 pages
// ════════════════════════════════════════════════
export async function exportDossierIntegral(dossier: Dossier, conseillerNom: string) {
  const [{ default: jsPDF }, logo, activites, biens, historique, docsGenres, signatures] = await Promise.all([
    import('jspdf'),
    loadLogoBase64(),
    fetchActivites(dossier.id, 50),
    fetchBiens(dossier.id),
    fetchHistorique(dossier.id),
    fetchDocsGeneres(dossier.id),
    fetchSignatures(dossier.id),
  ]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const numero = dossier.numero_dossier;
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const mention = 'Hunters Immobilier · Confidentiel · Usage interne';

  // ── PAGE 1 — Couverture
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 0, 210, 3, 'F');
  doc.rect(0, 294, 210, 3, 'F');
  if (logo) { try { doc.addImage(logo, 'JPEG', 95, 35, 20, 20); } catch { /* ignore */ } }
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HUNTERS IMMOBILIER', 105, 65, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('DOSSIER', 105, 110, { align: 'center' });
  doc.text('CONFIDENTIEL', 105, 124, { align: 'center' });
  doc.setFillColor(...GOLD);
  doc.rect(75, 132, 60, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(dossier.client_name, 105, 155, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(`Référence : ${numero || dossier.id.slice(0, 8)}`, 105, 165, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.text(`Conseiller : ${conseillerNom}`, 105, 175, { align: 'center' });
  doc.text(`Édition : ${dateStr}`, 105, 182, { align: 'center' });

  // Helper next page
  const nextPage = (title: string, num: number) => {
    doc.addPage();
    header(doc, logo, numero);
    footer(doc, mention, num, 10);
    let y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...GREEN);
    doc.text(`${num}. ${title}`, 15, y + 5);
    doc.setFillColor(...GOLD);
    doc.rect(15, y + 8, 50, 0.6, 'F');
    return y + 18;
  };

  const drawLines = (lines: string[], y: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    lines.forEach(l => {
      const wrapped = doc.splitTextToSize(l, 180);
      if (y + wrapped.length * 5 > 275) return;
      doc.text(wrapped, 15, y);
      y += wrapped.length * 5 + 1;
    });
    return y;
  };

  // ── PAGE 2 — Profil client
  let y = nextPage('Profil client', 2);
  y = drawLines([
    `Nom : ${dossier.client_name}`,
    `Email : ${dossier.email || '—'}`,
    `Téléphone : ${dossier.phone || '—'}`,
    `Ville cible : ${dossier.ville || '—'}`,
    '',
    'Notes / Situation :',
    dossier.notes || '—',
  ], y);

  // ── PAGE 3 — Capacité financière
  y = nextPage('Capacité financière', 3);
  y = drawLines([
    `Budget total : ${fmtEur(dossier.budget)}`,
    `Honoraires : ${fmtEur(dossier.honoraires)}`,
    '',
    'Détail à compléter via la stratégie patrimoniale.',
  ], y);

  // ── PAGE 4 — Services souscrits
  y = nextPage('Services souscrits', 4);
  const services = getServices(dossier);
  const statuts = ((dossier.services_souscrits as any)?._statuts as Record<string, string>) || {};
  doc.setFontSize(10);
  (Object.keys(services) as any[]).forEach(k => {
    const active = services[k];
    const s = statuts[k] || (active ? 'en_cours' : '—');
    doc.setTextColor(active ? GREEN[0] : GREY[0], active ? GREEN[1] : GREY[1], active ? GREEN[2] : GREY[2]);
    doc.setFont('helvetica', active ? 'bold' : 'normal');
    doc.text(`${active ? '✓' : '·'} ${SERVICE_LABELS[k as keyof typeof SERVICE_LABELS] || k} — ${active ? s : 'non souscrit'}`, 15, y);
    y += 6;
  });
  y += 4;
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
  doc.text(`Type d'accompagnement : ${dossier.type_accompagnement || 'cle_en_main'}`, 15, y);

  // ── PAGE 5 — Stratégie patrimoniale
  y = nextPage('Stratégie patrimoniale', 5);
  const strat = parseStrategieShort(dossier);
  drawLines(strat.recos.map(r => `• ${r}`).concat(strat.rendement ? ['', `Rendement cible : ${strat.rendement}`] : []), y);

  // ── PAGE 6 — Biens identifiés
  y = nextPage('Biens identifiés', 6);
  if (biens.length === 0) drawLines(['Aucun bien identifié pour ce dossier.'], y);
  else biens.forEach((b: any) => {
    y = drawLines([`${b.reference || '—'} · ${b.ville || ''} · ${fmtEur(Number(b.prix_acquisition) || 0)} · Statut : ${b.statut}`], y);
  });

  // ── PAGE 7 — Journal d'activité
  y = nextPage("Journal d'activité", 7);
  if (activites.length === 0) drawLines(['Aucune activité.'], y);
  else activites.slice(0, 25).forEach(a => {
    const dt = new Date(a.created_at).toLocaleDateString('fr-FR');
    y = drawLines([`${dt} · ${a.type} — ${a.commentaire || ''}`], y);
  });

  // ── PAGE 8 — Documents et signatures
  y = nextPage('Documents et signatures', 8);
  drawLines([
    'Documents générés :',
    ...docsGenres.map((d: any) => `· ${d.type} — ${new Date(d.date_generation).toLocaleDateString('fr-FR')}`),
    '',
    'Signatures :',
    ...signatures.map((s: any) => `· ${s.document_name} — ${s.status}${s.signed_at ? ' le ' + new Date(s.signed_at).toLocaleDateString('fr-FR') : ''}`),
  ], y);

  // ── PAGE 9 — Historique statuts
  y = nextPage('Historique des statuts', 9);
  if (historique.length === 0) drawLines(['Aucun changement de statut enregistré.'], y);
  else historique.forEach((h: any) => {
    const dt = new Date(h.date_changement).toLocaleDateString('fr-FR');
    y = drawLines([`${dt} · ${h.ancien_statut || '—'} → ${h.nouveau_statut}`], y);
  });

  // ── PAGE 10 — Synthèse
  y = nextPage('Synthèse', 10);
  const p = progressFromStatus(dossier);
  doc.setFillColor(235, 235, 235);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFillColor(...GREEN);
  doc.rect(15, y, 180 * (p.current / p.total), 8, 'F');
  y += 14;
  drawLines([
    `Étape actuelle : ${p.current} / ${p.total}`,
    `Statut : ${dossier.status}`,
    '',
    'Prochaines actions recommandées :',
    '· Mettre à jour les coordonnées si manquantes',
    '· Finaliser la stratégie patrimoniale',
    '· Avancer vers l\'étape suivante du workflow',
  ], y);

  // Footer page 1
  doc.setPage(1);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(mention, 105, 270, { align: 'center' });

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
