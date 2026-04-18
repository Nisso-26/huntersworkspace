import AppLayout from '@/components/AppLayout';
import { CreditCard, FileText, AlertTriangle, Download, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { cn } from '@/lib/utils';
import { useFactures, useUpdateFacture, generateFacturePDF } from '@/hooks/use-factures';
import { useCommissions } from '@/hooks/use-commissions';
import { useCompanySettings } from '@/hooks/use-company-settings';
import FactureDialog from '@/components/FactureDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const statutLabels: Record<string, string> = {
  brouillon: 'Brouillon', emise: 'Émise', en_attente: 'En attente', payee: 'Payée', impayee: 'Impayée', annulee: 'Annulée',
};
const statutStyles: Record<string, string> = {
  brouillon: 'bg-muted text-muted-foreground',
  emise: 'bg-hunters-info/10 text-hunters-info',
  en_attente: 'bg-hunters-warning/10 text-hunters-warning',
  payee: 'bg-hunters-success/10 text-hunters-success',
  impayee: 'bg-destructive/10 text-destructive',
  annulee: 'bg-muted text-muted-foreground',
};
const typeLabels: Record<string, string> = {
  abonnement: 'Pack mensuel', commission: 'Commission', honoraires: 'Honoraires', avoir: 'Avoir',
};

const statutOptions = [
  { label: 'Brouillon', value: 'brouillon' },
  { label: 'Émise', value: 'emise' },
  { label: 'En attente', value: 'en_attente' },
  { label: 'Payée', value: 'payee' },
  { label: 'Impayée', value: 'impayee' },
  { label: 'Annulée', value: 'annulee' },
];

const typeOptions = [
  { label: 'Pack mensuel', value: 'abonnement' },
  { label: 'Commission', value: 'commission' },
  { label: 'Honoraires', value: 'honoraires' },
  { label: 'Avoir', value: 'avoir' },
];

export default function Facturation() {
  const { data: factures = [], isLoading } = useFactures();
  const { data: commissions = [] } = useCommissions();
  const { data: companySettings } = useCompanySettings();
  const updateMut = useUpdateFacture();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = factures.filter(f => {
    const matchSearch = (f.reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.mandataire_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = !statutFilter || f.statut === statutFilter;
    const matchType = !typeFilter || f.type === typeFilter;
    return matchSearch && matchStatut && matchType;
  });

  const totalPayees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant, 0);
  const impayes = factures.filter(f => f.statut === 'impayee').length;
  const totalFactures = factures.length;

  const commDues = commissions.filter(c => c.statut === 'due').reduce((s, c) => s + c.montant, 0);
  const commVersees = commissions.filter(c => c.statut === 'versee').reduce((s, c) => s + c.montant, 0);
  const tauxImpayes = totalFactures > 0 ? Math.round((impayes / totalFactures) * 100) : 0;

  // Monthly CA chart data (last 6 months)
  const monthlyData = (() => {
    const months: { name: string; ca: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const ca = factures
        .filter(f => f.statut === 'payee' && f.date_emission.startsWith(key))
        .reduce((s, f) => s + f.montant, 0);
      months.push({ name, ca });
    }
    return months;
  })();

  const markPaid = (id: string) => {
    updateMut.mutate({ id, statut: 'payee', date_paiement: new Date().toISOString() } as any);
  };

  const handleExport = () => {
    exportToCSV(
      ['Référence', 'Mandataire', 'Type', 'Montant HT', 'TTC', 'Date', 'Statut'],
      filtered.map(f => [f.reference || '', f.mandataire_name || '', typeLabels[f.type] || f.type, f.montant.toLocaleString('fr-FR'), (f.montant_ttc || 0).toLocaleString('fr-FR'), new Date(f.date_emission).toLocaleDateString('fr-FR'), statutLabels[f.statut]]),
      'factures_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Facturation</h1>
            <p className="text-muted-foreground mt-1">Gestion complète des factures, packs et commissions</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <FactureDialog />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total encaissé" value={`${totalPayees.toLocaleString('fr-FR')} €`} icon={CreditCard} variant="gold" />
              <StatCard label="Factures émises" value={totalFactures} icon={FileText} />
              <StatCard label="Impayés" value={`${impayes} (${tauxImpayes}%)`} icon={AlertTriangle} variant={impayes > 0 ? 'default' : 'success'} />
              <StatCard label="Commissions dues" value={`${commDues.toLocaleString('fr-FR')} €`} icon={TrendingUp} variant="info" />
            </>
          )}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border shadow-card p-5">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-4">CA mensuel encaissé</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-FR')} €`, 'CA']} />
                <Bar dataKey="ca" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border shadow-card p-5">
            <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Commissions</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-muted border">
                <p className="text-xs text-muted-foreground uppercase">Dues</p>
                <p className="text-2xl font-bold text-destructive">{commDues.toLocaleString('fr-FR')} €</p>
              </div>
              <div className="p-4 rounded-lg bg-muted border">
                <p className="text-xs text-muted-foreground uppercase">Versées</p>
                <p className="text-2xl font-bold text-primary">{commVersees.toLocaleString('fr-FR')} €</p>
              </div>
            </div>
          </div>
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher une facture..."
          filters={[
            { label: 'Tous les statuts', value: statutFilter, options: statutOptions, onChange: setStatutFilter },
            { label: 'Tous les types', value: typeFilter, options: typeOptions, onChange: setTypeFilter },
          ]}
        />

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Référence</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">Mandataire</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">Type</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">HT</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">TTC</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Date</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture</td></tr>
                  ) : (
                    filtered.map((f) => (
                      <tr key={f.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.reference || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground hidden md:table-cell">{f.mandataire_name}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{typeLabels[f.type] || f.type}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.montant.toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground hidden lg:table-cell">{(f.montant_ttc || 0).toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutStyles[f.statut] || 'bg-muted text-muted-foreground')}>
                            {statutLabels[f.statut] || f.statut}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => generateFacturePDF(f, companySettings)} title="Télécharger PDF">
                              <Download className="w-4 h-4" />
                            </Button>
                            {f.statut !== 'payee' && f.statut !== 'annulee' && (
                              <Button variant="outline" size="sm" onClick={() => markPaid(f.id)}>
                                Payée
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
