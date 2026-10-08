import AppLayout from '@/components/AppLayout';
import { useMandataires, useUpdateProfile, useLeverSuspension, MandataireProfile } from '@/hooks/use-mandataires';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp, FolderOpen, Award, Users, CreditCard, Ban, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConformiteTab from '@/components/mandataires/ConformiteTab';
import { useNiveauxServices } from '@/hooks/use-niveaux-services';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { SERVICES, SERVICE_LABEL } from '@/lib/niveau-service';
import ZonesTab from '@/components/mandataires/ZonesTab';
import ZonesOverview from '@/components/mandataires/ZonesOverview';
import { useAuth } from '@/contexts/AuthContext';

const relanceLabels: Record<number, string> = {
  1: 'Mise en demeure (J+15)',
  2: 'Suspension appliquée (J+30)',
  3: 'Résiliation à examiner (J+45)',
};

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

function MandataireDetailDialog({ m, mandataires, onUpdate }: { m: MandataireProfile; mandataires: MandataireProfile[]; onUpdate: (data: any) => void }) {
  const { isAdmin } = useAuth();
  const leverSuspension = useLeverSuspension();
  const { data: company } = useCompanySettings();
  const { parMandataire, seuils } = useNiveauxServices([m.id]);
  const niv = parMandataire.get(m.id);
  const [form, setForm] = useState({
    zone: m.zone || '',
    pack_status: m.pack_status || 'actif',
    pack_montant: String(m.pack_montant || company?.tarif_abonnement_defaut || 149),
    iban: m.iban || '',
    status: m.status || 'actif',
  });

  const handleSave = () => {
    onUpdate({
      id: m.id,
      zone: form.zone,
      pack_status: m.suspendu ? 'suspendu' : form.pack_status,
      pack_montant: Number(form.pack_montant),
      iban: form.iban,
      status: form.status,
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {m.full_name || 'Conseiller'}
          {m.suspendu && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
              <Ban className="w-3 h-3" /> Accès suspendu
            </span>
          )}
          {m.pack_relance_etape > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-hunters-warning/10 text-hunters-warning">
              <AlertTriangle className="w-3 h-3" /> {relanceLabels[m.pack_relance_etape]}
              {m.pack_impaye_montant > 0 && ` — ${m.pack_impaye_montant.toLocaleString('fr-FR')} €`}
            </span>
          )}
        </DialogTitle>
      </DialogHeader>
      <Tabs defaultValue="profil">
        <TabsList><TabsTrigger value="profil">Profil</TabsTrigger><TabsTrigger value="zones">Zones</TabsTrigger><TabsTrigger value="conformite">Conformité</TabsTrigger></TabsList>
        <TabsContent value="profil" className="mt-4">
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
            <p className="text-lg font-bold text-foreground">{m.dossiers_clotures}</p>
            <p className="text-xs text-muted-foreground">Clôturés</p>
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
          <div className="space-y-1 col-span-2">
            <Label>Niveau par service (honoraires HT encaissés {new Date().getFullYear()})</Label>
            {SERVICES.map(sv => (
              <p key={sv} className="text-sm">
                {SERVICE_LABEL[sv]} : {Math.round(niv?.compteurs[sv] ?? 0).toLocaleString('fr-FR')} / {seuils[sv].toLocaleString('fr-FR')} € — <strong>{niv?.niveaux[sv] ?? 'N1'}</strong>
              </p>
            ))}
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
            <Label>Zone</Label>
            <Input value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Pack abonnement</Label>
            <Select value={m.suspendu ? 'suspendu' : form.pack_status} onValueChange={v => setForm(f => ({ ...f, pack_status: v }))} disabled={m.suspendu}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actif" disabled={m.suspendu}>Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
                <SelectItem value="suspendu">Suspendu</SelectItem>
              </SelectContent>
            </Select>
            {m.suspendu && (
              <p className="text-xs text-destructive">
                Accès suspendu pour impayé (Art. 7.2) — le statut du pack est piloté automatiquement.
                Utilisez « Lever la suspension » ci-dessous pour rétablir l'accès.
              </p>
            )}
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

        {m.suspendu && isAdmin && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Ban className="w-4 h-4 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">Accès suspendu — impayé pack (Art. 7.2)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lever la suspension rétablit l'accès aux outils et réinitialise le compteur de relances
                  sur les factures pack en attente. Acte contractuel.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">Lever la suspension</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lever la suspension d'accès ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {m.full_name || 'Ce conseiller'} retrouvera l'accès complet aux outils et le
                    workflow d'impayés Art. 7.2 sera réinitialisé (relance_etape = 0) sur ses factures
                    pack en attente
                    {m.pack_impaye_montant > 0 && ` (${m.pack_impaye_montant.toLocaleString('fr-FR')} € restant dus)`}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => leverSuspension.mutate(m.id)}>
                    Confirmer la levée
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave}>Enregistrer</Button>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="zones" className="mt-4">
          <ZonesTab mandataireId={m.id} canEdit={isAdmin} />
        </TabsContent>
        <TabsContent value="conformite" className="mt-4">
          <ConformiteTab mandataireId={m.id} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

export default function Mandataires() {
  const { data: mandataires = [], isLoading } = useMandataires();
  const updateProfile = useUpdateProfile();
  const niveaux = useNiveauxServices(mandataires.map(x => x.id));
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
      ['Nom', 'Email', 'Zone', 'Services en N2', 'Statut', 'Pack', 'CA Total', 'Commissions dues', 'Dossiers actifs'],
      filtered.map(m => [
        m.full_name || '', m.email || '', m.zone || '', String(SERVICES.filter(sv => niveaux.parMandataire.get(m.id)?.niveaux[sv] === 'N2').length),
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

        <ZonesOverview />



        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
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
                    className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5 hover:shadow-lg transition-shadow cursor-pointer"
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
                            <span className="text-xs font-medium text-accent">{SERVICES.filter(sv => niveaux.parMandataire.get(m.id)?.niveaux[sv] === 'N2').length} service(s) en N2</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statusBadge[m.status || 'actif'])}>
                          {statusLabel[m.status || 'actif']}
                        </span>
                        {m.suspendu && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            <Ban className="w-3 h-3" /> Suspendu
                          </span>
                        )}
                        {m.pack_relance_etape > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-hunters-warning/10 text-hunters-warning text-right">
                            <AlertTriangle className="w-3 h-3" /> {relanceLabels[m.pack_relance_etape]}
                          </span>
                        )}
                      </div>
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
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', m.suspendu ? 'bg-destructive/10 text-destructive' : m.pack_status === 'actif' ? 'bg-hunters-success/10 text-hunters-success' : 'bg-muted text-muted-foreground')}>
                        {m.suspendu ? 'Suspendu (impayé)' : `Pack ${m.pack_status === 'actif' ? '✓' : '✗'}`}
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
