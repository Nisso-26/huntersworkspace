import { useEffect, useMemo, useRef, useState } from 'react';
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

const GREEN: [number, number, number] = [26, 77, 46];
const GOLD: [number, number, number] = [245, 168, 0];
const TEXT: [number, number, number] = [17, 17, 17];
const ROW_ALT: [number, number, number] = [245, 245, 245];

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
  '10. CONCLUSION ET FORMULES DE POLITESSE',
];

const DISCLAIMER =
  "Ce rapport est fourni à titre informatif par Hunters Immobilier dans le cadre d'un accompagnement personnalisé. Il ne constitue pas un conseil en investissement au sens juridique. Hunters Immobilier n'est pas conseiller en gestion de patrimoine ni conseiller fiscal. Nous recommandons de consulter un CGP ou expert-comptable pour toute décision d'investissement.";

function roleToTitle(role: string | null | undefined): string {
  if (role === 'super_admin') return 'Directeur';
  if (role === 'decoratrice') return 'Décoratrice';
  return 'Conseiller';
}

/** Sépare un rapport markdown en 10 morceaux indexés sur SECTION_TITLES. */
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

export default function RapportConseilButton({ dossier }: Props) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<string[]>(() => SECTION_TITLES.map(() => ''));
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const conseillerNom = (user?.user_metadata as any)?.full_name || user?.email || 'Hunters Immobilier';
  const conseillerTitre = roleToTitle(role);

  const strategie: StrategieData | null = useMemo(() => parseStrategie(dossier.strategie).strategie, [dossier.strategie]);

  // ----- Données graphiques -----
  const recos = strategie?.recommandations?.slice(0, 3) ?? [];
  const compareData = recos.map((r, i) => ({
    nom: r.titre?.slice(0, 18) || `Option ${i + 1}`,
    'Rendement brut (%)': Number((r.rendement_brut_estime_pct || 0).toFixed(2)),
    'Cash-flow net (€/mois)': Math.round(r.cash_flow_net_mensuel_estime || 0),
    'Effort épargne (€/mois)':
      Math.max(0, Math.round((r.mensualite_credit_estimee || 0) - (r.loyer_brut_mensuel_estime || 0))),
  }));

  const bestCf = recos[0]?.cash_flow_net_mensuel_estime ?? 0;
  const projectionData = Array.from({ length: 11 }, (_, year) => ({
    annee: `An ${year}`,
    'Cash-flow cumulé (€)': Math.round(bestCf * 12 * year),
  }));

  // ----- Génération initiale -----
  const generate = async () => {
    setLoading(true);
    setSections(SECTION_TITLES.map(() => ''));
    setOpen(true);
    try {
      const res = await supabase.functions.invoke('generate-rapport-conseil', {
        body: {
          client_name: dossier.client_name,
          email: dossier.email,
          ville: dossier.ville,
          budget: dossier.budget,
          honoraires: dossier.honoraires,
          status: dossier.status,
          notes: dossier.notes,
          strategie: dossier.strategie,
          conseiller: conseillerNom,
          conseiller_titre: conseillerTitre,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de génération');
      setSections(splitSections(res.data.rapport));
      toast.success('Rapport généré — vous pouvez maintenant l\'éditer');
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
          client_name: dossier.client_name,
          email: dossier.email,
          ville: dossier.ville,
          budget: dossier.budget,
          honoraires: dossier.honoraires,
          status: dossier.status,
          notes: dossier.notes,
          strategie: dossier.strategie,
          conseiller: conseillerNom,
          conseiller_titre: conseillerTitre,
          section_index: idx,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de régénération');
      const parts = splitSections(res.data.rapport);
      const newText = parts[idx] || res.data.rapport.replace(new RegExp(`^${SECTION_TITLES[idx]}\\s*`, 'i'), '').trim();
      setSections(prev => prev.map((s, i) => (i === idx ? newText : s)));
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
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const html2canvas = html2canvasMod.default;

      // Capture des 2 graphiques cachés
      const captureChart = async (id: string): Promise<string | null> => {
        const node = document.getElementById(id);
        if (!node) return null;
        try {
          const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2 });
          return canvas.toDataURL('image/png');
        } catch { return null; }
      };
      const compareImg = compareData.length > 0 ? await captureChart('rapport-chart-compare') : null;
      const projImg = bestCf !== 0 ? await captureChart('rapport-chart-projection') : null;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210;
      const H = 297;
      const M = 18;
      const CW = W - M * 2;

      // ===== PAGE DE GARDE =====
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(...GOLD);
      doc.rect(0, 90, W, 1.5, 'F');
      doc.rect(0, 200, W, 1.5, 'F');

      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(48);
      doc.text('HUNTERS', W / 2, 70, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('IMMOBILIER · TOURS', W / 2, 80, { align: 'center' });

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('RAPPORT DE CONSEIL', W / 2, 120, { align: 'center' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('en Investissement Immobilier', W / 2, 130, { align: 'center' });

      doc.setFontSize(10);
      doc.setTextColor(...GOLD);
      doc.text('Préparé pour', W / 2, 155, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(dossier.client_name, W / 2, 165, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...GOLD);
      doc.text('Conseiller signataire', W / 2, 220, { align: 'center' });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(`${conseillerNom}`, W / 2, 230, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`${conseillerTitre} — Hunters Immobilier`, W / 2, 237, { align: 'center' });

      doc.setFontSize(9);
      doc.setTextColor(...GOLD);
      doc.text(
        new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        W / 2, 270, { align: 'center' },
      );

      // ===== PAGE 2 — DISCLAIMER =====
      doc.addPage();
      let y = M;
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, 18, 'F');
      doc.setTextColor(...GOLD);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('AVERTISSEMENT LÉGAL', M, 12);
      y = 35;

      // Encadré disclaimer
      doc.setDrawColor(...GOLD);
      doc.setLineWidth(0.6);
      doc.setFillColor(252, 247, 232);
      doc.roundedRect(M, y, CW, 70, 3, 3, 'FD');
      doc.setTextColor(...TEXT);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dLines = doc.splitTextToSize(DISCLAIMER, CW - 10);
      doc.text(dLines, M + 5, y + 10);

      y += 90;
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Sommaire', M, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT);
      SECTION_TITLES.forEach(t => {
        doc.text(`•  ${t}`, M + 4, y);
        y += 5.5;
      });

      // ===== PAGES SECTIONS =====
      const ensure = (h: number) => {
        if (y + h > H - 20) {
          doc.addPage();
          y = M;
        }
      };

      const drawSectionHeader = (title: string) => {
        ensure(14);
        doc.setFillColor(...GREEN);
        doc.rect(M, y, CW, 9, 'F');
        doc.setFillColor(...GOLD);
        doc.rect(M, y + 9, CW, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(title, M + 4, y + 6);
        y += 16;
      };

      const drawMarkdownTable = (rows: string[][]) => {
        if (rows.length < 2) return;
        const [header, ...body] = rows;
        const colCount = header.length;
        const colW = CW / colCount;
        ensure(10);
        doc.setFillColor(...GREEN);
        doc.rect(M, y, CW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        header.forEach((h, i) => {
          const txt = doc.splitTextToSize(h, colW - 4);
          doc.text(txt, M + i * colW + 2, y + 4.5);
        });
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT);
        body.forEach((row, idx) => {
          // hauteur de ligne adaptée
          const wrapped = row.map(c => doc.splitTextToSize(c, colW - 4));
          const rh = Math.max(6, Math.max(...wrapped.map(w => w.length)) * 4.2 + 2);
          ensure(rh);
          if (idx % 2 === 0) {
            doc.setFillColor(...ROW_ALT);
            doc.rect(M, y, CW, rh, 'F');
          }
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.1);
          doc.rect(M, y, CW, rh);
          wrapped.forEach((w, i) => doc.text(w, M + i * colW + 2, y + 4));
          y += rh;
        });
        y += 3;
      };

      const drawBodyText = (text: string) => {
        const lines = text.split('\n');
        let tableBuf: string[][] | null = null;
        const flushTable = () => {
          if (tableBuf && tableBuf.length >= 2) drawMarkdownTable(tableBuf);
          tableBuf = null;
        };
        for (const raw of lines) {
          const line = raw.replace(/\*\*/g, '');
          // Détection ligne de tableau Markdown
          if (/^\s*\|.*\|\s*$/.test(line)) {
            const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
            // ignorer la ligne séparatrice ---|---
            if (cells.every(c => /^:?-+:?$/.test(c))) continue;
            if (!tableBuf) tableBuf = [];
            tableBuf.push(cells);
            continue;
          } else if (tableBuf) {
            flushTable();
          }

          if (!line.trim()) {
            y += 2.5;
            continue;
          }
          const isBullet = /^[-•*]\s+/.test(line.trim());
          const text = isBullet ? '• ' + line.trim().replace(/^[-•*]\s+/, '') : line.trim();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...TEXT);
          const wrapped = doc.splitTextToSize(text, CW - (isBullet ? 4 : 0));
          ensure(wrapped.length * 4.8);
          doc.text(wrapped, M + (isBullet ? 4 : 0), y);
          y += wrapped.length * 4.8 + 1;
        }
        flushTable();
      };

      const drawStrategieTable = () => {
        if (!strategie) return;
        ensure(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...GREEN);
        doc.text('Indicateurs clés (stratégie patrimoniale)', M, y);
        y += 6;
        const rows: string[][] = [
          ['Indicateur', 'Valeur'],
          ['Revenus nets mensuels', `${strategie.indicateurs_cles.revenus_nets_totaux_mensuels.toLocaleString('fr-FR')} €`],
          ["Taux d'effort actuel", `${strategie.indicateurs_cles.taux_effort_actuel_pct} %`],
          ["Capacité d'emprunt estimée", `${strategie.indicateurs_cles.capacite_emprunt_estimee.toLocaleString('fr-FR')} €`],
          ['Mensualité max supplémentaire', `${strategie.indicateurs_cles.mensualite_max_supplementaire.toLocaleString('fr-FR')} €`],
          ['Cash-flow mensuel libre', `${strategie.indicateurs_cles.cash_flow_mensuel_libre.toLocaleString('fr-FR')} €`],
        ];
        drawMarkdownTable(rows);

        if (strategie.recommandations.length > 0) {
          ensure(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...GREEN);
          doc.text('Investissements recommandés (synthèse stratégie)', M, y);
          y += 6;
          const recoRows: string[][] = [['Dispositif', 'Budget', 'Mensualité', 'Loyer', 'Cash-flow', 'Rdt brut']];
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
        const phases = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5'];
        ensure(40);
        const startX = M + 10;
        const endX = W - M - 10;
        const cy = y + 12;
        // ligne verte
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(1.5);
        doc.line(startX, cy, endX, cy);
        // cercles
        const step = (endX - startX) / (phases.length - 1);
        phases.forEach((p, i) => {
          const cx = startX + step * i;
          doc.setFillColor(...GOLD);
          doc.circle(cx, cy, 5, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`${i + 1}`, cx, cy + 1.2, { align: 'center' });
          doc.setTextColor(...TEXT);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(p, cx, cy + 12, { align: 'center' });
        });
        y += 30;
      };

      const drawChartImage = (img: string | null, label: string) => {
        if (!img) return;
        ensure(82);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(label, M, y);
        y += 3;
        try {
          doc.addImage(img, 'PNG', M, y, CW, 75);
        } catch { /* skip */ }
        y += 78;
      };

      // Boucle des sections
      doc.addPage();
      y = M;
      sections.forEach((content, i) => {
        drawSectionHeader(SECTION_TITLES[i]);
        drawBodyText(content || '_(section vide)_');

        if (i === 3) {
          // Après section 4 : injecter données stratégie IA
          y += 2;
          drawStrategieTable();
        }
        if (i === 4 && compareImg) {
          y += 2;
          drawChartImage(compareImg, 'Graphique comparatif des scénarios');
        }
        if (i === 5 && projImg) {
          y += 2;
          drawChartImage(projImg, 'Projection du cash-flow cumulé sur 10 ans');
        }
        if (i === 7) {
          y += 2;
          drawTimeline();
        }
        y += 4;
      });

      // ===== Pied de page =====
      const total = doc.getNumberOfPages();
      for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        doc.setFillColor(...GREEN);
        doc.rect(0, 285, W, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...GOLD);
        doc.text('HUNTERS IMMOBILIER', M, 292);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.text("Cabinet de conseil en investissement immobilier · Tours", W / 2, 292, { align: 'center' });
        doc.text(`Page ${i} / ${total}`, W - M, 292, { align: 'right' });
      }

      doc.save(`Rapport_Conseil_${dossier.client_name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
      toast.success('PDF généré');
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
        {loading ? 'Génération...' : 'Générer le rapport de conseil'}
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
                  <strong className="text-primary">Avertissement :</strong> {DISCLAIMER}
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
                        {regenIdx === idx ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Régénérer
                      </Button>
                    </div>
                    <Textarea
                      value={sections[idx]}
                      onChange={(e) => updateSection(idx, e.target.value)}
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

      {/* Graphiques cachés rendus pour capture html2canvas */}
      {open && createPortal(
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: -10000,
            top: 0,
            width: 760,
            background: '#fff',
            pointerEvents: 'none',
          }}
        >
          {compareData.length > 0 && (
            <div id="rapport-chart-compare" style={{ width: 760, height: 360, padding: 16, background: '#fff' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="nom" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Rendement brut (%)" fill="#1A4D2E" />
                  <Bar dataKey="Cash-flow net (€/mois)" fill="#F5A800" />
                  <Bar dataKey="Effort épargne (€/mois)" fill="#6b7280" />
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
                  <Line
                    type="monotone"
                    dataKey="Cash-flow cumulé (€)"
                    stroke="#1A4D2E"
                    strokeWidth={2.5}
                    dot={{ fill: '#F5A800', r: 4 }}
                  />
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
