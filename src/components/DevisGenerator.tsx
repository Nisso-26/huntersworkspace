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

const GREEN: [number, number, number] = [26, 77, 46];
const GOLD: [number, number, number] = [245, 168, 0];

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
      const remise = packActif ? tarifConseil * 0.15 : 0;
      const m = tarifConseil - remise;
      out.push({
        service: 'conseil',
        label: `Conseil patrimonial (${niveau})`,
        base: 0,
        detail: packActif ? `${fmtPdfEur(tarifConseil)} − 15% pack` : `Forfait ${fmtPdfEur(tarifConseil)}`,
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
    const w = doc.internal.pageSize.getWidth();
    // header
    doc.setFillColor(...GREEN); doc.rect(0, 0, w, 22, 'F');
    doc.setFillColor(...GOLD); doc.rect(0, 22, w, 1.2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('HUNTERS IMMOBILIER', 12, 13);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Devis honoraires', w - 12, 13, { align: 'right' });

    let y = 34;
    doc.setTextColor(44, 44, 44); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text(`DEVIS — ${dossier.client_name}`, 12, y); y += 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(`Réf. dossier : ${dossier.numero_dossier || dossier.id.slice(0, 8)}`, 12, y); y += 5;
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 12, y); y += 5;
    if (company?.raison_sociale) { doc.text(`Émetteur : ${company.raison_sociale}`, 12, y); y += 5; }
    y += 4;

    // table header
    doc.setFillColor(...GREEN); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.rect(12, y, w - 24, 7, 'F');
    doc.text('Service', 14, y + 5); doc.text('Détail', 70, y + 5); doc.text('Montant HT', w - 14, y + 5, { align: 'right' });
    y += 11;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(44, 44, 44);

    lignes.forEach(l => {
      doc.text(l.label, 14, y);
      const detailLines = doc.splitTextToSize(l.detail, 90);
      doc.text(detailLines, 70, y);
      doc.text(fmtPdfEur(l.montant_ht), w - 14, y, { align: 'right' });
      y += Math.max(6, detailLines.length * 5);
    });

    y += 4; doc.setDrawColor(...GOLD); doc.line(12, y, w - 12, y); y += 6;
    doc.text(`Sous-total HT`, w - 60, y); doc.text(fmtPdfEur(sousTotal), w - 14, y, { align: 'right' }); y += 6;
    if (packActif) { doc.text(`Remise pack -10%`, w - 60, y); doc.text(`- ${fmtPdfEur(remisePack)}`, w - 14, y, { align: 'right' }); y += 6; }
    doc.text(`Total HT`, w - 60, y); doc.text(fmtPdfEur(totalHT), w - 14, y, { align: 'right' }); y += 6;
    doc.text(`TVA 20%`, w - 60, y); doc.text(fmtPdfEur(tva), w - 14, y, { align: 'right' }); y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(`Total TTC`, w - 60, y); doc.text(fmtPdfEur(totalTTC), w - 14, y, { align: 'right' }); y += 12;

    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text('Devis valable 30 jours — TVA 20%', 12, 285);

    doc.save(`devis-${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`);
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
