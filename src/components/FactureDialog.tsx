import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFacture } from '@/hooks/use-factures';
import { useMandataires } from '@/hooks/use-mandataires';
import { useDossiers } from '@/hooks/use-dossiers';
import { Plus } from 'lucide-react';

const typeOptions = [
  { value: 'honoraires', label: 'Honoraires client' },
  { value: 'abonnement', label: 'Pack mensuel mandataire' },
  { value: 'commission', label: 'Commission mandataire' },
  { value: 'avoir', label: 'Avoir / Remboursement' },
];

const statutOptions = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'payee', label: 'Payée' },
  { value: 'impayee', label: 'Impayée' },
  { value: 'annulee', label: 'Annulée' },
];

function genRef() {
  const y = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `FAC-${y}-${n}`;
}

export default function FactureDialog() {
  const [open, setOpen] = useState(false);
  const { data: mandataires } = useMandataires();
  const { data: dossiers = [] } = useDossiers();
  const createMut = useCreateFacture();

  const [form, setForm] = useState({
    mandataire_id: '',
    dossier_id: '',
    montant: '',
    tva_taux: '20',
    type: 'honoraires',
    statut: 'en_attente',
    reference: genRef(),
    client_name: '',
  });

  // When dossier is selected for honoraires, auto-fill
  const selectedDossier = dossiers.find(d => d.id === form.dossier_id);
  useEffect(() => {
    if (form.type === 'honoraires' && selectedDossier) {
      setForm(f => ({
        ...f,
        montant: String(selectedDossier.honoraires || 0),
        mandataire_id: selectedDossier.mandataire_id || f.mandataire_id,
        client_name: selectedDossier.client_name,
      }));
    }
  }, [form.dossier_id, form.type]);

  const montantHT = Number(form.montant) || 0;
  const tva = Number(form.tva_taux) || 20;
  const montantTTC = montantHT * (1 + tva / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({
      mandataire_id: form.mandataire_id || null,
      dossier_id: form.dossier_id || null,
      montant: montantHT,
      tva_taux: tva,
      montant_ttc: Math.round(montantTTC * 100) / 100,
      type: form.type,
      statut: form.statut,
      reference: form.reference,
      client_name: form.client_name,
      dossier_client_name: selectedDossier?.client_name || null,
    } as any);
    setOpen(false);
    setForm({ mandataire_id: '', dossier_id: '', montant: '', tva_taux: '20', type: 'honoraires', statut: 'en_attente', reference: genRef(), client_name: '' });
  };

  // Filter dossiers to only signed ones for honoraires
  const signedDossiers = form.type === 'honoraires' ? dossiers.filter(d => d.status === 'signe') : dossiers;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nouvelle facture</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
          <DialogDescription>Créez une facture avec calcul automatique HT/TVA/TTC.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Type de facture</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.type === 'honoraires' && (
              <div className="space-y-2 col-span-2">
                <Label>Dossier client (Acte signé)</Label>
                <Select value={form.dossier_id} onValueChange={v => setForm(f => ({ ...f, dossier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un dossier" /></SelectTrigger>
                  <SelectContent>
                    {signedDossiers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.client_name} — {(d.honoraires || 0).toLocaleString('fr-FR')} €</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Conseiller</Label>
              <Select value={form.mandataire_id} onValueChange={v => setForm(f => ({ ...f, mandataire_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {(mandataires || []).map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant HT (€)</Label>
              <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>TVA (%)</Label>
              <Input type="number" value={form.tva_taux} onChange={e => setForm(f => ({ ...f, tva_taux: e.target.value }))} />
            </div>
          </div>

          {/* Live HT/TVA/TTC */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-sm bg-muted border">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">HT</p>
              <p className="text-sm font-bold text-foreground">{montantHT.toLocaleString('fr-FR')} €</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">TVA ({tva}%)</p>
              <p className="text-sm font-bold text-foreground">{(montantHT * tva / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">TTC</p>
              <p className="text-sm font-bold text-primary">{montantTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Référence</Label>
              <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statutOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.type !== 'honoraires' && (
            <div className="space-y-2">
              <Label>Nom client</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Nom du client" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Création...' : 'Créer la facture'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
