import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { useAllConformites } from '@/hooks/use-conformite';
import { useMandataires } from '@/hooks/use-mandataires';

const fmt = (s: string) => {
  const m: Record<string, string> = {
    conforme: 'Conforme', en_cours: 'En cours', non_conforme: 'Non conforme',
    valide: 'Valide', expirante: 'Expirante', expiree: 'Expirée', inactive: 'Inactive',
  };
  return m[s] || s;
};
const tone = (s: string) => {
  if (['conforme', 'valide'].includes(s)) return 'bg-hunters-success/15 text-hunters-success';
  if (['en_cours', 'expirante'].includes(s)) return 'bg-[#F5A800]/15 text-[#F5A800]';
  if (['non_conforme', 'expiree'].includes(s)) return 'bg-destructive/15 text-destructive';
  return 'bg-secondary text-muted-foreground';
};

export default function ConformiteResume() {
  const { data: confs = [] } = useAllConformites();
  const { data: mandataires = [] } = useMandataires();
  const map = new Map(confs.map(c => [c.mandataire_id, c]));

  const alertes = mandataires.filter(m => {
    const c = map.get(m.id);
    return c?.statut_formation === 'non_conforme' || c?.statut_attestation === 'expiree' || c?.suspendu;
  });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#1A4D2E]" />
          <h2 className="font-heading font-bold text-foreground">Conformité du réseau</h2>
        </div>
        {alertes.length > 0 && (
          <Badge variant="destructive">{alertes.length} alerte{alertes.length > 1 ? 's' : ''}</Badge>
        )}
      </div>

      {alertes.length > 0 && (
        <div className="mb-3 rounded-md bg-destructive/5 border border-destructive/30 p-3 text-sm text-destructive">
          Mandataires non conformes : {alertes.map(m => m.full_name).join(', ')}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b">
              <th className="py-2 pr-3">Conseiller</th>
              <th className="py-2 px-2">Formation ALUR</th>
              <th className="py-2 px-2">Heures</th>
              <th className="py-2 px-2">Attestation</th>
              <th className="py-2 px-2">Suspension</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mandataires.slice(0, 10).map(m => {
              const c = map.get(m.id);
              return (
                <tr key={m.id}>
                  <td className="py-2 pr-3 font-medium">{m.full_name || '—'}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${tone(c?.statut_formation || 'non_conforme')}`}>
                      {fmt(c?.statut_formation || 'non_conforme')}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{c?.heures_formation_annee ?? 0} / 14</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${tone(c?.statut_attestation || 'inactive')}`}>
                      {fmt(c?.statut_attestation || 'inactive')}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {c?.suspendu ? <Badge variant="destructive">Suspendu</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
            {mandataires.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Aucun mandataire.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
