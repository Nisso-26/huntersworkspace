import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SERVICE_LABELS, type ServiceKey, ALL_SERVICES_TRUE } from '@/lib/workflow';

interface Props {
  type: string;
  services: Record<string, boolean>;
  onTypeChange: (v: string) => void;
  onServicesChange: (s: Record<string, boolean>) => void;
}

const SERVICE_KEYS: ServiceKey[] = ['conseil', 'chasse', 'financement', 'amo', 'deco', 'gestion_locative'];

export default function AccompagnementSection({ type, services, onTypeChange, onServicesChange }: Props) {
  const handleTypeChange = (v: string) => {
    onTypeChange(v);
    if (v === 'cle_en_main') {
      onServicesChange({ ...ALL_SERVICES_TRUE, gestion_locative: false });
    }
  };

  const toggle = (k: ServiceKey, val: boolean) => {
    onServicesChange({ ...services, [k]: val });
  };

  return (
    <div className="space-y-3 sm:col-span-2 border rounded-lg p-4 bg-secondary/30">
      <div className="space-y-2">
        <Label>Type d'accompagnement</Label>
        <Select value={type || 'cle_en_main'} onValueChange={handleTypeChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cle_en_main">Clé en main (tous les services inclus)</SelectItem>
            <SelectItem value="a_la_carte">À la carte</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Services souscrits</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SERVICE_KEYS.map(k => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={!!services[k]}
                disabled={type === 'cle_en_main'}
                onCheckedChange={(v) => toggle(k, !!v)}
              />
              <span className={type === 'cle_en_main' ? 'text-muted-foreground' : 'text-foreground'}>
                {SERVICE_LABELS[k]}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
