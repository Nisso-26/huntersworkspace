import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { fmtPdfEur, fmtPdfEurInt } from '@/lib/pdf-utils';

interface Props {
  prixRevient: number;
  loyerMensuel: number;
  reference: string;
  adresse: string;
  dossierClient: string;
}

function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const r = rate / 12;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

export default function SimulateurTab({ prixRevient, loyerMensuel, reference, adresse, dossierClient }: Props) {
  const [apport, setApport] = useState(0);
  const [taux, setTaux] = useState(3.5);
  const [duree, setDuree] = useState(20);
  const [charges, setCharges] = useState(200);
  const [vacance, setVacance] = useState(5);
  const [fiscalite, setFiscalite] = useState(0);
  const [prixRevente, setPrixRevente] = useState(0);
  const [revenusRef, setRevenusRef] = useState(3000);

  const montantEmprunte = useMemo(() => Math.max(0, prixRevient - apport), [prixRevient, apport]);
  const mensualite = useMemo(() => montantEmprunte > 0 ? pmt(taux / 100, duree * 12, montantEmprunte) : 0, [montantEmprunte, taux, duree]);
  const tauxEndettement = useMemo(() => revenusRef > 0 ? (mensualite / revenusRef) * 100 : 0, [mensualite, revenusRef]);

  const loyerEffectif = useMemo(() => loyerMensuel * (1 - vacance / 100), [loyerMensuel, vacance]);
  const cashFlowMensuel = useMemo(() => loyerEffectif - mensualite - charges - fiscalite, [loyerEffectif, mensualite, charges, fiscalite]);
  const cashFlowAnnuel = cashFlowMensuel * 12;
  const rentaBrute = useMemo(() => prixRevient > 0 ? ((loyerMensuel * 12) / prixRevient) * 100 : 0, [loyerMensuel, prixRevient]);
  const rentaNette = useMemo(() => prixRevient > 0 ? ((loyerEffectif - charges - fiscalite) * 12 / prixRevient) * 100 : 0, [loyerEffectif, charges, fiscalite, prixRevient]);

  // TRI estimation (simplified IRR over 10 years)
  const tri = useMemo(() => {
    if (prixRevient <= 0 || apport <= 0) return 0;
    const reventeVal = prixRevente || prixRevient;
    const capitalRembourse10 = mensualite * 120;
    const totalCashFlow = cashFlowAnnuel * 10;
    const gainTotal = totalCashFlow + reventeVal - prixRevient;
    const triEstime = (Math.pow((apport + gainTotal) / apport, 1 / 10) - 1) * 100;
    return isFinite(triEstime) ? triEstime : 0;
  }, [apport, prixRevient, prixRevente, cashFlowAnnuel, mensualite]);

  const pvBrute = prixRevente > 0 ? prixRevente - prixRevient : 0;
  const pvNette = pvBrute > 0 ? pvBrute * 0.64 : pvBrute; // ~36% flat tax estimate
  const effortEpargne = cashFlowMensuel < 0 ? Math.abs(cashFlowMensuel) : 0;

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Header
      doc.setFillColor(26, 77, 46);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('HUNTERS', 15, 18);
      doc.setFontSize(10);
      doc.text('Rapport de simulation', 15, 28);

      // Gold line
      doc.setDrawColor(245, 168, 0);
      doc.setLineWidth(1.5);
      doc.line(0, 35, 210, 35);

      let y = 50;
      doc.setTextColor(26, 77, 46);
      doc.setFontSize(14);
      doc.text(`Bien : ${reference}`, 15, y); y += 8;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      if (dossierClient) { doc.text(`Client : ${dossierClient}`, 15, y); y += 6; }
      doc.text(`Adresse : ${adresse}`, 15, y); y += 10;

      const lines = [
        ['Prix de revient', fmtPdfEurInt(prixRevient)],
        ['Apport personnel', fmtPdfEurInt(apport)],
        ['Montant emprunté', fmtPdfEurInt(montantEmprunte)],
        ['Taux / Durée', `${taux}% / ${duree} ans`],
        ['Mensualité crédit', fmtPdfEur(mensualite)],
        ['Taux d\'endettement', `${tauxEndettement.toFixed(1)}%`],
        ['', ''],
        ['Loyer mensuel HC', fmtPdfEurInt(loyerMensuel)],
        ['Charges mensuelles', `${charges} €`],
        ['Vacance locative', `${vacance}%`],
        ['Fiscalité mensuelle', `${fiscalite} €`],
        ['', ''],
        ['Cash flow mensuel', fmtPdfEur(cashFlowMensuel)],
        ['Cash flow annuel', fmtPdfEur(cashFlowAnnuel)],
        ['Rentabilité brute', `${rentaBrute.toFixed(2)}%`],
        ['Rentabilité nette', `${rentaNette.toFixed(2)}%`],
        ['TRI estimé (10 ans)', `${tri.toFixed(2)}%`],
        ['Effort d\'épargne', effortEpargne > 0 ? `${fmtPdfEur(effortEpargne)}/mois` : 'Aucun'],
      ];

      if (prixRevente > 0) {
        lines.push(['', ''], ['Prix de revente', fmtPdfEurInt(prixRevente)]);
        lines.push(['Plus-value brute', fmtPdfEurInt(pvBrute)]);
        lines.push(['Plus-value nette estimée', fmtPdfEur(pvNette)]);
      }

      for (const [label, val] of lines) {
        if (!label) { y += 4; continue; }
        doc.setTextColor(80, 80, 80);
        doc.text(label, 15, y);
        doc.setTextColor(26, 77, 46);
        doc.text(val, 120, y);
        y += 7;
        if (y > 270) { doc.addPage(); y = 20; }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Document non contractuel - HUNTERS © ' + new Date().getFullYear(), 15, 285);

      doc.save(`simulation_${reference}.pdf`);
      toast.success('Rapport PDF généré');
    } catch (e) {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const setNum = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(parseFloat(e.target.value) || 0);

  return (
    <div className="space-y-6">
      {/* Financement */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">Financement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Apport personnel (€)</Label>
            <Input type="number" value={apport || ''} onChange={setNum(setApport)} />
          </div>
          <div>
            <Label>Montant emprunté (€)</Label>
            <Input value={montantEmprunte.toLocaleString('fr-FR')} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Taux d'intérêt (%)</Label>
            <Input type="number" step="0.1" value={taux || ''} onChange={setNum(setTaux)} />
          </div>
          <div>
            <Label>Durée (années)</Label>
            <Input type="number" value={duree || ''} onChange={setNum(setDuree)} />
          </div>
          <div>
            <Label>Mensualité calculée (€)</Label>
            <Input value={mensualite.toFixed(0)} disabled className="bg-muted font-bold" />
          </div>
          <div>
            <Label>Revenus mensuels réf. (€)</Label>
            <Input type="number" value={revenusRef || ''} onChange={setNum(setRevenusRef)} />
          </div>
        </div>
        <div className="mt-2">
          <span className={`text-sm font-semibold ${tauxEndettement > 35 ? 'text-destructive' : 'text-primary'}`}>
            Taux d'endettement HCSF : {tauxEndettement.toFixed(1)}% {tauxEndettement > 35 ? '⚠️ > 35%' : '✅'}
          </span>
        </div>
      </div>

      {/* Exploitation */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">Exploitation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Loyer mensuel HC (€)</Label>
            <Input value={loyerMensuel} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Charges mensuelles (€)</Label>
            <Input type="number" value={charges || ''} onChange={setNum(setCharges)} />
          </div>
          <div>
            <Label>Vacance locative (%)</Label>
            <Input type="number" value={vacance || ''} onChange={setNum(setVacance)} />
          </div>
          <div>
            <Label>Fiscalité mensuelle (€)</Label>
            <Input type="number" value={fiscalite || ''} onChange={setNum(setFiscalite)} />
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-sm bg-muted border border-border">
        {[
          { label: 'Cash flow mensuel', value: `${cashFlowMensuel.toFixed(0)} €`, accent: cashFlowMensuel >= 0 },
          { label: 'Cash flow annuel', value: `${cashFlowAnnuel.toFixed(0)} €`, accent: cashFlowAnnuel >= 0 },
          { label: 'Rentabilité brute', value: `${rentaBrute.toFixed(2)}%`, accent: true },
          { label: 'Rentabilité nette', value: `${rentaNette.toFixed(2)}%`, accent: true },
          { label: 'TRI estimé (10 ans)', value: `${tri.toFixed(2)}%`, accent: tri > 0 },
          { label: 'Effort d\'épargne', value: effortEpargne > 0 ? `${effortEpargne.toFixed(0)} €/mois` : 'Aucun', accent: effortEpargne === 0 },
        ].map(r => (
          <div key={r.label}>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{r.label}</p>
            <p className={`text-lg font-bold ${r.accent ? 'text-primary' : 'text-destructive'}`}>{r.value}</p>
          </div>
        ))}
      </div>

      {/* Simulation revente */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-primary mb-3">Simulation revente</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Prix de revente estimé (€)</Label>
            <Input type="number" value={prixRevente || ''} onChange={setNum(setPrixRevente)} />
          </div>
          <div>
            <Label>Plus-value brute</Label>
            <Input value={`${pvBrute.toLocaleString('fr-FR')} €`} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Plus-value nette estimée</Label>
            <Input value={`${pvNette.toFixed(0)} €`} disabled className="bg-muted" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleExportPDF} className="gap-2 bg-primary hover:bg-primary/90">
          <FileDown className="w-4 h-4" /> Générer rapport client (PDF)
        </Button>
      </div>
    </div>
  );
}
