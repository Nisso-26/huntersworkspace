import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers, useDeleteDossier } from '@/hooks/use-dossiers';
import DossierDialog from '@/components/DossierDialog';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { motion } from 'framer-motion';
import { Trash2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { summarizeStrategie } from '@/lib/strategie-parser';

const statusOptions = [
  { label: 'Nouveau', value: 'nouveau' },
  { label: 'En conseil', value: 'conseil' },
  { label: 'En chasse', value: 'chasse' },
  { label: 'Visite', value: 'visite' },
  { label: 'Offre déposée', value: 'offre' },
  { label: 'Compromis signé', value: 'compromis' },
  { label: 'Acte signé', value: 'signe' },
  { label: 'Clôturé', value: 'cloture' },
];

export default function Dossiers() {
  const { data: dossiers = [], isLoading } = useDossiers();
  const deleteMut = useDeleteDossier();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = dossiers.filter(d => {
    const s = search.toLowerCase();
    const matchSearch = d.client_name.toLowerCase().includes(s) ||
      (d.ville || '').toLowerCase().includes(s) ||
      (d.mandataire_name || '').toLowerCase().includes(s) ||
      (d.numero_dossier || '').toLowerCase().includes(s);
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = () => {
    exportToCSV(
      ['Client', 'Email', 'Conseiller', 'Ville', 'Budget', 'Stratégie', 'Statut'],
      filtered.map(d => [d.client_name, d.email || '', d.mandataire_name || '', d.ville || '', d.budget.toLocaleString('fr-FR'), summarizeStrategie(d.strategie), d.status]),
      'dossiers_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dossiers clients</h1>
            <p className="text-muted-foreground mt-1">{dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <DossierDialog />
          </div>
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher un dossier..."
          filters={[
            { label: 'Tous les statuts', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          ]}
        />

        <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">Conseiller</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">Ville</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Budget</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Stratégie</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun dossier trouvé</td></tr>
                  ) : (
                    filtered.map((d, idx) => (
                      <motion.tr
                        key={d.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="hover:bg-secondary/50 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-foreground">{d.client_name}</p>
                          {d.numero_dossier && (
                            <p className="text-[11px] text-muted-foreground font-mono">{d.numero_dossier}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{d.email}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground hidden md:table-cell">{d.mandataire_name}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground hidden sm:table-cell">{d.ville}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{d.budget.toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
                          {summarizeStrategie(d.strategie)}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.status as any} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <DossierDialog dossier={d} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => { if (confirm('Supprimer ce dossier ?')) deleteMut.mutate(d.id); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => navigate(`/dossiers/${d.id}`)}
                              title="Ouvrir le dossier"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
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
