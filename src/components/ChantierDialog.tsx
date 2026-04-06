import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateChantier, useUpdateChantier, useCreateLot, useUpdateLot, useDeleteLot, useCreateAchat, useDeleteAchat, type Chantier, type LotTravaux, type AchatDeco } from '@/hooks/use-chantiers';
import { useBiens } from '@/hooks/use-biens';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Trash2, HardHat, Package } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const statuts = [
  { value: 'a_planifier', label: 'À planifier' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'en_pause', label: 'En pause' },
];

const lotStatuts = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
];

function genRef() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `CHANT-${y}-${n}`;
}

interface Props { chantier?: Chantier; trigger?: React.ReactNode; }

export default function ChantierDialog({ chantier, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const { data: biens = [] } = useBiens();
  const { data: mandataires = [] } = useMandataires();
  const { user, role } = useAuth();
  const isAdmin = role === 'super_admin';
  const createMut = useCreateChantier();
  const updateMut = useUpdateChantier();
  const createLot = useCreateLot();
  const updateLotMut = useUpdateLot();
  const deleteLot = useDeleteLot();
  const createAchat = useCreateAchat();
  const deleteAchat = useDeleteAchat();

  const [form, setForm] = useState({
    reference: genRef(),
    bien_id: '',
    mandataire_id: user?.id || '',
    date_debut_prevue: '',
    date_debut_reelle: '',
    date_fin_prevue: '',
    date_fin_reelle: '',
    budget_alloue: 0,
    statut: 'a_planifier',
    notes: '',
  });

  const [newLot, setNewLot] = useState({ designation: '', artisan: '', montant_devis: 0, montant_facture: 0, date_prevue: '' });
  const [newAchat, setNewAchat] = useState({ designation: '', fournisseur: '', montant: 0, lien_produit: '' });

  useEffect(() => {
    if (open && chantier) {
      setForm({
        reference: chantier.reference,
        bien_id: chantier.bien_id || '',
        mandataire_id: chantier.mandataire_id || '',
        date_debut_prevue: chantier.date_debut_prevue || '',
        date_debut_reelle: chantier.date_debut_reelle || '',
        date_fin_prevue: chantier.date_fin_prevue || '',
        date_fin_reelle: chantier.date_fin_reelle || '',
        budget_alloue: chantier.budget_alloue,
        statut: chantier.statut,
        notes: chantier.notes || '',
      });
    } else if (open) {
      setForm(f => ({ ...f, reference: genRef(), mandataire_id: user?.id || '' }));
    }
  }, [open, chantier]);

  const handleSubmit = () => {
    const payload: any = { ...form, bien_id: form.bien_id || null, mandataire_id: form.mandataire_id || user?.id };
    if (chantier) {
      updateMut.mutate({ id: chantier.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  const addLot = () => {
    if (!chantier || !newLot.designation) return;
    createLot.mutate({ chantier_id: chantier.id, ...newLot, statut: 'a_faire' } as any);
    setNewLot({ designation: '', artisan: '', montant_devis: 0, montant_facture: 0, date_prevue: '' });
  };

  const addAchatDeco = () => {
    if (!chantier || !newAchat.designation) return;
    createAchat.mutate({ chantier_id: chantier.id, ...newAchat, statut_livraison: 'en_attente' } as any);
    setNewAchat({ designation: '', fournisseur: '', montant: 0, lien_produit: '' });
  };

  const budgetConsomme = chantier?.budget_consomme || 0;
  const totalDeco = chantier?.total_deco || 0;
  const progressPct = form.budget_alloue > 0 ? Math.min(100, (budgetConsomme / form.budget_alloue) * 100) : 0;
  const isOverBudget = budgetConsomme > form.budget_alloue && form.budget_alloue > 0;

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            {chantier ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {chantier ? 'Modifier' : 'Nouveau chantier'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">{chantier ? `Chantier ${chantier.reference}` : 'Nouveau chantier'}</DialogTitle>
          <DialogDescription>Gérez les travaux, lots et achats déco du chantier.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fiche">
          <TabsList className="mb-4">
            <TabsTrigger value="fiche">Fiche</TabsTrigger>
            {chantier && <TabsTrigger value="lots" className="gap-1"><HardHat className="w-3.5 h-3.5" /> Lots ({chantier.lots?.length || 0})</TabsTrigger>}
            {chantier && <TabsTrigger value="deco" className="gap-1"><Package className="w-3.5 h-3.5" /> Déco ({chantier.achats?.length || 0})</TabsTrigger>}
          </TabsList>

          <TabsContent value="fiche">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Référence</Label><Input value={form.reference} onChange={e => set('reference', e.target.value)} /></div>
              <div>
                <Label>Bien</Label>
                <Select value={form.bien_id} onValueChange={v => set('bien_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    {biens.map(b => <SelectItem key={b.id} value={b.id}>{b.reference} — {b.ville}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div>
                  <Label>Mandataire</Label>
                  <Select value={form.mandataire_id} onValueChange={v => set('mandataire_id', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mandataires.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => set('statut', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuts.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Début prévu</Label><Input type="date" value={form.date_debut_prevue} onChange={e => set('date_debut_prevue', e.target.value)} /></div>
              <div><Label>Début réel</Label><Input type="date" value={form.date_debut_reelle} onChange={e => set('date_debut_reelle', e.target.value)} /></div>
              <div><Label>Fin prévue</Label><Input type="date" value={form.date_fin_prevue} onChange={e => set('date_fin_prevue', e.target.value)} /></div>
              <div><Label>Fin réelle</Label><Input type="date" value={form.date_fin_reelle} onChange={e => set('date_fin_reelle', e.target.value)} /></div>
              <div><Label>Budget alloué (€)</Label><Input type="number" value={form.budget_alloue || ''} onChange={e => set('budget_alloue', Number(e.target.value) || 0)} /></div>
              <div className="md:col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>

              {chantier && (
                <div className="md:col-span-2 p-4 rounded-sm bg-muted border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget consommé</span>
                    <span className={`font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      {budgetConsomme.toLocaleString('fr-FR')} € / {form.budget_alloue.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <Progress value={progressPct} className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`} />
                  <p className="text-xs text-muted-foreground">Déco : {totalDeco.toLocaleString('fr-FR')} € | Total : {(budgetConsomme + totalDeco).toLocaleString('fr-FR')} €</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6 gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit}>{chantier ? 'Enregistrer' : 'Créer le chantier'}</Button>
            </div>
          </TabsContent>

          {chantier && (
            <TabsContent value="lots">
              <div className="space-y-4">
                {(chantier.lots || []).map(lot => (
                  <div key={lot.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{lot.designation}</p>
                      <p className="text-xs text-muted-foreground">{lot.artisan || 'Pas d\'artisan'} · Devis: {lot.montant_devis.toLocaleString('fr-FR')} € · Facturé: {lot.montant_facture.toLocaleString('fr-FR')} €</p>
                    </div>
                    <Select value={lot.statut} onValueChange={v => updateLotMut.mutate({ id: lot.id, statut: v })}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {lotStatuts.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => deleteLot.mutate(lot.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <div className="p-4 rounded-lg border border-dashed space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Ajouter un lot</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input placeholder="Désignation *" value={newLot.designation} onChange={e => setNewLot(l => ({ ...l, designation: e.target.value }))} />
                    <Input placeholder="Artisan" value={newLot.artisan} onChange={e => setNewLot(l => ({ ...l, artisan: e.target.value }))} />
                    <Input type="number" placeholder="Devis €" value={newLot.montant_devis || ''} onChange={e => setNewLot(l => ({ ...l, montant_devis: Number(e.target.value) || 0 }))} />
                    <Input type="number" placeholder="Facturé €" value={newLot.montant_facture || ''} onChange={e => setNewLot(l => ({ ...l, montant_facture: Number(e.target.value) || 0 }))} />
                  </div>
                  <Button size="sm" onClick={addLot} disabled={!newLot.designation}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                </div>
              </div>
            </TabsContent>
          )}

          {chantier && (
            <TabsContent value="deco">
              <div className="space-y-4">
                {(chantier.achats || []).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.designation}</p>
                      <p className="text-xs text-muted-foreground">{a.fournisseur || '—'} · {a.montant.toLocaleString('fr-FR')} €</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.statut_livraison === 'livre' ? 'bg-hunters-success/10 text-hunters-success' : 'bg-hunters-warning/10 text-hunters-warning'}`}>
                      {a.statut_livraison === 'livre' ? 'Livré' : 'En attente'}
                    </span>
                    {a.lien_produit && (
                      <a href={a.lien_produit} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Lien</a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => deleteAchat.mutate(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                <div className="p-4 rounded-lg border border-dashed space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">Ajouter un achat déco</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input placeholder="Désignation *" value={newAchat.designation} onChange={e => setNewAchat(a => ({ ...a, designation: e.target.value }))} />
                    <Input placeholder="Fournisseur" value={newAchat.fournisseur} onChange={e => setNewAchat(a => ({ ...a, fournisseur: e.target.value }))} />
                    <Input type="number" placeholder="Montant €" value={newAchat.montant || ''} onChange={e => setNewAchat(a => ({ ...a, montant: Number(e.target.value) || 0 }))} />
                    <Input placeholder="Lien produit" value={newAchat.lien_produit} onChange={e => setNewAchat(a => ({ ...a, lien_produit: e.target.value }))} />
                  </div>
                  <Button size="sm" onClick={addAchatDeco} disabled={!newAchat.designation}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
