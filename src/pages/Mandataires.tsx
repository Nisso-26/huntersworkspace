import AppLayout from '@/components/AppLayout';
import { useMandataires, useUpdateProfile, MandataireProfile } from '@/hooks/use-mandataires';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, FolderOpen, Award, Users, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

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
const niveauOptions = [
  { label: 'N1', value: 'N1' },
  { label: 'N2', value: 'N2' },
];

function MandataireDetailDialog({ m, mandataires, onUpdate }: { m: MandataireProfile; mandataires: MandataireProfile[]; onUpdate: (data: any) => void }) {
  const [form, setForm] = useState({
    niveau: m.niveau || 'N1',
    parrain_id: m.parrain_id || '',
    zone: m.zone || '',
    pack_status: m.pack_status || 'actif',
    pack_montant: String(m.pack_montant || 99),
    iban: m.iban || '',
    status: m.status || 'actif',
  });

  const handleSave = () => {
    onUpdate({
      id: m.id,
      niveau: form.niveau,
      parrain_id: form.parrain_id || null,
      zone: form.zone,
      pack_status: form.pack_status,
      pack_montant: Number(form.pack_montant),
      iban: form.iban,
      status: form.status,
    });
  };

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{m.full_name || 'Conseiller'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{(m.ca_total / 1000).toFixed(1)}k €</p>
            <p className="text-xs text-muted-foreground">CA total</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{m.commissions_dues.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-muted-foreground">Commissions dues</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{m.bonus_parrainage.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-muted-foreground">Bonus parrainage</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{m.dossiers_count}</p>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{m.dossiers_signes}</p>
            <p className="text-xs text-muted-foreground">Signés</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{m.commissions_versees.toLocaleString('fr-FR')} €</p>
            <p className="text-xs text-muted-foreground">Comm. versées</p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-2">
            <Label>Niveau</Label>
            <Select value={form.niveau} onValueChange={v => setForm(f => ({ ...f, niveau: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="N1">N1 — 50%</SelectItem>
                <SelectItem value="N2">N2 — 60%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Parrain</Label>
            <Select value={form.parrain_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, parrain_id: v === '__none__' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun</SelectItem>
                {mandataires.filter(x => x.id !== m.id).map(x => (
                  <SelectItem key={x.id} value={x.id}>{x.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zone</Label>
            <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Pack abonnement</Label>
            <Select value={form.pack_status} onValueChange={v => setForm(f => ({ ...f, pack_status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Montant pack (€ HT)</Label>
            <Input type="number" value={form.pack_montant} onChange={e => setForm(f => ({ ...f, pack_montant: e.target.value }))} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>IBAN</Label>
            <Input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value }))} placeholder="FR76..." />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
    </DialogContent>
  );
}

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

  const handleExport = () => {
    exportToCSV(
      ['Nom', 'Email', 'Zone', 'Niveau', 'Statut', 'Pack', 'CA Total', 'Commissions dues', 'Dossiers actifs'],
      filtered.map(m => [
        m.full_name || '', m.email || '', m.zone || '', m.niveau || 'N1',
        statusLabel[m.status || 'actif'], m.pack_status || 'actif',
        m.ca_total.toLocaleString('fr-FR'), m.commissions_dues.toLocaleString('fr-FR'),
        String(m.dossiers_count),
      ]),
      'mandataires_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Conseillers</h1>
            <p className="text-muted-foreground mt-1">Gestion du réseau — {mandataires.length} mandataire{mandataires.length > 1 ? 's' : ''}</p>
          </div>
          <ExportButton onExportCSV={handleExport} />
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher un conseiller..."
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
            <p className="text-muted-foreground">Aucun conseiller trouvé</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, idx) => (
              <Dialog key={m.id}>
                <DialogTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="bg-card rounded-xl border shadow-card p-5 hover:shadow-lg transition-shadow cursor-pointer"
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{m.zone || 'Non définie'}</span>
                            <span className="text-xs font-medium text-accent">{m.niveau || 'N1'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusBadge[m.status || 'actif'])}>
                        {statusLabel[m.status || 'actif']}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t">
                      <div className="text-center">
                        <TrendingUp className="w-3 h-3 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-bold text-foreground">{(m.ca_total / 1000).toFixed(1)}k €</p>
                        <p className="text-xs text-muted-foreground">CA</p>
                      </div>
                      <div className="text-center">
                        <FolderOpen className="w-3 h-3 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-bold text-foreground">{m.dossiers_count}</p>
                        <p className="text-xs text-muted-foreground">Actifs</p>
                      </div>
                      <div className="text-center">
                        <CreditCard className="w-3 h-3 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-bold text-foreground">{m.commissions_dues.toLocaleString('fr-FR')} €</p>
                        <p className="text-xs text-muted-foreground">Dues</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', m.pack_status === 'actif' ? 'bg-hunters-success/10 text-hunters-success' : 'bg-muted text-muted-foreground')}>
                        Pack {m.pack_status === 'actif' ? '✓' : '✗'}
                      </span>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </motion.div>
                </DialogTrigger>
                <MandataireDetailDialog m={m} mandataires={mandataires} onUpdate={(data) => updateProfile.mutate(data)} />
              </Dialog>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
