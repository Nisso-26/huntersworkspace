import HelpTip from '@/components/HelpTip';
import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Send, FileText, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBaremesHunters, type BaremeHunters, type BaremeService } from '@/hooks/use-baremes-hunters';
import {
  useDevis, useSaveDevis, useUpdateDevisStatut, useEnvoyerDevis,
  DEVIS_EMAIL_LABELS,
  type DevisLigne, type DevisStatut, type DevisEmailStatut,
} from '@/hooks/use-devis';

import { useCompanySettings } from '@/hooks/use-company-settings';
import { fmtPdfEur } from '@/lib/pdf-utils';
import type { Dossier } from '@/hooks/use-dossiers';
import {
  C, T, LAYOUT,
  drawHeader, drawFooter, drawSectionTitle,
  drawIvoryBox, ensureSpace, drawSignatureZone,
} from '@/lib/pdf-design-system';


function pickTranche(rows: BaremeHunters[], service: BaremeService, base: number) {
  return rows.find(r =>
    r.service === service &&
    base >= Number(r.tranche_min) &&
    (r.tranche_max === null || base <= Number(r.tranche_max))
  );
}

function computeMontant(t: BaremeHunters | undefined, base: number) {
  if (!t) return { montant: 0, detail: 'Tranche non définie' };
  const fixe = Number(t.valeur_fixe) || 0;
  if (t.type === 'forfait') {
    const m = Number(t.valeur) || fixe || 0;
    return { montant: m, detail: `Forfait ${fmtPdfEur(m)}` };
  }
  const pct = Number(t.valeur) || 0;
  const variable = (base * pct) / 100;
  const m = fixe + variable;
  return {
    montant: m,
    detail: fixe > 0
      ? `${fmtPdfEur(fixe)} + ${pct}% × ${fmtPdfEur(base)} = ${fmtPdfEur(m)}`
      : `${pct}% × ${fmtPdfEur(base)} = ${fmtPdfEur(m)}`,
  };
}

const STATUT_VARIANT: Record<DevisStatut, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  brouillon: 'outline',
  envoye: 'secondary',
  accepte: 'default',
  refuse: 'destructive',
};
const STATUT_LABEL: Record<DevisStatut, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
};

export default function DevisGenerator({ dossier }: { dossier: Dossier }) {
  const { data: baremes = [] } = useBaremesHunters();
  const { data: company } = useCompanySettings();
  const { data: historique = [] } = useDevis(dossier.id);
  const saveMut = useSaveDevis();
  const statutMut = useUpdateDevisStatut();
  const envoyerMut = useEnvoyerDevis();

  const services = (dossier.services_souscrits as Record<string, boolean>) || {};

  const [prixBien, setPrixBien] = useState<number>(Number(dossier.budget) || 0);
  const [budgetTravaux, setBudgetTravaux] = useState<number>(0);
  const [budgetDeco, setBudgetDeco] = useState<number>(0);
  const [packActif, setPackActif] = useState<boolean>(dossier.type_accompagnement === 'cle_en_main');
  const [emailClient, setEmailClient] = useState<string>(((dossier as any).email as string) || '');

  const tarifConseil = Number((dossier as any).tarif_conseil_ht) || 1500;
  const niveau = (dossier as any).niveau_qualification || 'Standard';


  const lignes: DevisLigne[] = useMemo(() => {
    const out: DevisLigne[] = [];
    if (services.conseil !== false) {
      const m = tarifConseil; // jamais remisé
      out.push({
        service: 'conseil',
        label: `Conseil patrimonial (${niveau})`,
        base: 0,
        detail: `Forfait ${fmtPdfEur(tarifConseil)} — tarif plein`,
        montant_ht: m,
      });
    }
    if (services.chasse) {
      const t = pickTranche(baremes, 'chasse', prixBien);
      const { montant, detail } = computeMontant(t, prixBien);
      out.push({ service: 'chasse', label: 'Chasse immobilière', base: prixBien, detail, montant_ht: montant });
    }
    if (services.amo) {
      const t = pickTranche(baremes, 'amo', budgetTravaux);
      const { montant, detail } = computeMontant(t, budgetTravaux);
      out.push({ service: 'amo', label: 'AMO travaux', base: budgetTravaux, detail, montant_ht: montant });
    }
    if (services.deco) {
      const t = pickTranche(baremes, 'deco', budgetDeco);
      const { montant, detail } = computeMontant(t, budgetDeco);
      out.push({ service: 'deco', label: 'Décoration & ameublement', base: budgetDeco, detail, montant_ht: montant });
    }
    return out;
  }, [baremes, services, packActif, tarifConseil, niveau, prixBien, budgetTravaux, budgetDeco]);

  const sousTotal = lignes.reduce((s, l) => s + l.montant_ht, 0);
  const remisePack = packActif ? sousTotal * 0.1 : 0;
  const totalHT = sousTotal - remisePack;
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;

  const buildPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const {
      C, FONT, LAYOUT,
      loadLogo, drawHeader, drawFooter,
      drawIvoryBox, sanitizePdfText,
    } = await import('@/lib/pdf-design-system');

    const logo = await loadLogo();
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const { marginL, marginR, contentW, pageW, headerH, footerY } = LAYOUT;
    const today = new Date().toLocaleDateString('fr-FR',
      { day: '2-digit', month: 'long', year: 'numeric' });
    const ref = (dossier as any).numero_dossier || null;

    // ── En-tête sobre — pas de couverture pour un devis ──────────────────────
    drawHeader(doc, ref, 'Devis');
    let y = headerH + 10;

    // ── Bloc client / cabinet en 2 colonnes ──────────────────────────────────
    const halfW = contentW / 2 - 4;

    // Colonne gauche — client
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text('Prepare pour', marginL, y);
    doc.setFont(FONT.heading, 'normal');
    doc.setFontSize(12);
    doc.setTextColor(...C.ink);
    doc.text(sanitizePdfText(dossier.client_name || ''), marginL, y + 7);

    // Filet vertical or entre les 2 colonnes
    doc.setFillColor(...C.gold);
    doc.rect(marginL + halfW + 2, y - 2, 0.8, 20, 'F');

    // Colonne droite — cabinet
    const rx = marginL + halfW + 8;
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text('Emetteur', rx, y);
    doc.setFont(FONT.heading, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...C.ink);
    doc.text('HUNTERS Immobilier', rx, y + 7);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text(today, rx, y + 12);
    if (ref) doc.text(`Ref. ${ref}`, rx, y + 17);

    y += 26;

    // ── Titre Devis ───────────────────────────────────────────────────────────
    doc.setFont(FONT.heading, 'normal');
    doc.setFontSize(16);
    doc.setTextColor(...C.green);
    doc.text('DEVIS', marginL, y);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.35);
    doc.line(marginL, y + 3, marginL + 40, y + 3);
    y += 10;

    // ── Encadré politique prix — non masquable ────────────────────────────────
    const ivoireY = y;
    drawIvoryBox(doc, y, 9);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.green);
    doc.text(
      'Conseil patrimonial : toujours au tarif plein — aucune remise autorisee, y compris en pack.',
      marginL + 6, y + 6,
    );
    y = ivoireY + 13;

    // ── Tableau des prestations ───────────────────────────────────────────────
    const rowH = 8;
    const cols = {
      service: marginL,
      detail:  marginL + 55,
      ht:      pageW - marginR,
    };

    // En-tête — vert HUNTERS
    doc.setFillColor(...C.green);
    doc.rect(marginL, y, contentW, rowH, 'F');
    doc.setFont(FONT.body, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.white);
    doc.text('Service', cols.service + 2, y + 5.5);
    doc.text('Detail', cols.detail, y + 5.5);
    doc.text('Montant HT', cols.ht, y + 5.5, { align: 'right' });
    y += rowH;

    // Lignes prestations
    lignes.forEach((ligne, i) => {
      doc.setFillColor(...(i % 2 === 0 ? C.cream : C.white));
      doc.rect(marginL, y, contentW, rowH, 'F');

      doc.setFont(FONT.body, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...C.ink);
      doc.text(sanitizePdfText(ligne.label), cols.service + 2, y + 5.5);

      doc.setFont(FONT.body, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.textMuted);
      const detailLines = doc.splitTextToSize(
        sanitizePdfText(ligne.detail), cols.ht - cols.detail - 35
      );
      doc.text(detailLines[0] || '', cols.detail, y + 5.5);

      doc.setFont(FONT.body, 'bold');
      doc.setFontSize(9);
      // Conseil en encre — pas en vert pour distinguer du tarif plein
      doc.setTextColor(
        ...(ligne.service === 'conseil' ? C.ink : C.green)
      );
      doc.text(fmtPdfEur(ligne.montant_ht), cols.ht, y + 5.5, { align: 'right' });

      // Mention tarif plein sous la ligne conseil
      if (ligne.service === 'conseil') {
        doc.setFont(FONT.body, 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...C.textMuted);
        doc.text('tarif plein', cols.ht, y + rowH - 1, { align: 'right' });
      }

      y += rowH;
    });

    // Filet bas tableau
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;

    // ── Récapitulatif — bloc à droite ─────────────────────────────────────────
    const recapX = marginL + contentW / 2;
    const recapW = contentW / 2;

    const addRecapLine = (
      label: string,
      value: string,
      bold = false,
      highlight = false,
    ) => {
      if (highlight) {
        doc.setFillColor(...C.green);
        doc.rect(recapX, y - 5, recapW, 9, 'F');
        doc.setFont(FONT.heading, 'normal');
        doc.setFontSize(13);
        doc.setTextColor(...C.cream);
        doc.text(label, recapX + 3, y + 1);
        doc.text(value, recapX + recapW - 2, y + 1, { align: 'right' });
        y += 11;
      } else {
        doc.setFont(FONT.body, bold ? 'bold' : 'normal');
        doc.setFontSize(9);
        doc.setTextColor(bold ? C.ink[0] : C.textMuted[0],
                         bold ? C.ink[1] : C.textMuted[1],
                         bold ? C.ink[2] : C.textMuted[2]);
        doc.text(label, recapX + 3, y);
        doc.text(value, recapX + recapW - 2, y, { align: 'right' });
        y += 6;
      }
    };

    addRecapLine('Sous-total HT', fmtPdfEur(sousTotal));

    if (packActif && remisePack > 0) {
      addRecapLine(
        `Remise pack 10% (chasse + AMO + deco)`,
        `- ${fmtPdfEur(remisePack)}`,
      );
    }

    addRecapLine('Total HT', fmtPdfEur(totalHT), true);
    addRecapLine(`TVA ${company?.tva_taux_defaut ?? 20}%`, fmtPdfEur(totalHT * (company?.tva_taux_defaut ?? 20) / 100));
    addRecapLine('TOTAL TTC', fmtPdfEur(totalTTC), false, true); // fond vert highlight

    y += 8;

    // ── Validité ──────────────────────────────────────────────────────────────
    doc.setFont(FONT.body, 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text('Devis valable 30 jours — TVA 20% — Honoraires HT', marginL, y);
    y += 8;

    // ── Zone de signature double ───────────────────────────────────────────────
    const { drawSignatureZone } = await import('@/lib/pdf-design-system');
    const sigW = contentW / 2 - 6;
    drawSignatureZone(
      doc, marginL, y, sigW,
      sanitizePdfText(dossier.client_name || ''), 'Client',
      'Signature client',
    );
    drawSignatureZone(
      doc, marginL + contentW / 2 + 6, y, sigW,
      'Anais SAIZONOU', 'Conseiller HUNTERS Immobilier',
      'Pour HUNTERS Immobilier',
    );

    // ── Pied de page ─────────────────────────────────────────────────────────
    drawFooter(doc, 1, 1);

    const fileName = `Devis_${sanitizePdfText(dossier.client_name || 'client').replace(/\s+/g, '_')}_${ref || 'HUNTERS'}.pdf`;
    return { doc, fileName };
  };

  const generatePdf = async () => {
    const { doc, fileName } = await buildPdf();
    doc.save(fileName);
  };


  const handleSave = async (statut: DevisStatut = 'brouillon') => {
    await saveMut.mutateAsync({
      dossier_id: dossier.id,
      montant_ht: totalHT,
      remise_pack: remisePack,
      tva_taux: 20,
      montant_ttc: totalTTC,
      statut,
      pack_actif: packActif,
      contenu: { lignes } as any,
    });
  };

  const handleSend = async () => {
    const { doc, fileName } = await buildPdf();
    const bytes = new Uint8Array(doc.output('arraybuffer') as ArrayBuffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const pdfBase64 = btoa(bin);

    envoyerMut.mutate({
      devis: {
        dossier_id: dossier.id,
        montant_ht: totalHT,
        remise_pack: remisePack,
        tva_taux: 20,
        montant_ttc: totalTTC,
        pack_actif: packActif,
        contenu: { lignes } as any,
      },
      destinataire: emailClient,
      client_name: dossier.client_name || 'Madame, Monsieur',
      numero_dossier: (dossier as any).numero_dossier || null,
      pdf_base64: pdfBase64,
      pdf_filename: fileName,
    });
  };


  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold flex items-center gap-2">
              Générateur de devis
              <HelpTip
                title="Générateur de devis"
                intro="Il calcule tout seul le prix de la prestation à partir de la grille tarifaire Hunters. Vous n'avez rien à calculer à la main."
                points={[
                  { label: 'Pack clé en main', text: "activez-le si le client confie tout à Hunters (recherche, travaux, mise en location). Le tarif groupé s'applique alors." },
                  { label: 'Le conseil patrimonial', text: "il est toujours facturé au tarif plein : aucune remise ne s'y applique, même dans un pack." },
                  { label: 'Ce que vous faites ensuite', text: "vous générez le PDF, vous l'envoyez au client, puis vous le faites signer depuis la section Signature." },
                ]}
                note="Un devis n'engage le client qu'une fois signé. Vous pouvez en générer plusieurs versions."
              />
            </h3>
            <p className="text-xs text-muted-foreground">Calcul automatique selon la grille tarifaire Hunters.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pack" className="text-sm">Pack clé en main</Label>
            <Switch id="pack" checked={packActif} onCheckedChange={setPackActif} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Prix du bien (€)</Label>
            <Input type="number" value={prixBien} onChange={e => setPrixBien(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Budget travaux (€)</Label>
            <Input type="number" value={budgetTravaux} onChange={e => setBudgetTravaux(Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Budget déco (€)</Label>
            <Input type="number" value={budgetDeco} onChange={e => setBudgetDeco(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="border rounded-md divide-y">
          {lignes.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Aucun service sélectionné.</div>
          )}
          {lignes.map(l => (
            <div key={l.service} className="p-3 grid grid-cols-12 gap-2 items-center text-sm">
              <div className="col-span-4 font-medium">{l.label}</div>
              <div className="col-span-6 text-xs text-muted-foreground">{l.detail}</div>
              <div className="col-span-2 text-right font-semibold">{fmtPdfEur(l.montant_ht)}</div>
            </div>
          ))}
        </div>

        <div className="rounded-md bg-muted/40 p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span>Sous-total HT</span><span>{fmtPdfEur(sousTotal)}</span></div>
          {packActif && (
            <div className="flex justify-between text-[#004621]"><span>Remise pack -10%</span><span>- {fmtPdfEur(remisePack)}</span></div>
          )}
          <div className="flex justify-between"><span>Total HT</span><span>{fmtPdfEur(totalHT)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>TVA 20%</span><span>{fmtPdfEur(tva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total TTC</span><span className="text-[#004621]">{fmtPdfEur(totalTTC)}</span></div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs">Email du client (destinataire du devis)</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              type="email"
              value={emailClient}
              onChange={e => setEmailClient(e.target.value)}
              placeholder="client@email.com"
              className="flex-1 min-w-[220px]"
            />
            <Button variant="outline" onClick={generatePdf}><Download className="w-4 h-4 mr-2" />Générer PDF</Button>
            <Button variant="outline" onClick={() => handleSave('brouillon')} disabled={saveMut.isPending}>
              <Save className="w-4 h-4 mr-2" />Enregistrer
            </Button>
            <Button
              onClick={handleSend}
              disabled={envoyerMut.isPending || lignes.length === 0 || !emailClient.trim()}
              className="bg-[#004621] hover:bg-[#004621]/90"
            >
              {envoyerMut.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours…</>
                : <><Send className="w-4 h-4 mr-2" />Envoyer au client</>}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Le client reçoit un e-mail avec le PDF du devis en pièce jointe. Le statut réel de l'envoi
            s'affiche dans l'historique ci-dessous.
          </p>
        </div>

      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#C8962F]" />
          <h3 className="font-heading font-semibold">Historique des devis</h3>
        </div>
        {historique.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun devis enregistré.</p>
        ) : (
          <div className="border rounded-md divide-y">
            {historique.map(d => (
              <div key={d.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{d.numero}</span>
                  <span className="text-xs text-muted-foreground">{new Date(d.date_emission).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="text-sm font-semibold">{fmtPdfEur(Number(d.montant_ttc))} TTC</div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUT_VARIANT[d.statut]}>{STATUT_LABEL[d.statut]}</Badge>
                  {d.statut === 'envoye' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => statutMut.mutate({ id: d.id, dossier_id: d.dossier_id, statut: 'accepte' })}>Accepté</Button>
                      <Button size="sm" variant="outline" onClick={() => statutMut.mutate({ id: d.id, dossier_id: d.dossier_id, statut: 'refuse' })}>Refusé</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
