import AppLayout from '@/components/AppLayout';
import { CreditCard, FileText, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { cn } from '@/lib/utils';
import { useFactures, useUpdateFacture } from '@/hooks/use-factures';
import FactureDialog from '@/components/FactureDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const statutLabels: Record<string, string> = {
  en_attente: 'En attente', payee: 'Payée', impayee: 'Impayée', annulee: 'Annulée',
};
const statutStyles: Record<string, string> = {
  en_attente: 'bg-hunters-warning/10 text-hunters-warning',
  payee: 'bg-hunters-success/10 text-hunters-success',
  impayee: 'bg-destructive/10 text-destructive',
  annulee: 'bg-muted text-muted-foreground',
};
const typeLabels: Record<string, string> = {
  abonnement: 'Abonnement', commission: 'Commission', honoraires: 'Honoraires',
};

const statutOptions = [
  { label: 'En attente', value: 'en_attente' },
  { label: 'Payée', value: 'payee' },
  { label: 'Impayée', value: 'impayee' },
  { label: 'Annulée', value: 'annulee' },
];

const typeOptions = [
  { label: 'Abonnement', value: 'abonnement' },
  { label: 'Commission', value: 'commission' },
  { label: 'Honoraires', value: 'honoraires' },
];

export default function Facturation() {
  const { data: factures = [], isLoading } = useFactures();
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

  const markPaid = (id: string) => {
    updateMut.mutate({ id, statut: 'payee', date_paiement: new Date().toISOString() } as any);
  };

  const handleExport = () => {
    exportToCSV(
      ['Référence', 'Mandataire', 'Type', 'Montant', 'Date', 'Statut'],
      filtered.map(f => [f.reference || '', f.mandataire_name || '', typeLabels[f.type] || f.type, f.montant.toLocaleString('fr-FR'), new Date(f.date_emission).toLocaleDateString('fr-FR'), statutLabels[f.statut]]),
      'factures_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Facturation</h1>
            <p className="text-muted-foreground mt-1">Abonnements et commissions du réseau</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <FactureDialog />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total encaissé" value={`${totalPayees.toLocaleString('fr-FR')} €`} icon={CreditCard} variant="gold" />
              <StatCard label="Factures émises" value={factures.length} icon={FileText} />
              <StatCard label="Impayés" value={impayes} icon={AlertTriangle} variant={impayes > 0 ? 'default' : 'success'} />
            </>
          )}
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
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Montant</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Date</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture</td></tr>
                  ) : (
                    filtered.map((f) => (
                      <tr key={f.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.reference || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground hidden md:table-cell">{f.mandataire_name}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{typeLabels[f.type] || f.type}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.montant.toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutStyles[f.statut])}>
                            {statutLabels[f.statut]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {f.statut !== 'payee' && f.statut !== 'annulee' && (
                            <Button variant="outline" size="sm" onClick={() => markPaid(f.id)}>
                              Marquer payée
                            </Button>
                          )}
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
