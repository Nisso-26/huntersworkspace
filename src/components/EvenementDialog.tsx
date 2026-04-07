import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEvenement, useUpdateEvenement, useDeleteEvenement, Evenement } from '@/hooks/use-evenements';
import { useDossiers } from '@/hooks/use-dossiers';
import { useAuth } from '@/contexts/AuthContext';
import { Trash2 } from 'lucide-react';

const EVENT_TYPES = [
  { value: 'visite_bien', label: 'Visite de bien' },
  { value: 'rdv_client', label: 'RDV client' },
  { value: 'visite_chantier', label: 'Visite chantier' },
  { value: 'rdv_notaire', label: 'RDV notaire' },
  { value: 'deco_livraison', label: 'Déco / Livraison' },
  { value: 'interne', label: 'Interne' },
  { value: 'reseau', label: 'Événement réseau' },
];

const RAPPEL_OPTIONS = [
  { value: 'none', label: 'Aucun' },
  { value: 'h-2', label: '2 heures avant' },
  { value: 'j-1', label: '1 jour avant' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evenement?: Evenement | null;
  selectedDate?: Date | null;
}

export default function EvenementDialog({ open, onOpenChange, evenement, selectedDate }: Props) {
  const { user, isAdmin } = useAuth();
  const { data: dossiers = [] } = useDossiers();
  const createMut = useCreateEvenement();
  const updateMut = useUpdateEvenement();
  const deleteMut = useDeleteEvenement();

  const [titre, setTitre] = useState('');
  const [type, setType] = useState('rdv_client');
  const [dateDebut, setDateDebut] = useState('');
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('10:00');
  const [lieu, setLieu] = useState('');
  const [dossierId, setDossierId] = useState('none');
  const [notes, setNotes] = useState('');
  const [rappel, setRappel] = useState('j-1');
  const [isReseau, setIsReseau] = useState(false);

  useEffect(() => {
    if (evenement) {
      setTitre(evenement.titre);
      setType(evenement.type);
      const d = new Date(evenement.date_debut);
      setDateDebut(d.toISOString().split('T')[0]);
      setHeureDebut(d.toTimeString().slice(0, 5));
      const f = new Date(evenement.date_fin);
      setHeureFin(f.toTimeString().slice(0, 5));
      setLieu(evenement.lieu || '');
      setDossierId(evenement.dossier_id || 'none');
      setNotes(evenement.notes || '');
      setRappel(evenement.rappel || 'j-1');
      setIsReseau(evenement.is_reseau);
    } else {
      setTitre('');
      setType('rdv_client');
      setDateDebut(selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setHeureDebut('09:00');
      setHeureFin('10:00');
      setLieu('');
      setDossierId('none');
      setNotes('');
      setRappel('j-1');
      setIsReseau(false);
    }
  }, [evenement, selectedDate, open]);

  const handleSubmit = () => {
    if (!titre || !dateDebut) return;
    const debut = new Date(`${dateDebut}T${heureDebut}:00`).toISOString();
    const fin = new Date(`${dateDebut}T${heureFin}:00`).toISOString();
    const payload: any = {
      titre,
      type: isReseau ? 'reseau' : type,
      date_debut: debut,
      date_fin: fin,
      lieu: lieu || null,
      dossier_id: dossierId === 'none' ? null : dossierId,
      notes: notes || null,
      rappel,
      is_reseau: isReseau,
      mandataire_id: user?.id,
    };

    if (evenement) {
      updateMut.mutate({ id: evenement.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const handleDelete = () => {
    if (evenement) {
      deleteMut.mutate(evenement.id, { onSuccess: () => onOpenChange(false) });
    }
  };

  const typeOptions = isAdmin ? EVENT_TYPES : EVENT_TYPES.filter(t => t.value !== 'reseau');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{evenement ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
          <DialogDescription>Renseignez les informations de l'événement</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Visite appartement Rue de la Paix" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={isReseau ? 'reseau' : type} onValueChange={v => {
                if (v === 'reseau') { setIsReseau(true); setType('reseau'); }
                else { setIsReseau(false); setType(v); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rappel</Label>
              <Select value={rappel} onValueChange={setRappel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RAPPEL_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label>Début</Label>
              <Input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)} />
            </div>
            <div>
              <Label>Fin</Label>
              <Input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Lieu / Adresse</Label>
            <Input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Ex: 12 rue Victor Hugo, Lyon" />
          </div>

          {!isReseau && (
            <div>
              <Label>Dossier lié</Label>
              <Select value={dossierId} onValueChange={setDossierId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {dossiers.filter(d => !['cloture'].includes(d.status)).map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.client_name} — {d.ville || 'N/A'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={createMut.isPending || updateMut.isPending}>
              {evenement ? 'Enregistrer' : 'Créer'}
            </Button>
            {evenement && (
              <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleteMut.isPending}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
