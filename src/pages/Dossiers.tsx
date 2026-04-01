import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers, useDeleteDossier } from '@/hooks/use-dossiers';
import DossierDialog from '@/components/DossierDialog';
import { motion } from 'framer-motion';
import { Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function Dossiers() {
  const { data: dossiers = [], isLoading } = useDossiers();
  const deleteMut = useDeleteDossier();
  const [search, setSearch] = useState('');

  const filtered = dossiers.filter(d =>
    d.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.ville || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.mandataire_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dossiers Clients</h1>
            <p className="text-muted-foreground mt-1">{dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher un dossier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-72"
              />
            </div>
            <DossierDialog />
          </div>
        </div>

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Client</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Mandataire</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Ville</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Budget</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Stratégie</th>
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
                        className="hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-foreground">{d.client_name}</p>
                          <p className="text-xs text-muted-foreground">{d.email}</p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-foreground">{d.mandataire_name}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground">{d.ville}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{d.budget.toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{d.strategie}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.status as any} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            <DossierDialog dossier={d} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm('Supprimer ce dossier ?')) deleteMut.mutate(d.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
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
