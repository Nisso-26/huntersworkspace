import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDossier, useUpdateDossier, Dossier } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Pencil } from 'lucide-react';
import DocumentsSection from '@/components/DocumentsSection';
import ClientPortalSection from '@/components/ClientPortalSection';
import SignatureSection from '@/components/SignatureSection';
import StrategieIA from '@/components/StrategieIA';

interface Props {
  dossier?: Dossier;
  trigger?: React.ReactNode;
}

export default function DossierDialog({ dossier, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!dossier;
  const { user, isAdmin } = useAuth();
  const { data: mandataires } = useMandataires();
  const createMut = useCreateDossier();
  const updateMut = useUpdateDossier();

  const [form, setForm] = useState({
    client_name: dossier?.client_name || '',
    email: dossier?.email || '',
    phone: dossier?.phone || '',
    mandataire_id: dossier?.mandataire_id || user?.id || '',
    status: dossier?.status || 'nouveau',
    budget: dossier?.budget?.toString() || '',
    ville: dossier?.ville || '',
    strategie: dossier?.strategie || '',
    honoraires: dossier?.honoraires?.toString() || '',
    notes: dossier?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      budget: Number(form.budget) || 0,
      honoraires: Number(form.honoraires) || 0,
    };

    if (isEdit) {
      await updateMut.mutateAsync({ id: dossier.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  };

  const statuses = [
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'conseil', label: 'Conseil' },
    { value: 'chasse', label: 'Chasse' },
    { value: 'visite', label: 'Visites' },
    { value: 'offre', label: 'Offre' },
    { value: 'compromis', label: 'Compromis' },
    { value: 'signe', label: 'Acte signé' },
    { value: 'cloture', label: 'Clôturé' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            {isEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isEdit ? 'Modifier' : 'Nouveau dossier'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le dossier' : 'Nouveau dossier'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modifiez les informations du dossier client.' : 'Créez un nouveau dossier client.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nom du client *</Label>
              <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            {isAdmin && mandataires && (
              <div className="space-y-2 col-span-2">
                <Label>Mandataire</Label>
                <Select value={form.mandataire_id} onValueChange={v => setForm(f => ({ ...f, mandataire_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {mandataires.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name} — {m.zone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (€)</Label>
              <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Stratégie</Label>
              <Select value={form.strategie} onValueChange={v => setForm(f => ({ ...f, strategie: v }))}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {['LMNP Réel', 'LMNP micro-BIC', 'Déficit foncier', 'SCI IS', 'Pinel', 'Autre'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Honoraires (€)</Label>
              <Input type="number" value={form.honoraires} onChange={e => setForm(f => ({ ...f, honoraires: e.target.value }))} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          {isEdit && dossier?.id && (
            <>
              <div className="border-t pt-4">
                <StrategieIA dossier={dossier} />
              </div>
              <div className="border-t pt-4">
                <DocumentsSection dossierId={dossier.id} />
              </div>
              <div className="border-t pt-4">
                <SignatureSection dossierId={dossier.id} clientName={form.client_name} clientEmail={form.email} />
              </div>
              <div className="border-t pt-4">
                <ClientPortalSection dossierId={dossier.id} clientName={form.client_name} />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {(createMut.isPending || updateMut.isPending) ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
