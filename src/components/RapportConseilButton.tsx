import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dossier } from '@/hooks/use-dossiers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Loader2, Download, RefreshCw, X } from 'lucide-react';
import { parseStrategie, type StrategieData } from '@/lib/strategie-parser';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';

interface Props {
  dossier: Dossier;
}

const GREEN:   [number, number, number] = [26,  77,  46];
const GOLD:    [number, number, number] = [245, 168,  0];
const TEXT:    [number, number, number] = [30,  30,  30];
const ROW_ALT: [number, number, number] = [248, 248, 248];
const LIGHT_GOLD: [number, number, number] = [253, 245, 220];

const SECTION_TITLES = [
  '1. PROFIL CLIENT',
  '2. CAPACITÉ DE FINANCEMENT',
  "3. MONTAGES ET SCÉNARIOS DE FINANCEMENT",
  "4. STRATÉGIE D'INVESTISSEMENT",
  '5. SCÉNARIO COMPARATIF',
  '6. RENTABILITÉ ET CASH-FLOW CIBLES',
  '7. RECOMMANDATIONS',
  "8. PLAN D'INVESTISSEMENT PROGRESSIF",
  '9. ORIENTATION FISCALE',
  '10. CONCLUSION',
];

const DISCLAIMER =
  "Ce rapport est fourni à titre informatif par Hunters Immobilier dans le cadre d'un accompagnement personnalisé. " +
  "Il ne constitue pas un conseil en investissement au sens juridique du terme. " +
  "Hunters Immobilier n'est pas conseiller en gestion de patrimoine (CGP) ni conseiller fiscal. " +
  "Toute décision d'investissement doit être prise après consultation d'un professionnel habilité.";

function roleToTitle(role: string | null | undefined): string {
  if (role === 'super_admin') return 'Directeur';
  if (role === 'decoratrice') return 'Décoratrice';
  return 'Conseiller';
}

function splitSections(markdown: string): string[] {
  const out = SECTION_TITLES.map(() => '');
  if (!markdown) return out;
  const lines = markdown.split('\n');
  let current = -1;
  let buf: string[] = [];
  const flush = () => {
    if (current >= 0) out[current] = buf.join('\n').trim();
    buf = [];
  };
  for (const raw of lines) {
    const stripped = raw.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
    const m = stripped.match(/^(\d{1,2})\.\s+(.+)/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < SECTION_TITLES.length) {
        flush();
        current = idx;
        continue;
      }
    }
    buf.push(raw);
  }
  flush();
  return out;
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/assets/hunters-logo.jpg');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawPageHeader(
  doc: any,
  logoBase64: string | null,
  M: number,
  W: number,
  GOLD: [number, number, number],
  GREEN: [number, number, number],
): number {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 14, 'F');
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'JPEG', M, 2, 10, 10); } catch { /* ignore */ }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  doc.text('HUNTERS IMMOBILIER', M + 13, 8);
  doc.setFillColor(...GOLD);
  doc.rect(0, 14, W, 0.6, 'F');
  return 22;
}

export default function RapportConseilButton({ dossier }: Props) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<string[]>(() => SECTION_TITLES.map(() => ''));
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const conseillerNom   = (user?.user_metadata as any)?.full_name || user?.email || 'Hunters Immobilier';
  const conseillerTitre = roleToTitle(role);

  const strategie: StrategieData | null = useMemo(
    () => parseStrategie(dossier.strategie).strategie,
    [dossier.strategie],
  );

  const recos = strategie?.recommandations?.slice(0, 3) ?? [];
  const compareData = recos.map((r, i) => ({
    nom: r.titre?.slice(0, 18) || `Option ${i + 1}`,
    'Rendement brut (%)':      Number((r.rendement_brut_estime_pct || 0).toFixed(2)),
    'Cash-flow net (€/mois)':  Math.round(r.cash_flow_net_mensuel_estime || 0),
    'Effort épargne (€/mois)': Math.max(0, Math.round(
      (r.mensualite_credit_estimee || 0) - (r.loyer_brut_mensuel_estime || 0),
    )),
  }));

  const bestCf = recos[0]?.cash_flow_net_mensuel_estime ?? 0;
  const projectionData = Array.from({ length: 11 }, (_, year) => ({
    annee: `An ${year}`,
    'Cash-flow cumulé (€)': Math.round(bestCf * 12 * year),
  }));

  const generate = async () => {
    setLoading(true);
    setSections(SECTION_TITLES.map(() => ''));
    setOpen(true);
    try {
      const res = await supabase.functions.invoke('generate-rapport-conseil', {
        body: {
          client_name:      dossier.client_name,
          email:            dossier.email,
          ville:            dossier.ville,
          budget:           dossier.budget,
          honoraires:       dossier.honoraires,
          status:           dossier.status,
          notes:            dossier.notes,
          strategie:        dossier.strategie,
          conseiller:       conseillerNom,
          conseiller_titre: conseillerTitre,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de génération');
      setSections(splitSections(res.data.rapport));
      toast.success("Rapport généré — vous pouvez maintenant l'éditer");
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la génération');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async (idx: number) => {
    setRegenIdx(idx);
    try {
      const res = await supabase.functions.invoke('generate-rapport-conseil', {
        body: {
          client_name:      dossier.client_name,
          email:            dossier.email,
          ville:            dossier.ville,
          budget:           dossier.budget,
          honoraires:       dossier.honoraires,
          status:           dossier.status,
          notes:            dossier.notes,
          strategie:        dossier.strategie,
          conseiller:       conseillerNom,
          conseiller_titre: conseillerTitre,
          section_index:    idx,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de régénération');
      const parts  = splitSections(res.data.rapport);
      const newTxt = parts[idx] || res.data.rapport
        .replace(new RegExp(`^${SECTION_TITLES[idx]}\\s*`, 'i'), '')
        .trim();
      setSections(prev => prev.map((s, i) => (i === idx ? newTxt : s)));
      toast.success(`Section ${idx + 1} régénérée`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur de régénération');
    } finally {
      setRegenIdx(null);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const [{ default: jsPDF }, html2canvasMod, logoBase64] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
        loadLogoBase64(),
      ]);
      const html2canvas = html2canvasMod.default;

      const captureChart = async (id: string): Promise<string | null> => {
        const node = document.getElementById(id);
        if (!node) return null;
        try {
          const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
          return canvas.toDataURL('image/png');
        } catch { return null; }
      };
      const compareImg = compareData.length > 0 ? await captureChart('rapport-chart-compare') : null;
      const projImg    = bestCf !== 0            ? await captureChart('rapport-chart-projection') : null;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W  = 210;
      const H  = 297;
      const M  = 18;
      const CW = W - M * 2;

      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      // ══ PAGE DE GARDE ══
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(0, 0, W, 2, 'F');
      doc.rect(0, H - 2, W, 2, 'F');

      // Bloc blanc central
      doc.setFillColor(255, 255, 255);
      doc.rect(M, 55, CW, 175, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(M, 55, CW, 1, 'F');
      doc.rect(M, 230, CW, 1, 'F');

      // Logo dans le bandeau vert
      if (logoBase64) {
        try { doc.addImage(logoBase64, 'JPEG', M, 10, 28, 28); } catch { /* ignore */ }
      }

      // Nom cabinet dans le bandeau
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('HUNTERS IMMOBILIER', M + 32, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(200, 200, 200);
      doc.text('Cabinet de conseil en investissement immobilier · Tours', M + 32, 27);

      // Surtitre
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('RAPPORT DE CONSEIL', W / 2, 75, { align: 'center' });

      // Filet or
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.5);
      doc.line(W / 2 - 30, 79, W / 2 + 30, 79);

      // Titre principal
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('Investissement', W / 2, 92, { align: 'center' });
      doc.text('Immobilier', W / 2, 103, { align: 'center' });

      // Séparateur
      doc.setFillColor(...GOLD);
      doc.rect(W / 2 - 20, 110, 40, 0.8, 'F');

      // Préparé pour
      doc.setTextColor(130, 130, 130);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('PRÉPARÉ POUR', W / 2, 124, { align: 'center' });

      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(dossier.client_name, W / 2, 136, { align: 'center' });

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(M + 20, 141, W - M - 20, 141);

      // Référence dossier
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Réf. dossier · ${dossier.id?.slice(0, 8).toUpperCase() || 'N/A'}`, W / 2, 150, { align: 'center' });

      // Bloc signataire
      doc.setFillColor(240, 246, 242);
      doc.roundedRect(M + 20, 160, CW - 40, 40, 2, 2, 'F');
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.4);
      doc.roundedRect(M + 20, 160, CW - 40, 40, 2, 2, 'S');

      doc.setTextColor(130, 130, 130);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('CONSEILLER SIGNATAIRE', W / 2, 170, { align: 'center' });

      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(conseillerNom, W / 2, 181, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${conseillerTitre} · Hunters Immobilier`, W / 2, 190, { align: 'center' });

      // Date
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(dateStr, W / 2, 222, { align: 'center' });

      // Logo bas page de garde
      if (logoBase64) {
        try { doc.addImage(logoBase64, 'JPEG', W / 2 - 8, 240, 16, 16); } catch { /* ignore */ }
      }

      // Tagline
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.text('Chasseur Immobilier · Tours', W / 2, 260, { align: 'center' });

      // ══ PAGE 2 — DISCLAIMER + SOMMAIRE ══
      doc.addPage();
      let y = drawPageHeader(doc, logoBase64, M, W, GOLD, GREEN);

      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AVERTISSEMENT LÉGAL', M, y + 8);
      y += 14;

      doc.setFillColor(...GOLD);
      doc.rect(M, y, CW, 0.6, 'F');
      y += 8;

      const dLines = doc.splitTextToSize(DISCLAIMER, CW - 12);
      const dH     = dLines.length * 5.2 + 14;
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.5);
      doc.setFillColor(...LIGHT_GOLD);
      doc.roundedRect(M, y, CW, dH, 2, 2, 'FD');
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(dLines, M + 6, y + 8);
      y += dH + 12;

      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SOMMAIRE', M, y);
      y += 6;
      doc.setFillColor(...GOLD);
      doc.rect(M, y, CW, 0.6, 'F');
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      SECTION_TITLES.forEach((t, i) => {
        const c = i % 2 === 0 ? GREEN : TEXT;
        doc.setTextColor(c[0], c[1], c[2]);
        doc.text(`${i + 1 < 10 ? '0' + (i + 1) : i + 1}  ·  ${t.replace(/^\d+\.\s+/, '')}`, M + 4, y);
        y += 6;
      });

      // ══ PAGES SECTIONS ══
      doc.addPage();
      y = drawPageHeader(doc, logoBase64, M, W, GOLD, GREEN);

      const ensure = (h: number) => {
        if (y + h > H - 22) {
          doc.addPage();
          y = drawPageHeader(doc, logoBase64, M, W, GOLD, GREEN);
        }
      };

      const drawSectionHeader = (title: string) => {
        ensure(16);
        doc.setFillColor(...GREEN);
        doc.rect(M, y, CW, 10, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(M, y + 10, CW, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.replace(/^\d+\.\s+/, '').toUpperCase(), M + 5, y + 6.8);
        const num = title.match(/^(\d+)\./)?.[1] || '';
        doc.setTextColor(...GOLD);
        doc.setFontSize(7);
        doc.text(num, M + CW - 8, y + 6.8);
        y += 16;
      };

      const drawMarkdownTable = (rows: string[][]) => {
        if (rows.length < 2) return;
        const [header, ...body] = rows;
        const colCount = header.length;
        const colW     = CW / colCount;
        ensure(10);
        doc.setFillColor(...GREEN);
        doc.rect(M, y, CW, 7.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        header.forEach((h, i) => {
          doc.text(doc.splitTextToSize(h, colW - 4), M + i * colW + 2.5, y + 5);
        });
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT);
        body.forEach((row, idx) => {
          const wrapped = row.map(c => doc.splitTextToSize(c, colW - 4));
          const rh      = Math.max(6.5, Math.max(...wrapped.map(w => w.length)) * 4.2 + 2.5);
          ensure(rh);
          if (idx % 2 === 0) { doc.setFillColor(...ROW_ALT); doc.rect(M, y, CW, rh, 'F'); }
          doc.setDrawColor(210, 210, 210);
          doc.setLineWidth(0.1);
          doc.rect(M, y, CW, rh);
          wrapped.forEach((w, i) => doc.text(w, M + i * colW + 2.5, y + 4.5));
          y += rh;
        });
        y += 4;
      };

      const drawBodyText = (text: string) => {
        const lines = text.split('\n');
        let tableBuf: string[][] | null = null;
        const flushTable = () => { if (tableBuf && tableBuf.length >= 2) drawMarkdownTable(tableBuf); tableBuf = null; };
        for (const raw of lines) {
          const line = raw.replace(/\*\*/g, '');
          if (/^\s*\|.*\|\s*$/.test(line)) {
            const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
            if (cells.every(c => /^:?-+:?$/.test(c))) continue;
            if (!tableBuf) tableBuf = [];
            tableBuf.push(cells);
            continue;
          } else if (tableBuf) { flushTable(); }
          if (!line.trim()) { y += 2.5; continue; }
          const isBullet = /^[-•*]\s+/.test(line.trim());
          const txt      = isBullet ? '• ' + line.trim().replace(/^[-•*]\s+/, '') : line.trim();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...TEXT);
          const wrapped = doc.splitTextToSize(txt, CW - (isBullet ? 6 : 0));
          ensure(wrapped.length * 4.8 + 1);
          doc.text(wrapped, M + (isBullet ? 6 : 0), y);
          y += wrapped.length * 4.8 + 1;
        }
        flushTable();
      };

      const drawStrategieTable = () => {
        if (!strategie) return;
        ensure(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...GREEN);
        doc.text('Indicateurs clés — synthèse patrimoniale', M, y);
        y += 6;
        drawMarkdownTable([
          ['Indicateur', 'Valeur'],
          ['Revenus nets mensuels', `${strategie.indicateurs_cles.revenus_nets_totaux_mensuels.toLocaleString('fr-FR')} €`],
          ["Taux d'effort actuel", `${strategie.indicateurs_cles.taux_effort_actuel_pct} %`],
          ["Capacité d'emprunt estimée", `${strategie.indicateurs_cles.capacite_emprunt_estimee.toLocaleString('fr-FR')} €`],
          ['Mensualité max supplémentaire', `${strategie.indicateurs_cles.mensualite_max_supplementaire.toLocaleString('fr-FR')} €`],
          ['Cash-flow mensuel libre', `${strategie.indicateurs_cles.cash_flow_mensuel_libre.toLocaleString('fr-FR')} €`],
        ]);
        if (strategie.recommandations.length > 0) {
          ensure(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(...GREEN);
          doc.text('Investissements recommandés', M, y);
          y += 6;
          const recoRows: string[][] = [['Dispositif', 'Budget', 'Mensualité', 'Loyer', 'Cash-flow net', 'Rdt brut']];
          strategie.recommandations.slice(0, 3).forEach(r => {
            recoRows.push([
              r.titre || r.dispositif || '—',
              `${(r.budget_acquisition_total || 0).toLocaleString('fr-FR')} €`,
              `${(r.mensualite_credit_estimee || 0).toLocaleString('fr-FR')} €`,
              `${(r.loyer_brut_mensuel_estime || 0).toLocaleString('fr-FR')} €`,
              `${(r.cash_flow_net_mensuel_estime || 0).toLocaleString('fr-FR')} €`,
              `${(r.rendement_brut_estime_pct || 0).toFixed(2)} %`,
            ]);
          });
          drawMarkdownTable(recoRows);
        }
      };

      const drawTimeline = () => {
        ensure(44);
        const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5'];
        const startX = M + 12;
        const endX   = W - M - 12;
        const cy     = y + 16;
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(1.8);
        doc.line(startX, cy, endX, cy);
        const step = (endX - startX) / (phases.length - 1);
        phases.forEach((p, i) => {
          const cx = startX + step * i;
          doc.setFillColor(200, 200, 200);
          doc.circle(cx + 0.5, cy + 0.5, 5.5, 'F');
          doc.setFillColor(...GOLD);
          doc.circle(cx, cy, 5.5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(`${i + 1}`, cx, cy + 1.2, { align: 'center' });
          doc.setTextColor(...GREEN);
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.text(p, cx, cy + 13, { align: 'center' });
        });
        y += 34;
      };

      const drawChartImage = (img: string | null, label: string) => {
        if (!img) return;
        ensure(86);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text(label, M, y);
        y += 3;
        try { doc.addImage(img, 'PNG', M, y, CW, 76); } catch { /* ignore */ }
        y += 80;
      };

      sections.forEach((content, i) => {
        drawSectionHeader(SECTION_TITLES[i]);
        drawBodyText(content || '_(section vide)_');
        if (i === 3) { y += 3; drawStrategieTable(); }
        if (i === 4 && compareImg) { y += 3; drawChartImage(compareImg, 'Graphique comparatif des scénarios'); }
        if (i === 5 && projImg)    { y += 3; drawChartImage(projImg, 'Projection du cash-flow cumulé sur 10 ans'); }
        if (i === 7)               { y += 3; drawTimeline(); }
        y += 5;
      });

      // ══ PIED DE PAGE ══
      const total = doc.getNumberOfPages();
      for (let p = 2; p <= total; p++) {
        doc.setPage(p);
        doc.setFillColor(...GREEN);
        doc.rect(0, H - 12, W, 12, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(0, H - 12, W, 0.6, 'F');
        if (logoBase64) {
          try { doc.addImage(logoBase64, 'JPEG', M, H - 10, 6, 6); } catch { /* ignore */ }
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...GOLD);
        doc.text('HUNTERS IMMOBILIER', M + 8, H - 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(255, 255, 255);
        doc.text('Cabinet de conseil en investissement immobilier · Tours', W / 2, H - 5.5, { align: 'center' });
        doc.text(`Page ${p} / ${total}`, W - M, H - 5.5, { align: 'right' });
      }

      doc.save(`Rapport_Conseil_${dossier.client_name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
      toast.success('PDF généré avec succès');
    } catch (e: any) {
      toast.error(e.message || 'Erreur export PDF');
    } finally {
      setExporting(false);
    }
  };

  const updateSection = (idx: number, value: string) => {
    setSections(prev => prev.map((s, i) => (i === idx ? value : s)));
  };

  return (
    <>
      <Button
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {loading ? 'Génération…' : 'Générer le rapport de conseil'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle className="text-primary text-lg">
              Rapport de conseil — {dossier.client_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Modifiez chaque section librement, régénérez celles qui ne conviennent pas, puis exportez le PDF.
            </p>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Rédaction du rapport en cours…
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded border border-accent/40 bg-accent/5 p-3 text-xs text-foreground">
                  <strong className="text-primary">Avertissement légal :</strong> {DISCLAIMER}
                </div>
                {SECTION_TITLES.map((title, idx) => (
                  <div key={title} className="border rounded-md overflow-hidden">
                    <div className="flex items-center justify-between bg-primary text-primary-foreground px-3 py-2">
                      <span className="font-semibold text-sm">{title}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1.5"
                        disabled={regenIdx !== null}
                        onClick={() => regenerate(idx)}
                      >
                        {regenIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Régénérer
                      </Button>
                    </div>
                    <Textarea
                      value={sections[idx]}
                      onChange={e => updateSection(idx, e.target.value)}
                      className="min-h-[160px] border-0 rounded-none font-sans text-sm leading-relaxed resize-y focus-visible:ring-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-6 py-3 border-t shrink-0 sm:justify-between">
            <Button variant="outline" onClick={() => setOpen(false)} className="gap-2">
              <X className="w-4 h-4" />
              Annuler
            </Button>
            <Button
              onClick={exportPdf}
              disabled={loading || exporting || sections.every(s => !s.trim())}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Export en cours…' : 'Exporter en PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open && createPortal(
        <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, width: 760, background: '#fff', pointerEvents: 'none' }}>
          {compareData.length > 0 && (
            <div id="rapport-chart-compare" style={{ width: 760, height: 360, padding: 16, background: '#fff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Rendement brut (%)"      fill="#1A4D2E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Cash-flow net (€/mois)"  fill="#F5A800" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Effort épargne (€/mois)" fill="#9ca3af" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {bestCf !== 0 && (
            <div id="rapport-chart-projection" style={{ width: 760, height: 360, padding: 16, background: '#fff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="annee" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Cash-flow cumulé (€)" stroke="#1A4D2E" strokeWidth={2.5} dot={{ fill: '#F5A800', r: 5, strokeWidth: 2, stroke: '#1A4D2E' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
