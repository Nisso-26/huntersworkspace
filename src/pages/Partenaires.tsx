import AppLayout from '@/components/AppLayout';
import { usePartenaires, useCreatePartenaire, useUpdatePartenaire, useDeletePartenaire, Partenaire } from '@/hooks/use-partenaires';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Plus, Phone, Mail, MapPin, FolderOpen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

const specialiteLabels: Record<string, string> = {
  notaire: 'Notaire', courtier: 'Courtier', agent_bancaire: 'Agent bancaire',
  agent_immobilier: 'Agent immobilier', autre: 'Autre',
};
const specialiteOptions = Object.entries(specialiteLabels).map(([k, v]) => ({ label: v, value: k }));

function PartenaireDialog({ partenaire, trigger }: { partenaire?: Partenaire; trigger?: ReactNode }) {
  const { user } = useAuth();
  const createMut = useCreatePartenaire();
  const updateMut = useUpdatePartenaire();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: partenaire?.nom || '',
    societe: partenaire?.societe || '',
    specialite: partenaire?.specialite || 'notaire',
    ville: partenaire?.ville || '',
    telephone: partenaire?.telephone || '',
    email: partenaire?.email || '',
    notes: partenaire?.notes || '',
  });

  const handleSave = async () => {
    if (partenaire) {
      await updateMut.mutateAsync({ id: partenaire.id, ...form });
    } else {
      await createMut.mutateAsync({ ...form, created_by: user?.id });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><Plus className="w-4 h-4" />Nouveau partenaire</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{partenaire ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Société</Label>
              <Input value={form.societe} onChange={e => setForm(f => ({ ...f, societe: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Spécialité</Label>
              <Select value={form.specialite} onValueChange={v => setForm(f => ({ ...f, specialite: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {specialiteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.nom.trim()}>
              {partenaire ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Partenaires() {
  const { data: partenaires = [], isLoading } = usePartenaires();
  const deleteMut = useDeletePartenaire();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('');

  const filtered = partenaires.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) ||
      (p.societe || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.ville || '').toLowerCase().includes(search.toLowerCase());
    const matchSpec = !specFilter || p.specialite === specFilter;
    return matchSearch && matchSpec;
  });

  const handleExport = () => {
    exportToCSV(
      ['Nom', 'Société', 'Spécialité', 'Ville', 'Téléphone', 'Email', 'Dossiers'],
      filtered.map(p => [p.nom, p.societe || '', specialiteLabels[p.specialite] || p.specialite, p.ville || '', p.telephone || '', p.email || '', String(p.dossiers_count || 0)]),
      'partenaires_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Partenaires</h1>
            <p className="text-muted-foreground mt-1">Annuaire des prescripteurs — {partenaires.length} partenaire{partenaires.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <PartenaireDialog />
          </div>
        </div>

        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          placeholder="Rechercher un partenaire..."
          filters={[{ label: 'Toutes les spécialités', value: specFilter, options: specialiteOptions, onChange: setSpecFilter }]}
        />

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border shadow-card p-8 text-center">
            <p className="text-muted-foreground">Aucun partenaire trouvé</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, idx) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-card rounded-xl border shadow-card p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.nom}</p>
                      {p.societe && <p className="text-xs text-muted-foreground">{p.societe}</p>}
                    </div>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground')}>
                    {specialiteLabels[p.specialite] || p.specialite}
                  </span>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {p.ville && <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{p.ville}</div>}
                  {p.telephone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{p.telephone}</div>}
                  {p.email && <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{p.email}</div>}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FolderOpen className="w-3 h-3" />
                    {p.dossiers_count || 0} dossier{(p.dossiers_count || 0) > 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <PartenaireDialog partenaire={p} trigger={<Button variant="ghost" size="sm">Modifier</Button>} />
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMut.mutate(p.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
