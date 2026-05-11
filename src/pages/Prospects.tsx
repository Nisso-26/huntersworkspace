import AppLayout from '@/components/AppLayout';
import { useProspects, useCreateProspect, useUpdateProspect, useDeleteProspect, useConvertProspect, Prospect } from '@/hooks/use-prospects';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import SearchFilter from '@/components/SearchFilter';
import ExportButton, { exportToCSV } from '@/components/ExportButton';
import StatCard from '@/components/StatCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Users, Target, TrendingUp, ArrowRight, X, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, ReactNode } from 'react';
import { motion } from 'framer-motion';

const statutLabels: Record<string, string> = {
  contact_entrant: 'Contact entrant', qualification: 'Qualification', rdv_planifie: 'RDV planifié',
  mandat_signe: 'Mandat signé', converti: 'Converti', perdu: 'Perdu',
};
const statutStyles: Record<string, string> = {
  contact_entrant: 'bg-muted text-muted-foreground',
  qualification: 'bg-hunters-info/10 text-hunters-info',
  rdv_planifie: 'bg-accent/20 text-accent-foreground',
  mandat_en_cours: 'bg-hunters-warning/10 text-hunters-warning',
  converti: 'bg-hunters-success/10 text-hunters-success',
  perdu: 'bg-destructive/10 text-destructive',
};
const sourceLabels: Record<string, string> = {
  recommandation: 'Recommandation', site: 'Site web', reseaux: 'Réseaux sociaux', autre: 'Autre',
};
const pipelineStatuts = ['contact_entrant', 'qualification', 'rdv_planifie', 'mandat_signe'];

interface ProspectFormProps {
  prospect?: Prospect;
  trigger?: ReactNode;
}

function ProspectForm({ prospect, trigger }: ProspectFormProps) {
  const { user, isAdmin } = useAuth();
  const { data: mandataires = [] } = useMandataires();
  const createMut = useCreateProspect();
  const updateMut = useUpdateProspect();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: prospect?.nom || '',
    telephone: prospect?.telephone || '',
    email: prospect?.email || '',
    source: prospect?.source || 'autre',
    budget_estime: String(prospect?.budget_estime || ''),
    objectif: prospect?.objectif || '',
    notes: prospect?.notes || '',
    mandataire_id: prospect?.mandataire_id || user?.id || '',
    statut: prospect?.statut || 'contact_entrant',
    motif_perte: prospect?.motif_perte || '',
  });

  const handleSave = async () => {
    const payload = { ...form, budget_estime: Number(form.budget_estime) || 0 };
    if (prospect) {
      await updateMut.mutateAsync({ id: prospect.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2"><UserPlus className="w-4 h-4" />Nouveau contact</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{prospect ? 'Modifier le prospect' : 'Nouveau prospect'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sourceLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget estimé (€)</Label>
              <Input type="number" value={form.budget_estime} onChange={e => setForm(f => ({ ...f, budget_estime: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statutLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Conseiller</Label>
                <Select value={form.mandataire_id} onValueChange={v => setForm(f => ({ ...f, mandataire_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mandataires.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Objectif d'investissement</Label>
            <Input value={form.objectif} onChange={e => setForm(f => ({ ...f, objectif: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          {form.statut === 'perdu' && (
            <div className="space-y-2">
              <Label>Motif de perte</Label>
              <Input value={form.motif_perte} onChange={e => setForm(f => ({ ...f, motif_perte: e.target.value }))} placeholder="Ex: budget insuffisant, pas de suite..." />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={!form.nom.trim()}>
              {prospect ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Prospects() {
  const { data: prospects = [], isLoading } = useProspects();
  const convertMut = useConvertProspect();
  const updateMut = useUpdateProspect();
  const deleteMut = useDeleteProspect();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const filtered = prospects.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(search.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatut = !statutFilter || p.statut === statutFilter;
    return matchSearch && matchStatut;
  });

  const activeProspects = prospects.filter(p => !['converti', 'perdu'].includes(p.statut));
  const convertis = prospects.filter(p => p.statut === 'converti').length;
  const perdus = prospects.filter(p => p.statut === 'perdu').length;
  const tauxConversion = prospects.length > 0 ? Math.round((convertis / prospects.length) * 100) : 0;

  const handleExport = () => {
    exportToCSV(
      ['Nom', 'Email', 'Téléphone', 'Source', 'Budget', 'Statut', 'Conseiller', 'Date'],
      filtered.map(p => [p.nom, p.email || '', p.telephone || '', sourceLabels[p.source] || p.source, p.budget_estime.toLocaleString('fr-FR'), statutLabels[p.statut], p.mandataire_name || '', new Date(p.created_at).toLocaleDateString('fr-FR')]),
      'prospects_hunters'
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Contacts</h1>
            <p className="text-muted-foreground mt-1">Pipeline CRM — {activeProspects.length} prospect{activeProspects.length > 1 ? 's' : ''} actif{activeProspects.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onExportCSV={handleExport} />
            <ProspectForm />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : (
            <>
              <StatCard label="Contacts actifs" value={activeProspects.length} icon={Users} />
              <StatCard label="Convertis" value={convertis} icon={Target} variant="success" />
              <StatCard label="Perdus" value={perdus} icon={X} />
              <StatCard label="Taux conversion" value={`${tauxConversion}%`} icon={TrendingUp} variant="gold" />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>Liste</Button>
        </div>

        {view === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {pipelineStatuts.map(statut => {
              const cards = filtered.filter(p => p.statut === statut);
              return (
                <div key={statut} className="flex-shrink-0 w-[260px]">
                  <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card">
                    <div className="p-4 border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">{statutLabels[statut]}</h3>
                      <span className="text-xs bg-secondary text-muted-foreground rounded-full px-2 py-0.5">{cards.length}</span>
                    </div>
                    <div className="p-3 space-y-3 min-h-[120px]">
                      {cards.map((p, idx) => (
                        <ProspectForm key={p.id} prospect={p} trigger={
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-background rounded-lg border p-3 hover:shadow-card transition-shadow cursor-pointer"
                          >
                            <p className="text-sm font-medium text-foreground">{p.nom}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {p.telephone && <Phone className="w-3 h-3 text-muted-foreground" />}
                              {p.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                              <span className="text-xs text-muted-foreground">{sourceLabels[p.source] || p.source}</span>
                            </div>
                            {p.budget_estime > 0 && (
                              <p className="text-xs font-medium text-foreground mt-2">{p.budget_estime.toLocaleString('fr-FR')} €</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">{(p.mandataire_name || '').split(' ')[0]}</span>
                              <Button
                                variant="ghost" size="sm"
                                className="h-6 px-2 text-xs text-primary"
                                onClick={(e) => { e.stopPropagation(); convertMut.mutate(p); }}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" /> Convertir
                              </Button>
                            </div>
                          </motion.div>
                        } />
                      ))}
                      {cards.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Aucun contact</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden">
            <SearchFilter
              search={search}
              onSearchChange={setSearch}
              placeholder="Rechercher..."
              filters={[{ label: 'Tous les statuts', value: statutFilter, options: Object.entries(statutLabels).map(([k, v]) => ({ label: v, value: k })), onChange: setStatutFilter }]}
            />
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-secondary/30">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Nom</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">Contact</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">Source</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Budget</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden lg:table-cell">Conseiller</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucun contact</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{p.nom}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{p.email || p.telephone || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{sourceLabels[p.source] || p.source}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{p.budget_estime > 0 ? `${p.budget_estime.toLocaleString('fr-FR')} €` : '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutStyles[p.statut])}>{statutLabels[p.statut]}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{p.mandataire_name}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <ProspectForm prospect={p} trigger={<Button variant="ghost" size="sm">Modifier</Button>} />
                          {!['converti', 'perdu'].includes(p.statut) && (
                            <Button variant="outline" size="sm" onClick={() => convertMut.mutate(p)}>Convertir</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
