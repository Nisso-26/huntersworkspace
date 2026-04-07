import AppLayout from '@/components/AppLayout';
import { useFactures } from '@/hooks/use-factures';
import { useMandataires } from '@/hooks/use-mandataires';
import { exportToCSV } from '@/components/ExportButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

const typeLabels: Record<string, string> = {
  honoraires: 'Honoraires', abonnement: 'Abonnement mensuel', commission: 'Commission mandataire', avoir: 'Avoir / Remboursement',
};
const statutLabels: Record<string, string> = {
  payee: 'Encaissé', en_attente: 'En attente', impayee: 'Impayé', emise: 'Émise', brouillon: 'Brouillon', annulee: 'Annulée',
};

export default function ExportComptable() {
  const { data: factures = [] } = useFactures();
  const { data: mandataires = [] } = useMandataires();
  const now = new Date();
  const [dateDebut, setDateDebut] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [dateFin, setDateFin] = useState(now.toISOString().slice(0, 10));
  const [mandataireFilter, setMandataireFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = factures.filter(f => {
    const d = f.date_emission.slice(0, 10);
    const matchDate = d >= dateDebut && d <= dateFin;
    const matchMand = !mandataireFilter || f.mandataire_id === mandataireFilter;
    const matchType = !typeFilter || f.type === typeFilter;
    return matchDate && matchMand && matchType;
  });

  const totalHT = filtered.reduce((s, f) => s + f.montant, 0);
  const totalTVA = filtered.reduce((s, f) => s + (f.montant * (f.tva_taux || 20) / 100), 0);
  const totalTTC = filtered.reduce((s, f) => s + (f.montant_ttc || f.montant * 1.2), 0);

  const handleExportCSV = () => {
    exportToCSV(
      ['Date', 'Type opération', 'Référence', 'Client', 'Mandataire', 'Montant HT', 'TVA (%)', 'Montant TVA', 'Montant TTC', 'Statut paiement'],
      filtered.map(f => [
        new Date(f.date_emission).toLocaleDateString('fr-FR'),
        typeLabels[f.type] || f.type,
        f.reference || '',
        f.dossier_client_name || f.client_name || '',
        f.mandataire_name || '',
        f.montant.toFixed(2),
        String(f.tva_taux || 20),
        (f.montant * (f.tva_taux || 20) / 100).toFixed(2),
        (f.montant_ttc || f.montant * 1.2).toFixed(2),
        statutLabels[f.statut] || f.statut,
      ]),
      `export_comptable_${dateDebut}_${dateFin}`
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Export Comptable</h1>
          <p className="text-muted-foreground mt-1">Export mensuel pour l'expert-comptable — format compatible Cegid / Sage / EBP</p>
        </div>

        <div className="bg-card rounded-xl border shadow-card p-6 space-y-4">
          <h2 className="font-heading font-semibold text-foreground">Filtres</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mandataire</Label>
              <Select value={mandataireFilter} onValueChange={setMandataireFilter}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous</SelectItem>
                  {mandataires.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="Tous" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-foreground">Aperçu — {filtered.length} écritures</h2>
              <div className="flex gap-6 mt-2 text-sm">
                <span className="text-muted-foreground">HT: <strong className="text-foreground">{totalHT.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></span>
                <span className="text-muted-foreground">TVA: <strong className="text-foreground">{totalTVA.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></span>
                <span className="text-muted-foreground">TTC: <strong className="text-foreground">{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></span>
              </div>
            </div>
            <Button onClick={handleExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Exporter CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Référence</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">Client</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Mandataire</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">HT</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">TTC</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Aucune écriture sur cette période</td></tr>
                ) : filtered.map(f => (
                  <tr key={f.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-2">{typeLabels[f.type] || f.type}</td>
                    <td className="px-4 py-2 font-medium">{f.reference || '—'}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{f.dossier_client_name || f.client_name || '—'}</td>
                    <td className="px-4 py-2 hidden lg:table-cell">{f.mandataire_name}</td>
                    <td className="px-4 py-2 text-right font-medium">{f.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                    <td className="px-4 py-2 text-right hidden sm:table-cell">{(f.montant_ttc || f.montant * 1.2).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                    <td className="px-4 py-2">{statutLabels[f.statut] || f.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
