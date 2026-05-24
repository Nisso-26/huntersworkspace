import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

export interface QualificationValues {
  bien_existant: boolean;
  sci_holding: boolean;
  statut_fiscal: boolean;
  dirigeant: boolean;
  expatrie: boolean;
  multi_acquisition: boolean;
  budget_500k: boolean;
  credit_complexe: boolean;
}

export const emptyQualification = (): QualificationValues => ({
  bien_existant: false,
  sci_holding: false,
  statut_fiscal: false,
  dirigeant: false,
  expatrie: false,
  multi_acquisition: false,
  budget_500k: false,
  credit_complexe: false,
});

const CRITERIA: { key: keyof QualificationValues; label: string; points: number }[] = [
  { key: 'bien_existant', label: 'Client détient déjà 1 bien ou plus', points: 2 },
  { key: 'sci_holding', label: 'SCI existante ou à créer / holding', points: 2 },
  { key: 'statut_fiscal', label: 'Statut fiscal LMP, LMNP, IS ou déficit foncier actif', points: 2 },
  { key: 'dirigeant', label: "Dirigeant d'entreprise / MDB / profession libérale", points: 1 },
  { key: 'expatrie', label: 'Expatrié ou non-résident fiscal français', points: 2 },
  { key: 'multi_acquisition', label: "Projet d'acquisition de 2 biens ou plus", points: 1 },
  { key: 'budget_500k', label: 'Budget projet supérieur à 500 000 €', points: 2 },
  { key: 'credit_complexe', label: 'Montage crédit complexe (SCI IS, in fine, crédit pro)', points: 1 },
];

export function computeQualification(v: QualificationValues) {
  const score = CRITERIA.reduce((s, c) => s + (v[c.key] ? c.points : 0), 0);
  let niveau: 'Standard' | 'Complexe' | 'Expert';
  let tarif: number;
  if (score >= 6) { niveau = 'Expert'; tarif = 3500; }
  else if (score >= 3) { niveau = 'Complexe'; tarif = 2500; }
  else { niveau = 'Standard'; tarif = 1500; }
  return { score, niveau, tarif };
}

interface Props {
  values: QualificationValues;
  onChange: (v: QualificationValues) => void;
}

export default function QualificationClient({ values, onChange }: Props) {
  const { score, niveau, tarif } = useMemo(() => computeQualification(values), [values]);
  const isExpert = score >= 6;

  return (
    <div className="space-y-4 rounded-md border border-border p-4 bg-muted/30">
      <div>
        <h3 className="font-semibold text-foreground">Qualification du dossier *</h3>
        <p className="text-sm text-muted-foreground">Cochez les critères applicables au client.</p>
      </div>

      <div className="space-y-2">
        {CRITERIA.map(c => (
          <div key={c.key} className="flex items-start gap-3">
            <Checkbox
              id={c.key}
              checked={values[c.key]}
              onCheckedChange={(checked) => onChange({ ...values, [c.key]: checked === true })}
            />
            <Label htmlFor={c.key} className="text-sm font-normal cursor-pointer leading-snug">
              {c.label} <span className="text-muted-foreground">(+{c.points})</span>
            </Label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-md bg-background border p-3">
        <div className="text-sm">
          <div className="font-medium">Score : <span className="text-primary">{score}</span></div>
          <div className="text-muted-foreground">Niveau : <span className="font-semibold text-foreground">{niveau}</span></div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Tarif conseil</div>
          <div className="text-lg font-bold text-primary">{tarif.toLocaleString('fr-FR')} € HT</div>
        </div>
      </div>

      {isExpert && (
        <div className="flex items-start gap-2 rounded-md border border-[#F5A800] bg-[#F5A800]/10 p-3">
          <AlertTriangle className="w-5 h-5 text-[#F5A800] shrink-0 mt-0.5" />
          <div className="text-sm font-medium text-foreground">
            Dossier Expert — validation directeur requise
          </div>
        </div>
      )}
    </div>
  );
}
