import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import { dossiers } from '@/data/mock-data';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

export default function Dossiers() {
  const [search, setSearch] = useState('');
  const filtered = dossiers.filter(d =>
    d.clientName.toLowerCase().includes(search.toLowerCase()) ||
    d.ville.toLowerCase().includes(search.toLowerCase()) ||
    d.mandataireName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dossiers Clients</h1>
            <p className="text-muted-foreground mt-1">{dossiers.length} dossiers au total</p>
          </div>
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
        </div>

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
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
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Mis à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((d, idx) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-foreground">{d.clientName}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{d.mandataireName}</td>
                    <td className="px-5 py-3.5 text-sm text-foreground">{d.ville}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{d.budget.toLocaleString('fr-FR')} €</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{d.strategie}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(d.dateMaj).toLocaleDateString('fr-FR')}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
