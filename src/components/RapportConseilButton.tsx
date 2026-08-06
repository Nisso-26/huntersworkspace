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
import { fmtPdfEur, fmtPdfEurInt } from '@/lib/pdf-utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';

interface Props {
  dossier: Dossier;
}

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
    // Match only an expected top-level heading. A generic `1. ...` matcher also
    // catches ordered lists inside sections and silently moves/overwrites content.
    const idx = SECTION_TITLES.findIndex(title =>
      stripped.localeCompare(title, 'fr', { sensitivity: 'accent' }) === 0,
    );
    if (idx >= 0) {
      flush();
      current = idx;
      continue;
    }
    if (current >= 0) buf.push(raw);
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
      const generatedSections = splitSections(res.data.rapport);
      const missingSections = generatedSections
        .map((content, idx) => (content.trim() ? null : idx + 1))
        .filter((idx): idx is number => idx !== null);
      if (missingSections.length > 0) {
        throw new Error(`Rapport incomplet : section${missingSections.length > 1 ? 's' : ''} ${missingSections.join(', ')} manquante${missingSections.length > 1 ? 's' : ''}`);
      }
      setSections(generatedSections);
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
      const missingSections = sections
        .map((content, idx) => (content.trim() ? null : idx + 1))
        .filter((idx): idx is number => idx !== null);
      if (missingSections.length > 0) {
        throw new Error(`Export impossible : section${missingSections.length > 1 ? 's' : ''} ${missingSections.join(', ')} vide${missingSections.length > 1 ? 's' : ''}`);
      }

      const [{ default: jsPDF }, html2canvasMod, ds] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
        import('@/lib/pdf-design-system'),
      ]);
      const html2canvas = html2canvasMod.default;
      const {
        C, FONT, LAYOUT, drawHeader, drawFooter, drawSectionTitle,
        drawIvoryBox, drawTableHeader, drawTableRow, ensureSpace,
        sanitizePdfText, loadLogo, drawCoverPage,
      } = ds;
      const logoBase64 = await loadLogo();

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
      const { marginL, marginR, pageW, contentW } = LAYOUT;
      const M = marginL;
      const CW = contentW;
      const refDossier = dossier.numero_dossier || dossier.id?.slice(0, 8).toUpperCase() || null;
      const ctx = { refDossier, titrePage: 'Rapport de conseil' };

      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      // ══ PAGE DE COUVERTURE — 60/40 charte V2.0 ══
      await drawCoverPage(doc, {
        logo: logoBase64,
        typeDocument: 'Rapport de conseil',
        titre: 'Investissement immobilier',
        sousTitre: 'Analyse patrimoniale et scenarios de financement',
        client: dossier.client_name,
        conseiller: `${conseillerNom} — ${conseillerTitre}`,
        refDossier,
        date: dateStr,
        confidentiel: true,
      });

      // ══ PAGE 2 — AVERTISSEMENT + SOMMAIRE ══
      doc.addPage();
      drawHeader(doc, refDossier, ctx.titrePage);
      let y = LAYOUT.headerH + 8;

      y = drawSectionTitle(doc, 'Avertissement légal', y);
      doc.setFont(FONT.body, 'normal');
      doc.setFontSize(9.5);
      const dLines = doc.splitTextToSize(sanitizePdfText(DISCLAIMER), CW - 11.2) as string[];
      const dH = dLines.length * 5.5 + 11;
      drawIvoryBox(doc, y, dH);
      doc.setTextColor(...C.ink);
      dLines.forEach((l, i) => doc.text(l, M + 5.6, y + 7.5 + i * 5.5));
      y += dH + 12;

      y = drawSectionTitle(doc, 'Sommaire', y);
      doc.setFont(FONT.body, 'normal');
      doc.setFontSize(9.5);
      SECTION_TITLES.forEach((t, i) => {
        y = ensureSpace(doc, y, 6.5, ctx);
        doc.setFont(FONT.body, 'bold');
        doc.setTextColor(...C.gold);
        doc.text(`${i + 1 < 10 ? '0' + (i + 1) : i + 1}`, M, y);
        doc.setFont(FONT.body, 'normal');
        doc.setTextColor(...C.ink);
        doc.text(sanitizePdfText(t.replace(/^\d+\.\s+/, '')), M + 10, y);
        y += 6.5;
      });

      // ══ PAGES SECTIONS ══
      doc.addPage();
      drawHeader(doc, refDossier, ctx.titrePage);
      y = LAYOUT.headerH + 8;

      const ensure = (h: number) => { y = ensureSpace(doc, y, h, ctx); };

      const drawMarkdownTable = (rows: string[][]) => {
        if (rows.length < 2) return;
        const [header, ...body] = rows;
        const colCount = header.length;
        const colW = CW / colCount;
        ensure(16);
        y = drawTableHeader(
          doc,
          y,
          header.map((h, i) => ({ label: h, x: M + i * colW + 2.5 })),
        );
        body.forEach((row, idx) => {
          doc.setFont(FONT.body, 'normal');
          doc.setFontSize(9);
          const wrapped = row.map(c => doc.splitTextToSize(sanitizePdfText(c), colW - 5) as string[]);
          const rh = Math.max(7.5, Math.max(...wrapped.map(w => w.length)) * 4.6 + 3);
          ensure(rh);
          // Fond alterné + filet horizontal via le design system
          doc.setFillColor(...(idx % 2 === 0 ? C.white : C.creamLight));
          doc.rect(M, y, CW, rh, 'F');
          doc.setFontSize(9);
          doc.setTextColor(...C.ink);
          wrapped.forEach((w, i) => {
            doc.setFont(FONT.body, i === 0 ? 'normal' : 'bold');
            doc.text(w, M + i * colW + 2.5, y + 5);
          });
          doc.setDrawColor(...C.border);
          doc.setLineWidth(0.18);
          doc.line(M, y + rh, M + CW, y + rh);
          y += rh;
        });
        y += 6;
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
          if (!line.trim()) { y += 3; continue; }
          const isBullet = /^[-•*]\s+/.test(line.trim());
          const txt = isBullet ? '\xB7 ' + line.trim().replace(/^[-•*]\s+/, '') : line.trim();
          doc.setFont(FONT.body, 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...C.ink);
          const wrapped = doc.splitTextToSize(sanitizePdfText(txt), CW - (isBullet ? 6 : 0)) as string[];
          for (const w of wrapped) {
            ensure(5.5);
            doc.text(w, M + (isBullet ? 6 : 0), y);
            y += 5.5;
          }
          y += 1;
        }
        flushTable();
      };

      const drawStrategieTable = () => {
        if (!strategie) return;
        ensure(20);
        doc.setFont(FONT.body, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...C.green);
        doc.text(sanitizePdfText('Indicateurs clés — synthèse patrimoniale'), M, y);
        y += 6;
        drawMarkdownTable([
          ['Indicateur', 'Valeur'],
          ['Revenus nets mensuels', `${fmtPdfEurInt(strategie.indicateurs_cles.revenus_nets_totaux_mensuels)}`],
          ["Taux d'effort actuel", `${strategie.indicateurs_cles.taux_effort_actuel_pct} %`],
          ["Capacité d'emprunt estimée", `${fmtPdfEurInt(strategie.indicateurs_cles.capacite_emprunt_estimee)}`],
          ['Mensualité max supplémentaire', `${fmtPdfEurInt(strategie.indicateurs_cles.mensualite_max_supplementaire)}`],
          ['Cash-flow mensuel libre', `${fmtPdfEurInt(strategie.indicateurs_cles.cash_flow_mensuel_libre)}`],
        ]);
        if (strategie.recommandations.length > 0) {
          ensure(16);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(10);
          doc.setTextColor(...C.green);
          doc.text('Investissements recommandés', M, y);
          y += 6;
          const recoRows: string[][] = [['Dispositif', 'Budget', 'Mensualité', 'Loyer', 'Cash-flow net', 'Rdt brut']];
          strategie.recommandations.slice(0, 3).forEach(r => {
            recoRows.push([
              r.titre || r.dispositif || '—',
              `${fmtPdfEurInt((r.budget_acquisition_total || 0))}`,
              `${fmtPdfEurInt((r.mensualite_credit_estimee || 0))}`,
              `${fmtPdfEurInt((r.loyer_brut_mensuel_estime || 0))}`,
              `${fmtPdfEurInt((r.cash_flow_net_mensuel_estime || 0))}`,
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
        const endX   = pageW - marginR - 12;
        const cy     = y + 16;
        doc.setDrawColor(...C.green);
        doc.setLineWidth(1.2);
        doc.line(startX, cy, endX, cy);
        const step = (endX - startX) / (phases.length - 1);
        phases.forEach((p, i) => {
          const cx = startX + step * i;
          doc.setFillColor(...C.green);
          doc.circle(cx, cy, 5, 'F');
          doc.setTextColor(...C.cream);
          doc.setFont(FONT.body, 'bold');
          doc.setFontSize(8.5);
          doc.text(`${i + 1}`, cx, cy + 1.2, { align: 'center' });
          doc.setTextColor(...C.textMuted);
          doc.setFontSize(8);
          doc.setFont(FONT.body, 'normal');
          doc.text(p, cx, cy + 12, { align: 'center' });
        });
        y += 34;
      };

      const drawChartImage = (img: string | null, label: string) => {
        if (!img) return;
        ensure(88);
        doc.setFont(FONT.body, 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...C.textMuted);
        doc.text(sanitizePdfText(label), M, y);
        y += 4;
        try { doc.addImage(img, 'PNG', M, y, CW, 76); } catch { /* ignore */ }
        y += 80;
      };

      sections.forEach((content, i) => {
        ensure(24);
        y = drawSectionTitle(doc, SECTION_TITLES[i].replace(/^\d+\.\s+/, ''), y);
        drawBodyText(content || '(section vide)');
        if (i === 3) { y += 3; drawStrategieTable(); }
        if (i === 4 && compareImg) { y += 3; drawChartImage(compareImg, 'Graphique comparatif des scénarios'); }
        if (i === 5 && projImg)    { y += 3; drawChartImage(projImg, 'Projection du cash-flow cumulé sur 10 ans'); }
        if (i === 7)               { y += 3; drawTimeline(); }
        y += 6;
      });

      // ══ PIEDS DE PAGE (hors couverture) ══
      const total = doc.getNumberOfPages();
      for (let p = 2; p <= total; p++) {
        doc.setPage(p);
        drawFooter(doc, p - 1, total - 1, 'HUNTERS · Rapport de conseil');
      }

      doc.save(`Rapport_Conseil_${dossier.client_name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);


      // Archivage: trace l'export dans documents_generes
      try {
        const { data: u } = await supabase.auth.getUser();
        await (supabase.from('documents_generes') as any).insert({
          dossier_id: dossier.id,
          type: 'rapport_conseil',
          numero_dossier: (dossier as any).numero_dossier || null,
          conseiller_id: u?.user?.id || null,
        });
        window.dispatchEvent(new CustomEvent('rapport-genere', { detail: { dossierId: dossier.id } }));
      } catch (archErr) {
        console.warn('Archivage rapport échoué:', archErr);
      }

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
              disabled={loading || exporting || sections.some(s => !s.trim())}
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
                  <Bar dataKey="Rendement brut (%)"      fill="#004621" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Cash-flow net (€/mois)"  fill="#C8962F" radius={[3, 3, 0, 0]} />
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
                  <Line type="monotone" dataKey="Cash-flow cumulé (€)" stroke="#004621" strokeWidth={2.5} dot={{ fill: '#C8962F', r: 5, strokeWidth: 2, stroke: '#004621' }} />
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
