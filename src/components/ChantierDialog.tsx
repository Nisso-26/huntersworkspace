import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateChantier, useUpdateChantier, type Chantier } from '@/hooks/use-chantiers';
import { useBiens } from '@/hooks/use-biens';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, HardHat, Package, ClipboardList, Camera, FileDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import LotsTab from '@/components/chantier/LotsTab';
import DecoTab from '@/components/chantier/DecoTab';
import VisitesTab from '@/components/chantier/VisitesTab';
import PhotosTab from '@/components/chantier/PhotosTab';
import { generateChantierPdf } from '@/components/chantier/ChantierPdfReport';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const statuts = [
  { value: 'a_planifier', label: 'À planifier' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'en_pause', label: 'En pause' },
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

  // Fetch chantier photos
  const { data: chantierPhotos = [] } = useQuery({
    queryKey: ['chantier-photos', chantier?.id],
    queryFn: async () => {
      if (!chantier) return [];
      const { data } = await supabase.from('photos_chantier').select('*').eq('chantier_id', chantier.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!chantier && open,
  });

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            {chantier ? `Chantier ${chantier.reference}` : 'Nouveau chantier'}
            {chantier && (
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => generateChantierPdf(chantier)}
              >
                <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>Gérez les travaux, lots, déco et visites du chantier.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fiche">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="fiche">Fiche</TabsTrigger>
            {chantier && <TabsTrigger value="lots" className="gap-1"><HardHat className="w-3.5 h-3.5" /> Lots ({chantier.lots?.length || 0})</TabsTrigger>}
            {chantier && <TabsTrigger value="deco" className="gap-1"><Package className="w-3.5 h-3.5" /> Déco ({chantier.achats?.length || 0})</TabsTrigger>}
            {chantier && <TabsTrigger value="visites" className="gap-1"><ClipboardList className="w-3.5 h-3.5" /> Visites ({chantier.visites?.length || 0})</TabsTrigger>}
            {chantier && <TabsTrigger value="photos" className="gap-1"><Camera className="w-3.5 h-3.5" /> Photos ({chantierPhotos.length})</TabsTrigger>}
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
                  <Label>Conseiller</Label>
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
                    <span className="text-muted-foreground">Budget consommé (travaux)</span>
                    <span className={`font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      {budgetConsomme.toLocaleString('fr-FR')} € / {form.budget_alloue.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <Progress value={progressPct} className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : ''}`} />
                  <p className="text-xs text-muted-foreground">Déco : {totalDeco.toLocaleString('fr-FR')} € | Total global : {(budgetConsomme + totalDeco).toLocaleString('fr-FR')} €</p>
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
              <LotsTab chantierId={chantier.id} lots={chantier.lots || []} budgetAlloue={chantier.budget_alloue} />
            </TabsContent>
          )}

          {chantier && (
            <TabsContent value="deco">
              <DecoTab chantierId={chantier.id} achats={chantier.achats || []} />
            </TabsContent>
          )}

          {chantier && (
            <TabsContent value="visites">
              <VisitesTab chantierId={chantier.id} visites={chantier.visites || []} />
            </TabsContent>
          )}

          {chantier && (
            <TabsContent value="photos">
              <PhotosTab chantierId={chantier.id} photos={chantierPhotos} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
