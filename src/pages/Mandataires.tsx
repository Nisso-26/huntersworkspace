import AppLayout from '@/components/AppLayout';
import { useMandataires, useUpdateProfile } from '@/hooks/use-mandataires';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const statusBadge: Record<string, string> = {
  actif: 'bg-hunters-success/10 text-hunters-success',
  suspendu: 'bg-hunters-warning/10 text-hunters-warning',
  résilie: 'bg-destructive/10 text-destructive',
};
const statusLabel: Record<string, string> = {
  actif: 'Actif', suspendu: 'Suspendu', résilie: 'Résilié',
};
const statusOptions = [
  { label: 'Actif', value: 'actif' },
  { label: 'Suspendu', value: 'suspendu' },
  { label: 'Résilié', value: 'résilie' },
];

export default function Mandataires() {
  const { data: mandataires = [], isLoading } = useMandataires();
  const updateProfile = useUpdateProfile();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = mandataires.filter(m => {
    const matchSearch = (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.zone || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || (m.status || 'actif') === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleStatus = (id: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'actif' ? 'suspendu' : 'actif';
    updateProfile.mutate({ id, status: newStatus });
  };

  const handleExport = () => {
    exportToCSV(
      ['Nom', 'Email', 'Zone', 'Statut', 'CA Total', 'Dossiers actifs'],
      filtered.map(m => [m.full_name || '', m.email || '', m.zone || '', statusLabel[m.status || 'actif'], m.ca_total.toLocaleString('fr-FR'), String(m.dossiers_count)]),
      'mandataires_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Mandataires</h1>
            <p className="text-muted-foreground mt-1">Gestion du réseau — {mandataires.length} mandataire{mandataires.length > 1 ? 's' : ''}</p>
          </div>
          <ExportButton onExportCSV={handleExport} />
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher un mandataire..."
          filters={[
            { label: 'Tous les statuts', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          ]}
        />

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border shadow-card p-8 text-center">
            <p className="text-muted-foreground">Aucun mandataire trouvé</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, idx) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="bg-card rounded-xl border shadow-card p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {(m.full_name || '?').split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{m.full_name || 'Sans nom'}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{m.zone || 'Non définie'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleStatus(m.id, m.status)}
                    className={cn('text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer', statusBadge[m.status || 'actif'])}
                  >
                    {statusLabel[m.status || 'actif']}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{(m.ca_total / 1000).toFixed(1)}k €</p>
                    <p className="text-xs text-muted-foreground">CA</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <FolderOpen className="w-3 h-3" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{m.dossiers_count}</p>
                    <p className="text-xs text-muted-foreground">Dossiers actifs</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{m.email}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
