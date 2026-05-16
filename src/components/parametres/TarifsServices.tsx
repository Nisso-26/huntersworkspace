import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tag, Save } from 'lucide-react';
import { useTarifsServices, useUpdateTarif, UNITE_LABELS, type TarifService } from '@/hooks/use-tarifs-services';

export default function TarifsServices() {
  const { data: tarifs = [] } = useTarifsServices();
  const updateMut = useUpdateTarif();
  const [rows, setRows] = useState<TarifService[]>([]);

  useEffect(() => { if (tarifs.length) setRows(tarifs); }, [tarifs]);

  const updateRow = (i: number, k: keyof TarifService, v: any) =>
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [k]: v } : r));

  const saveAll = async () => {
    for (const r of rows) {
      await updateMut.mutateAsync({
        id: r.id,
        tarif_base: Number(r.tarif_base) || 0,
        tva_taux: Number(r.tva_taux) || 20,
        unite: r.unite,
      });
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Tag className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Tarifs des services</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Tarifs de base utilisés dans le module de facturation des dossiers. Modifiable par le Directeur.
      </p>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground uppercase">
          <span className="col-span-5">Service</span>
          <span className="col-span-2">Tarif</span>
          <span className="col-span-3">Unité</span>
          <span className="col-span-2">TVA %</span>
        </div>
        {rows.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5 text-sm">{row.label}</div>
            <Input
              className="col-span-2"
              type="number"
              step="0.01"
              value={row.tarif_base}
              onChange={e => updateRow(i, 'tarif_base', Number(e.target.value))}
            />
            <div className="col-span-3">
              <Select value={row.unite} onValueChange={v => updateRow(i, 'unite', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(UNITE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              className="col-span-2"
              type="number"
              step="0.1"
              value={row.tva_taux}
              onChange={e => updateRow(i, 'tva_taux', Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <Button onClick={saveAll} disabled={updateMut.isPending}>
        <Save className="w-4 h-4 mr-2" />Enregistrer les tarifs
      </Button>
    </Card>
  );
}
