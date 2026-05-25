import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Plus, Trash2, Save, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBaremesHunters, useSaveBaremesService,
  type BaremeHunters, type BaremeService, type BaremeType,
} from '@/hooks/use-baremes-hunters';

type Row = Omit<BaremeHunters, 'id' | 'service'>;

const SERVICES: { key: BaremeService; label: string; baseLabel: string; note?: string }[] = [
  { key: 'conseil', label: 'Conseil patrimonial', baseLabel: 'Score client', note: 'Remise -15% si pack souscrit.' },
  { key: 'chasse', label: 'Chasse immobilière', baseLabel: "Prix d'achat (€)", note: 'Sous 100 000 € : disponible uniquement en pack.' },
  { key: 'amo', label: 'AMO travaux', baseLabel: 'Montant travaux (€)' },
  { key: 'deco', label: 'Décoration & ameublement', baseLabel: 'Budget déco (€)' },
  { key: 'pack', label: 'Pack clé en main', baseLabel: '', note: 'Somme des services engagés − 10% de remise globale (non éditable).' } as any,
];

function emptyRow(): Row {
  return { tranche_min: 0, tranche_max: null, type: 'forfait', valeur: 0, valeur_fixe: 0, ordre: 1 };
}

function ServiceEditor({ service, all }: { service: BaremeService; all: BaremeHunters[] }) {
  const saveMut = useSaveBaremesService();
  const initial = useMemo(
    () => all.filter(b => b.service === service).map(({ id, service: _s, ...r }) => r as Row),
    [all, service]
  );
  const [rows, setRows] = useState<Row[]>(initial);
  useEffect(() => { setRows(initial); }, [initial]);

  const update = (i: number, k: keyof Row, v: any) =>
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [k]: v } : r));
  const add = () => setRows(prev => [...prev, { ...emptyRow(), ordre: prev.length + 1 }]);
  const remove = (i: number) => setRows(prev => prev.filter((_, j) => j !== i));

  const meta = SERVICES.find(s => s.key === service)!;

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-heading font-semibold">{meta.label}</h3>
        {meta.note && <p className="text-xs text-muted-foreground mt-1">{meta.note}</p>}
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground uppercase">
          <span className="col-span-2">{meta.baseLabel} min</span>
          <span className="col-span-2">{meta.baseLabel} max</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-2">Forfait fixe HT (€)</span>
          <span className="col-span-3">Valeur (€ ou %)</span>
          <span className="col-span-1"></span>
        </div>
        {rows.map((row, i) => {
          const isPackOnly = service === 'chasse' && (row.tranche_max ?? Infinity) <= 100000;
          return (
          <div key={i} className="grid grid-cols-12 gap-2 items-center">
            <Input className="col-span-2" type="number" value={row.tranche_min}
              onChange={e => update(i, 'tranche_min', Number(e.target.value))} />
            <Input className="col-span-2" type="number" value={row.tranche_max ?? ''}
              placeholder="∞"
              onChange={e => update(i, 'tranche_max', e.target.value ? Number(e.target.value) : null)} />
            <div className="col-span-2">
              <Select value={row.type} onValueChange={(v: BaremeType) => update(i, 'type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="forfait">Forfait</SelectItem>
                  <SelectItem value="pourcentage">Pourcentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input className="col-span-2" type="number" step="0.01" value={row.valeur_fixe}
              onChange={e => update(i, 'valeur_fixe', Number(e.target.value))} />
            <Input className="col-span-3" type="number" step="0.01" value={row.valeur}
              onChange={e => update(i, 'valeur', Number(e.target.value))} />
            <Button className="col-span-1" size="icon" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
            {isPackOnly && (
              <div className="col-span-12 -mt-1 pl-1">
                <Badge variant="destructive" className="text-[10px]">Pack uniquement</Badge>
              </div>
            )}
          </div>
        );})}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="w-4 h-4 mr-1" />Ajouter une tranche
        </Button>
        <Button onClick={() => saveMut.mutate({ service, rows })} disabled={saveMut.isPending}>
          <Save className="w-4 h-4 mr-2" />Enregistrer
        </Button>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Tous les montants sont exprimés HT. TVA applicable : 20%.</span>
      </div>
    </Card>
  );
}

function PackPanel() {
  return (
    <Card className="p-6 space-y-3">
      <h3 className="font-heading font-semibold">Pack clé en main</h3>
      <p className="text-sm text-muted-foreground">
        Le tarif du pack est calculé automatiquement : <strong>somme des services engagés (Conseil + Chasse + AMO + Déco) − 10% de remise globale</strong>.
      </p>
      <p className="text-xs text-muted-foreground">Ce mode n'a pas de barème propre — il s'appuie sur les barèmes des autres services.</p>
      <div className="flex items-start gap-2 text-xs text-muted-foreground border-t pt-3">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>Tous les montants sont exprimés HT. TVA applicable : 20%.</span>
      </div>
    </Card>
  );
}

export default function BaremeHonoraires() {
  const { isAdmin } = useAuth();
  const { data: all = [], isLoading } = useBaremesHunters();

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Accès réservé au Directeur.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Grille tarifaire Hunters</h2>
      </div>

      <Tabs defaultValue="conseil">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="conseil">Conseil</TabsTrigger>
          <TabsTrigger value="chasse">Chasse</TabsTrigger>
          <TabsTrigger value="amo">AMO</TabsTrigger>
          <TabsTrigger value="deco">Déco</TabsTrigger>
          <TabsTrigger value="pack">Pack</TabsTrigger>
        </TabsList>

        {(['conseil', 'chasse', 'amo', 'deco'] as BaremeService[]).map(s => (
          <TabsContent key={s} value={s}>
            {isLoading ? <Card className="p-6">Chargement…</Card> : <ServiceEditor service={s} all={all} />}
          </TabsContent>
        ))}
        <TabsContent value="pack"><PackPanel /></TabsContent>
      </Tabs>
    </div>
  );
}
