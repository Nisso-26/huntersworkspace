import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { useBiens, useDeleteBien } from '@/hooks/use-biens';
import BienDialog from '@/components/BienDialog';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { motion } from 'framer-motion';
import { Trash2, Home } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const statutOptions = [
  { label: 'En recherche', value: 'en_recherche' },
  { label: 'Identifié', value: 'identifie' },
  { label: 'Visité', value: 'visite' },
  { label: 'Offre faite', value: 'offre_faite' },
  { label: 'Compromis', value: 'compromis' },
  { label: 'Acté', value: 'acte' },
  { label: 'En travaux', value: 'en_travaux' },
  { label: 'Loué', value: 'loue' },
  { label: 'Vendu', value: 'vendu' },
];

const statutLabels: Record<string, string> = Object.fromEntries(statutOptions.map(s => [s.value, s.label]));

export default function Biens() {
  const { data: biens = [], isLoading } = useBiens();
  const deleteMut = useDeleteBien();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  const filtered = biens.filter(b => {
    const matchSearch = !search || [b.reference, b.ville, b.type, b.mandataire_name].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchStatut = !statutFilter || b.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const handleExport = () => {
    exportToCSV(
      ['Référence', 'Type', 'Ville', 'Prix acquisition', 'Statut', 'Mandataire', 'Rentabilité brute'],
      filtered.map(b => {
        const prixRevient = b.prix_acquisition + b.frais_notaire + b.budget_travaux;
        const renta = prixRevient > 0 ? ((b.loyer_mensuel_cible * 12) / prixRevient * 100).toFixed(2) + '%' : '—';
        return [b.reference, b.type, b.ville || '', b.prix_acquisition.toLocaleString('fr-FR'), statutLabels[b.statut] || b.statut, b.mandataire_name || '', renta];
      }),
      'biens'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Home className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight uppercase">Biens</h1>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <BienDialog />
          </div>
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          filters={[{
            label: 'Statut',
            value: statutFilter,
            options: statutOptions,
            onChange: setStatutFilter,
          }]}
        />

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground uppercase text-xs tracking-wider">
                  <th className="text-left p-3">Référence</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-right p-3">Prix</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Mandataire</th>
                  <th className="text-right p-3">Renta. brute</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => {
                  const prixRevient = b.prix_acquisition + b.frais_notaire + b.budget_travaux;
                  const renta = prixRevient > 0 ? ((b.loyer_mensuel_cible * 12) / prixRevient * 100) : 0;
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-t border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3 font-semibold text-primary">{b.reference}</td>
                      <td className="p-3">{b.type}</td>
                      <td className="p-3">{b.ville || '—'}</td>
                      <td className="p-3 text-right">{b.prix_acquisition.toLocaleString('fr-FR')} €</td>
                      <td className="p-3">
                        <StatusBadge status={b.statut} />
                      </td>
                      <td className="p-3">{b.mandataire_name}</td>
                      <td className="p-3 text-right font-semibold text-accent">{renta.toFixed(2)}%</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BienDialog bien={b} trigger={<Button variant="ghost" size="sm">Modifier</Button>} />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { if (confirm('Supprimer ce bien ?')) deleteMut.mutate(b.id); }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun bien trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
