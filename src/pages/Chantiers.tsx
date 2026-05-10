import AppLayout from '@/components/AppLayout';
import { useChantiers } from '@/hooks/use-chantiers';
import { useAuth } from '@/contexts/AuthContext';
import ChantierDialog from '@/components/ChantierDialog';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const statutLabels: Record<string, string> = {
  a_planifier: 'À planifier',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_pause: 'En pause',
};
const statutStyles: Record<string, string> = {
  a_planifier: 'bg-muted text-muted-foreground',
  en_cours: 'bg-hunters-warning/10 text-hunters-warning',
  termine: 'bg-hunters-success/10 text-hunters-success',
  en_pause: 'bg-hunters-info/10 text-hunters-info',
};

const statutOptions = [
  { label: 'À planifier', value: 'a_planifier' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Terminé', value: 'termine' },
  { label: 'En pause', value: 'en_pause' },
];

export default function Chantiers() {
  const { data: chantiers = [], isLoading } = useChantiers();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const filtered = chantiers.filter(c => {
    const matchSearch = c.reference.toLowerCase().includes(search.toLowerCase()) ||
      (c.bien_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.mandataire_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = !statutFilter || c.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleExport = () => {
    exportToCSV(
      ['Référence', 'Bien', 'Conseiller', 'Budget', 'Consommé', 'Statut', 'Fin prévue'],
      filtered.map(c => [c.reference, c.bien_reference || '', c.mandataire_name || '', c.budget_alloue.toLocaleString('fr-FR'), (c.budget_consomme || 0).toLocaleString('fr-FR'), statutLabels[c.statut], c.date_fin_prevue || '']),
      'chantiers_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">
              {isAdmin ? 'Chantiers & Déco' : 'Mes chantiers'}
            </h1>
            <p className="text-muted-foreground mt-1">Suivi des travaux, lots et ameublement</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <ChantierDialog />
          </div>
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher un chantier..."
          filters={[
            { label: 'Tous les statuts', value: statutFilter, options: statutOptions, onChange: setStatutFilter },
          ]}
        />

        <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Référence</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Bien</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">Conseiller</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Budget</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Fin prévue</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun chantier</td></tr>
                  ) : (
                    filtered.map(c => {
                      const pct = c.budget_alloue > 0 ? Math.min(100, ((c.budget_consomme || 0) / c.budget_alloue) * 100) : 0;
                      const over = (c.budget_consomme || 0) > c.budget_alloue && c.budget_alloue > 0;
                      return (
                        <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-medium text-foreground">{c.reference}</td>
                          <td className="px-5 py-3.5 text-sm text-foreground">{c.bien_reference} {c.bien_ville && `(${c.bien_ville})`}</td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{c.mandataire_name}</td>
                          <td className="px-5 py-3.5 min-w-[160px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className={over ? 'text-destructive font-bold' : 'text-muted-foreground'}>{(c.budget_consomme || 0).toLocaleString('fr-FR')} €</span>
                                <span className="text-muted-foreground">/ {c.budget_alloue.toLocaleString('fr-FR')} €</span>
                              </div>
                              <Progress value={pct} className={`h-1.5 ${over ? '[&>div]:bg-destructive' : ''}`} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{c.date_fin_prevue || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutStyles[c.statut])}>
                              {statutLabels[c.statut]}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <ChantierDialog chantier={c} trigger={<Button variant="outline" size="sm">Détails</Button>} />
                          </td>
                        </tr>
                      );
                    })
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
