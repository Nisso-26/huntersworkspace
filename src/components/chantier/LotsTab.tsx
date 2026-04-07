import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useCreateLot, useUpdateLot, useDeleteLot, type LotTravaux } from '@/hooks/use-chantiers';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const LOT_STATUTS = [
  { value: 'a_venir', label: 'À venir' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminé' },
  { value: 'reception', label: 'Réception' },
];

const LOT_DESIGNATIONS = [
  'Gros œuvre', 'Électricité', 'Plomberie', 'Menuiserie', 'Revêtements', 'Peinture', 'Autre',
];

const statutColors: Record<string, string> = {
  a_venir: 'bg-muted text-muted-foreground',
  a_faire: 'bg-muted text-muted-foreground',
  en_cours: 'bg-hunters-warning/10 text-hunters-warning',
  termine: 'bg-hunters-success/10 text-hunters-success',
  reception: 'bg-accent/10 text-accent-foreground',
};

interface Props {
  chantierId: string;
  lots: LotTravaux[];
  budgetAlloue: number;
}

export default function LotsTab({ chantierId, lots, budgetAlloue }: Props) {
  const createLot = useCreateLot();
  const updateLot = useUpdateLot();
  const deleteLot = useDeleteLot();
  const [expandedLot, setExpandedLot] = useState<string | null>(null);

  const [newLot, setNewLot] = useState({
    designation: '',
    artisan: '',
    contact_artisan: '',
    montant_devis: 0,
    montant_engage: 0,
    montant_facture: 0,
    avancement: 0,
    date_prevue: '',
  });

  const totalDevis = lots.reduce((s, l) => s + l.montant_devis, 0);
  const totalEngage = lots.reduce((s, l) => s + l.montant_engage, 0);
  const totalFacture = lots.reduce((s, l) => s + l.montant_facture, 0);
  const ecart = totalDevis - totalEngage;

  const addLot = () => {
    if (!newLot.designation) return;
    createLot.mutate({ chantier_id: chantierId, ...newLot, statut: 'a_venir' } as any);
    setNewLot({ designation: '', artisan: '', contact_artisan: '', montant_devis: 0, montant_engage: 0, montant_facture: 0, avancement: 0, date_prevue: '' });
  };

  return (
    <div className="space-y-4">
      {/* Budget summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-muted border text-center">
          <p className="text-xs text-muted-foreground">Total devis</p>
          <p className="text-sm font-bold">{totalDevis.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="p-3 rounded-lg bg-muted border text-center">
          <p className="text-xs text-muted-foreground">Engagé</p>
          <p className="text-sm font-bold">{totalEngage.toLocaleString('fr-FR')} €</p>
        </div>
        <div className="p-3 rounded-lg bg-muted border text-center">
          <p className="text-xs text-muted-foreground">Facturé</p>
          <p className="text-sm font-bold">{totalFacture.toLocaleString('fr-FR')} €</p>
        </div>
        <div className={cn('p-3 rounded-lg border text-center', ecart < 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-hunters-success/10 border-hunters-success/30')}>
          <p className="text-xs text-muted-foreground">Écart budgétaire</p>
          <p className={cn('text-sm font-bold', ecart < 0 ? 'text-destructive' : 'text-hunters-success')}>
            {ecart >= 0 ? '+' : ''}{ecart.toLocaleString('fr-FR')} €
          </p>
        </div>
      </div>

      {/* Lots list */}
      {lots.map(lot => (
        <div key={lot.id} className="rounded-lg border bg-background overflow-hidden">
          <button
            onClick={() => setExpandedLot(expandedLot === lot.id ? null : lot.id)}
            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
          >
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium">{lot.designation}</p>
              <p className="text-xs text-muted-foreground">{lot.artisan || 'Pas d\'artisan'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16">
                <Progress value={lot.avancement} className="h-1.5" />
                <p className="text-[10px] text-center text-muted-foreground">{lot.avancement}%</p>
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full whitespace-nowrap', statutColors[lot.statut] || statutColors.a_venir)}>
                {LOT_STATUTS.find(s => s.value === lot.statut)?.label || lot.statut}
              </span>
              {expandedLot === lot.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {expandedLot === lot.id && (
            <div className="px-3 pb-3 border-t space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Artisan</p>
                  <Input
                    value={lot.artisan || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, artisan: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Contact</p>
                  <Input
                    value={lot.contact_artisan || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, contact_artisan: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Devis (€)</p>
                  <Input
                    type="number"
                    value={lot.montant_devis || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, montant_devis: Number(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Engagé (€)</p>
                  <Input
                    type="number"
                    value={lot.montant_engage || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, montant_engage: Number(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Facturé (€)</p>
                  <Input
                    type="number"
                    value={lot.montant_facture || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, montant_facture: Number(e.target.value) || 0 })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Reste à payer</p>
                  <p className="text-sm font-medium pt-1">{(lot.montant_devis - lot.montant_facture).toLocaleString('fr-FR')} €</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Avancement (%)</p>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={lot.avancement || ''}
                    onChange={e => updateLot.mutate({ id: lot.id, avancement: Math.min(100, Number(e.target.value) || 0) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Statut</p>
                  <Select value={lot.statut} onValueChange={v => updateLot.mutate({ id: lot.id, statut: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOT_STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => deleteLot.mutate(lot.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive mr-1" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add lot form */}
      <div className="p-4 rounded-lg border border-dashed space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">Ajouter un lot</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Select value={newLot.designation} onValueChange={v => setNewLot(l => ({ ...l, designation: v }))}>
            <SelectTrigger><SelectValue placeholder="Type de lot *" /></SelectTrigger>
            <SelectContent>
              {LOT_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Artisan" value={newLot.artisan} onChange={e => setNewLot(l => ({ ...l, artisan: e.target.value }))} />
          <Input type="number" placeholder="Devis €" value={newLot.montant_devis || ''} onChange={e => setNewLot(l => ({ ...l, montant_devis: Number(e.target.value) || 0 }))} />
          <Input type="number" placeholder="Date prévue" type="date" value={newLot.date_prevue} onChange={e => setNewLot(l => ({ ...l, date_prevue: e.target.value }))} />
        </div>
        <Button size="sm" onClick={addLot} disabled={!newLot.designation}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      </div>
    </div>
  );
}
