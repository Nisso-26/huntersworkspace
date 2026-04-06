import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateBien, useUpdateBien, type Bien } from '@/hooks/use-biens';
import { useDossiers } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, Calculator, FileDown } from 'lucide-react';
import SimulateurTab from '@/components/SimulateurTab';

const types = ['Appartement', 'Maison', 'Immeuble', 'Local', 'Terrain'];
const regimes = [
  { value: 'nu', label: 'Nu' },
  { value: 'lmnp_reel', label: 'LMNP Réel' },
  { value: 'lmnp_micro', label: 'LMNP Micro' },
  { value: 'sci_is', label: 'SCI IS' },
  { value: 'sci_ir', label: 'SCI IR' },
];
const statuts = [
  { value: 'en_recherche', label: 'En recherche' },
  { value: 'identifie', label: 'Identifié' },
  { value: 'visite', label: 'Visité' },
  { value: 'offre_faite', label: 'Offre faite' },
  { value: 'compromis', label: 'Compromis' },
  { value: 'acte', label: 'Acté' },
  { value: 'en_travaux', label: 'En travaux' },
  { value: 'loue', label: 'Loué' },
  { value: 'vendu', label: 'Vendu' },
];

function generateRef() {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `BIEN-${year}-${num}`;
}

interface Props {
  bien?: Bien;
  trigger?: React.ReactNode;
}

export default function BienDialog({ bien, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const createBien = useCreateBien();
  const updateBien = useUpdateBien();
  const { data: dossiers = [] } = useDossiers();
  const { data: mandataires = [] } = useMandataires();
  const { user, role } = useAuth();
  const isAdmin = role === 'super_admin';

  const empty = {
    reference: generateRef(),
    type: 'Appartement',
    adresse: '',
    ville: '',
    code_postal: '',
    surface: 0,
    prix_acquisition: 0,
    frais_notaire: 0,
    budget_travaux: 0,
    loyer_mensuel_cible: 0,
    regime_fiscal: 'nu',
    statut: 'en_recherche',
    dossier_id: '',
    mandataire_id: user?.id || '',
    notes: '',
  };

  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      if (bien) {
        setForm({
          reference: bien.reference,
          type: bien.type,
          adresse: bien.adresse || '',
          ville: bien.ville || '',
          code_postal: bien.code_postal || '',
          surface: bien.surface,
          prix_acquisition: bien.prix_acquisition,
          frais_notaire: bien.frais_notaire,
          budget_travaux: bien.budget_travaux,
          loyer_mensuel_cible: bien.loyer_mensuel_cible,
          regime_fiscal: bien.regime_fiscal,
          statut: bien.statut,
          dossier_id: bien.dossier_id || '',
          mandataire_id: bien.mandataire_id || '',
          notes: bien.notes || '',
        });
      } else {
        setForm({ ...empty, reference: generateRef(), mandataire_id: user?.id || '' });
      }
    }
  }, [open, bien]);

  const prixRevient = useMemo(() => form.prix_acquisition + form.frais_notaire + form.budget_travaux, [form.prix_acquisition, form.frais_notaire, form.budget_travaux]);
  const rentaBrute = useMemo(() => prixRevient > 0 ? ((form.loyer_mensuel_cible * 12) / prixRevient) * 100 : 0, [form.loyer_mensuel_cible, prixRevient]);

  const handleSubmit = () => {
    const payload: any = {
      ...form,
      dossier_id: form.dossier_id || null,
      mandataire_id: form.mandataire_id || user?.id,
    };
    if (bien) {
      updateBien.mutate({ id: bien.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createBien.mutate(payload, { onSuccess: () => setOpen(false) });
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const setNum = (k: string, v: string) => set(k, parseFloat(v) || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            {bien ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {bien ? 'Modifier' : 'Nouveau bien'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {bien ? `Modifier ${bien.reference}` : 'Nouveau bien'}
          </DialogTitle>
          <DialogDescription>
            {bien ? 'Modifiez les informations du bien immobilier.' : 'Renseignez les informations du nouveau bien.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="fiche">
          <TabsList className="mb-4">
            <TabsTrigger value="fiche">Fiche bien</TabsTrigger>
            <TabsTrigger value="simulateur" className="gap-1">
              <Calculator className="w-3.5 h-3.5" /> Simulateur
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fiche">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Référence</Label>
                <Input value={form.reference} onChange={e => set('reference', e.target.value)} />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Adresse</Label>
                <Input value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue..." />
              </div>
              <div>
                <Label>Ville</Label>
                <Input value={form.ville} onChange={e => set('ville', e.target.value)} />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input value={form.code_postal} onChange={e => set('code_postal', e.target.value)} />
              </div>
              <div>
                <Label>Surface (m²)</Label>
                <Input type="number" value={form.surface || ''} onChange={e => setNum('surface', e.target.value)} />
              </div>
              <div>
                <Label>Prix d'acquisition (€)</Label>
                <Input type="number" value={form.prix_acquisition || ''} onChange={e => setNum('prix_acquisition', e.target.value)} />
              </div>
              <div>
                <Label>Frais de notaire (€)</Label>
                <Input type="number" value={form.frais_notaire || ''} onChange={e => setNum('frais_notaire', e.target.value)} />
              </div>
              <div>
                <Label>Budget travaux (€)</Label>
                <Input type="number" value={form.budget_travaux || ''} onChange={e => setNum('budget_travaux', e.target.value)} />
              </div>
              <div>
                <Label>Loyer mensuel cible (€ HC)</Label>
                <Input type="number" value={form.loyer_mensuel_cible || ''} onChange={e => setNum('loyer_mensuel_cible', e.target.value)} />
              </div>
              <div>
                <Label>Régime fiscal</Label>
                <Select value={form.regime_fiscal} onValueChange={v => set('regime_fiscal', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {regimes.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => set('statut', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuts.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dossier client</Label>
                <Select value={form.dossier_id} onValueChange={v => set('dossier_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {dossiers.map(d => <SelectItem key={d.id} value={d.id}>{d.client_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div>
                  <Label>Mandataire</Label>
                  <Select value={form.mandataire_id} onValueChange={v => set('mandataire_id', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {mandataires.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
              </div>

              {/* Computed values */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4 p-4 rounded-sm bg-muted border border-border">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Prix de revient</p>
                  <p className="text-lg font-bold text-primary">{prixRevient.toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Rentabilité brute</p>
                  <p className="text-lg font-bold text-accent">{rentaBrute.toFixed(2)} %</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
                {bien ? 'Enregistrer' : 'Créer le bien'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="simulateur">
            <SimulateurTab
              prixRevient={prixRevient}
              loyerMensuel={form.loyer_mensuel_cible}
              reference={form.reference}
              adresse={`${form.adresse}, ${form.code_postal} ${form.ville}`}
              dossierClient={dossiers.find(d => d.id === form.dossier_id)?.client_name || ''}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
