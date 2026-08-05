import { useZonesMandataires } from '@/hooks/use-zones-mandataires';
import { useMandataires } from '@/hooks/use-mandataires';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ZonesOverview() {
  const { data: zones = [], isLoading } = useZonesMandataires();
  const { data: mandataires = [] } = useMandataires();

  const nameById = new Map(mandataires.map(m => [m.id, m.full_name || 'Sans nom']));

  const grouped = new Map<string, { statut: string; mandataire: string }[]>();
  zones.forEach(z => {
    const key = z.zone_label.trim().toLowerCase();
    const list = grouped.get(key) || [];
    list.push({ statut: z.statut, mandataire: nameById.get(z.mandataire_id) || '—' });
    grouped.set(key, list);
  });

  const rows = zones
    .map(z => z.zone_label.trim())
    .filter((l, i, arr) => arr.findIndex(x => x.toLowerCase() === l.toLowerCase()) === i)
    .sort((a, b) => a.localeCompare(b, 'fr'));

  return (
    <div className="bg-card rounded-xl border border-border/60 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Couverture des zones</h2>
      </div>
      {isLoading ? (
        <Skeleton className="h-20 rounded-lg" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune zone assignée pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(label => {
            const entries = grouped.get(label.toLowerCase()) || [];
            const doublon = entries.length > 1;
            return (
              <div
                key={label}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3',
                  doublon ? 'border-destructive/40 bg-destructive/5' : 'border-border/60'
                )}
              >
                <div className="flex items-center gap-2">
                  {doublon && <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {entries.map((e, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {e.mandataire}
                      {e.statut === 'exclusive' ? ' — exclusif' : ''}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
