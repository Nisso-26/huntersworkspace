import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFacture, Facture } from '@/hooks/use-factures';
import { useMandataires } from '@/hooks/use-mandataires';
import { Plus } from 'lucide-react';

export default function FactureDialog() {
  const [open, setOpen] = useState(false);
  const { data: mandataires } = useMandataires();
  const createMut = useCreateFacture();

  const [form, setForm] = useState({
    mandataire_id: '',
    montant: '',
    type: 'abonnement',
    statut: 'en_attente',
    reference: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({
      ...form,
      montant: Number(form.montant) || 0,
    } as any);
    setOpen(false);
    setForm({ mandataire_id: '', montant: '', type: 'abonnement', statut: 'en_attente', reference: '' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nouvelle facture</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Mandataire</Label>
            <Select value={form.mandataire_id} onValueChange={v => setForm(f => ({ ...f, mandataire_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {(mandataires || []).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Montant (€)</Label>
              <Input type="number" value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="abonnement">Abonnement</SelectItem>
                  <SelectItem value="commission">Commission</SelectItem>
                  <SelectItem value="honoraires">Honoraires</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Référence</Label>
            <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="FAC-2026-001" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createMut.isPending}>
              {createMut.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
