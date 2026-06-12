import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Send, FileText } from 'lucide-react';
import { useBaremesHunters, type BaremeHunters, type BaremeService } from '@/hooks/use-baremes-hunters';
import { useDevis, useSaveDevis, useUpdateDevisStatut, type DevisLigne, type DevisStatut } from '@/hooks/use-devis';
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

  const services = (dossier.services_souscrits as Record<string, boolean>) || {};

  const [prixBien, setPrixBien] = useState<number>(Number(dossier.budget) || 0);
  const [budgetTravaux, setBudgetTravaux] = useState<number>(0);
  const [budgetDeco, setBudgetDeco] = useState<number>(0);
  const [packActif, setPackActif] = useState<boolean>(dossier.type_accompagnement === 'cle_en_main');

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

  const generatePdf = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const { margin, contentW, pageW, headerH } = LAYOUT;
    const refDossier = dossier.numero_dossier || dossier.id.slice(0, 8);
    const titre = 'Devis honoraires';
    const ctxHeader = { refDossier, titre };
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    // ─── EN-TÊTE SOBRE ─────────────────────────────────────────────
    drawHeader(doc, refDossier, titre);
    let y = headerH + 10;

    // Titre principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...C.green);
    doc.text(`Devis · ${dossier.client_name}`, margin, y);
    y += 5;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 40, y);
    y += 8;

    // ─── BLOC CLIENT / CABINET (2 colonnes) ────────────────────────
    const colW = (contentW - 12) / 2;
    const blocY = y;
    // Cabinet (gauche)
    doc.setFont(T.label.font, T.label.style);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text('ÉMETTEUR', margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.green);
    doc.text(company?.raison_sociale || 'HUNTERS Immobilier', margin, y);
    y += 5;
    doc.setFont(T.body.font, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(company?.adresse_siege || '45 rue Michel Colombe, 37000 Tours', margin, y);
    y += 4;
    doc.text(company?.email_contact || 'hunters@huntersimmobilier.fr', margin, y);

    // Client (droite)
    let yr = blocY;
    const xR = margin + colW + 12;
    doc.setFont(T.label.font, T.label.style);
    doc.setFontSize(7.5);
    doc.setTextColor(...C.textMuted);
    doc.text('CLIENT', xR, yr);
    yr += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...C.green);
    doc.text(dossier.client_name, xR, yr);
    yr += 5;
    doc.setFont(T.body.font, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.textDark);
    doc.text(`Réf. dossier : ${refDossier}`, xR, yr);
    yr += 4;
    doc.text(`Date : ${dateStr}`, xR, yr);

    // Filet vertical or séparateur
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.5);
    doc.line(margin + colW + 6, blocY - 2, margin + colW + 6, blocY + 22);

    y = blocY + 28;

    // ─── TABLEAU DES PRESTATIONS ───────────────────────────────────
    y = drawSectionTitle(doc, 'Détail des prestations', y);

    const colService = margin;
    const colCalcul  = margin + 60;
    const colHT      = margin + contentW;
    const rowH = 6.5;

    // En-tête (fond blanc, texte vert)
    doc.setFont(T.tableHeader.font, T.tableHeader.style);
    doc.setFontSize(T.tableHeader.size);
    doc.setTextColor(...C.green);
    doc.text('SERVICE', colService, y + 4.2);
    doc.text('CALCUL',  colCalcul,  y + 4.2);
    doc.text('HT',      colHT,      y + 4.2, { align: 'right' });
    y += rowH;
    doc.setDrawColor(...C.green);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + contentW, y);
    y += 2;

    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);

    lignes.forEach((l, i) => {
      y = ensureSpace(doc, y, rowH + 2, ctxHeader);
      const detailLines: string[] = doc.splitTextToSize(l.detail, contentW - 80);
      const h = Math.max(rowH, detailLines.length * 4.5 + 2);

      if (i % 2 === 1) {
        doc.setFillColor(...C.ivory);
        doc.rect(margin, y, contentW, h, 'F');
      }
      doc.setFont(T.tableCell.font, 'bold');
      doc.setFontSize(T.tableCell.size);
      doc.setTextColor(...C.textDark);
      doc.text(l.label, colService, y + 4.2);

      doc.setFont(T.tableCell.font, 'normal');
      doc.setTextColor(...C.textMuted);
      doc.text(detailLines, colCalcul, y + 4.2);

      doc.setFont(T.tableCell.font, 'bold');
      doc.setTextColor(...C.textDark);
      doc.text(fmtPdfEur(l.montant_ht), colHT, y + 4.2, { align: 'right' });

      // Mention conseil — toujours afficher "(tarif plein)" (rule 7)
      if (l.service === 'conseil') {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(...C.textMuted);
        doc.text('(tarif plein — aucune remise)', colService, y + 4.2 + 4.5);
      }

      doc.line(margin, y + h, margin + contentW, y + h);
      y += h;
    });

    // Ligne remise pack (italique muted) si applicable
    if (packActif) {
      y = ensureSpace(doc, y, rowH, ctxHeader);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(T.tableCell.size);
      doc.setTextColor(...C.textMuted);
      doc.text('Remise pack clé en main −10%', colService, y + 4.2);
      doc.text(`− ${fmtPdfEur(remisePack)}`, colHT, y + 4.2, { align: 'right' });
      doc.line(margin, y + rowH, margin + contentW, y + rowH);
      y += rowH;
    }
    y += 6;

    // ─── BLOC TOTAUX (ivoire à droite) ─────────────────────────────
    y = ensureSpace(doc, y, 48, ctxHeader);
    const totW = 80;
    const totX = margin + contentW - totW;
    const totH = 26;
    drawIvoryBox(doc, y, totH);

    doc.setFont(T.body.font, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.textMuted);
    let ty = y + 6;
    doc.text('Sous-total HT', totX + 3, ty);
    doc.setTextColor(...C.textDark);
    doc.text(fmtPdfEur(sousTotal), margin + contentW - 3, ty, { align: 'right' });
    ty += 5.5;

    if (packActif) {
      doc.setTextColor(...C.textMuted);
      doc.text('Remise pack', totX + 3, ty);
      doc.text(`− ${fmtPdfEur(remisePack)}`, margin + contentW - 3, ty, { align: 'right' });
      ty += 5.5;
    }
    doc.setTextColor(...C.textMuted);
    doc.text('Total HT', totX + 3, ty);
    doc.setTextColor(...C.textDark);
    doc.text(fmtPdfEur(totalHT), margin + contentW - 3, ty, { align: 'right' });
    ty += 5.5;
    doc.setTextColor(...C.textMuted);
    doc.text('TVA 20%', totX + 3, ty);
    doc.text(fmtPdfEur(tva), margin + contentW - 3, ty, { align: 'right' });
    y += totH + 4;

    // Total TTC en grand : fond vert
    const ttcH = 14;
    doc.setFillColor(...C.green);
    doc.rect(margin, y, contentW, ttcH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...C.white);
    doc.text('TOTAL TTC', margin + 4, y + 9);
    doc.setTextColor(...C.gold);
    doc.text(fmtPdfEur(totalTTC), margin + contentW - 4, y + 9, { align: 'right' });
    y += ttcH + 6;

    // Validité
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...C.textMuted);
    doc.text('Devis valable 30 jours à compter de la date d\'émission · TVA non récupérable au taux de 20%.', margin, y);
    y += 12;

    // ─── ZONE SIGNATURE DOUBLE ─────────────────────────────────────
    y = ensureSpace(doc, y, 36, ctxHeader);
    const sigW = (contentW - 10) / 2;
    drawSignatureZone(doc, margin, y, sigW, dossier.client_name, 'Le client', 'Bon pour accord — Client');
    drawSignatureZone(doc, margin + sigW + 10, y, sigW, company?.raison_sociale || 'HUNTERS Immobilier', 'Pour HUNTERS Immobilier', 'Le mandataire');

    // ─── PIED DE PAGE ──────────────────────────────────────────────
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      drawFooter(doc, i, total);
    }

    doc.save(`devis-${refDossier}.pdf`);
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

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold">Générateur de devis</h3>
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
            <div className="flex justify-between text-[#1A4D2E]"><span>Remise pack -10%</span><span>- {fmtPdfEur(remisePack)}</span></div>
          )}
          <div className="flex justify-between"><span>Total HT</span><span>{fmtPdfEur(totalHT)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>TVA 20%</span><span>{fmtPdfEur(tva)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total TTC</span><span className="text-[#1A4D2E]">{fmtPdfEur(totalTTC)}</span></div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          <Button variant="outline" onClick={generatePdf}><Download className="w-4 h-4 mr-2" />Générer PDF</Button>
          <Button variant="outline" onClick={() => handleSave('brouillon')} disabled={saveMut.isPending}>
            <Save className="w-4 h-4 mr-2" />Enregistrer
          </Button>
          <Button onClick={() => handleSave('envoye')} disabled={saveMut.isPending} className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90">
            <Send className="w-4 h-4 mr-2" />Envoyer au client
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#F5A800]" />
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
