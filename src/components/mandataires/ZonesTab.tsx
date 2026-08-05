import { useState } from 'react';
import { useZonesMandataires, useCreateZone, useDeleteZone } from '@/hooks/use-zones-mandataires';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ZonesTab({ mandataireId, canEdit }: { mandataireId: string; canEdit?: boolean }) {
  const { data: zones = [], isLoading } = useZonesMandataires(mandataireId);
  const createZone = useCreateZone();
  const deleteZone = useDeleteZone();
  const [label, setLabel] = useState('');
  const [statut, setStatut] = useState<'prioritaire' | 'exclusive'>('prioritaire');
  const [perimetre, setPerimetre] = useState('25');

  const handleAdd = () => {
    if (!label.trim()) return;
    createZone.mutate(
      { mandataire_id: mandataireId, zone_label: label, statut, perimetre_km: Number(perimetre) || 25 },
      { onSuccess: () => { setLabel(''); setPerimetre('25'); } }
    );
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : zones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune zone assignée.</p>
      ) : (
        <div className="space-y-2">
          {zones.map(z => (
            <div key={z.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{z.zone_label}</p>
                  <p className="text-xs text-muted-foreground">
                    Rayon {z.perimetre_km} km — depuis le {new Date(z.date_affectation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full',
                  z.statut === 'exclusive' ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground'
                )}>
                  {z.statut === 'exclusive' ? 'Exclusivité stricte' : 'Prioritaire'}
                </span>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => deleteZone.mutate(z.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-t pt-4 items-end">
          <div className="space-y-2 sm:col-span-2">
            <Label>Zone (ville, département ou secteur)</Label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex. Bordeaux Métropole" />
          </div>
          <div className="space-y-2">
            <Label>Exclusivité</Label>
            <Select value={statut} onValueChange={(v) => setStatut(v as 'prioritaire' | 'exclusive')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prioritaire">Prioritaire</SelectItem>
                <SelectItem value="exclusive">Exclusivité stricte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rayon (km)</Label>
            <Input type="number" value={perimetre} onChange={e => setPerimetre(e.target.value)} />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <Button onClick={handleAdd} disabled={!label.trim() || createZone.isPending}>
              <Plus className="w-4 h-4 mr-1" /> Ajouter la zone
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
