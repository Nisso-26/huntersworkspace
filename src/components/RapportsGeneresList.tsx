import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import RapportConseilButton from '@/components/RapportConseilButton';
import type { Dossier } from '@/hooks/use-dossiers';

interface RapportRow {
  id: string;
  type: string;
  numero_dossier: string | null;
  date_generation: string;
  conseiller_id: string | null;
  conseiller_name?: string;
}

export default function RapportsGeneresList({ dossier }: { dossier: Dossier }) {
  const [items, setItems] = useState<RapportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('documents_generes') as any)
      .select('*')
      .eq('dossier_id', dossier.id)
      .eq('type', 'rapport_conseil')
      .order('date_generation', { ascending: false });
    const list = (data || []) as RapportRow[];
    const ids = Array.from(new Set(list.map(r => r.conseiller_id).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p.full_name as string]));
      list.forEach(r => { if (r.conseiller_id) r.conseiller_name = map.get(r.conseiller_id) || ''; });
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const onGen = (e: any) => { if (e?.detail?.dossierId === dossier.id) load(); };
    window.addEventListener('rapport-genere', onGen);
    return () => window.removeEventListener('rapport-genere', onGen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier.id]);

  return (
    <div className="space-y-3 border-t pt-4 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Rapports de conseil générés ({items.length})
        </h4>
        <RapportConseilButton dossier={dossier} />
      </div>

      {loading ? (
        <Skeleton className="h-10 rounded" />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucun rapport généré pour ce dossier.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(r => (
            <li key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary/50">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground flex-1">
                Rapport de conseil
                {r.numero_dossier && (
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                    {r.numero_dossier}
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {new Date(r.date_generation).toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {r.conseiller_name && (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">· {r.conseiller_name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
