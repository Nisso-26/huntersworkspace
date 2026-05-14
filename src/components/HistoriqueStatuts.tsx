import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoriqueRow {
  id: string;
  ancien_statut: string | null;
  nouveau_statut: string;
  date_changement: string;
  modifie_par: string | null;
  auteur_name?: string;
}

const STATUT_LABELS: Record<string, string> = {
  nouveau: 'Nouveau', conseil: 'En conseil', chasse: 'En chasse', visite: 'Visites',
  offre: 'Offre déposée', compromis: 'Compromis signé', signe: 'Acte signé', cloture: 'Clôturé',
};
const HUNTERS_GREEN = '#1A4D2E';
const HUNTERS_GOLD = '#F5A800';

export default function HistoriqueStatuts({ dossierId }: { dossierId: string }) {
  const [items, setItems] = useState<HistoriqueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('historique_statuts') as any)
      .select('*')
      .eq('dossier_id', dossierId)
      .order('date_changement', { ascending: false });
    const rows = (data || []) as HistoriqueRow[];
    const ids = Array.from(new Set(rows.map(r => r.modifie_par).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p.full_name as string]));
      rows.forEach(r => { if (r.modifie_par) r.auteur_name = map.get(r.modifie_par) || 'Utilisateur'; });
    }
    setItems(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`hist-statuts-${dossierId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historique_statuts', filter: `dossier_id=eq.${dossierId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: HUNTERS_GREEN }}>
        <span className="inline-block w-1 h-5 rounded-sm" style={{ background: HUNTERS_GOLD }} />
        <History className="w-4 h-4" />
        Historique des statuts
      </h3>
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun changement de statut enregistré.</p>
      ) : (
        <ol className="relative border-l-2 pl-6 space-y-4" style={{ borderColor: `${HUNTERS_GREEN}33` }}>
          {items.map(r => (
            <li key={r.id} className="relative">
              <span
                className="absolute -left-[10px] w-4 h-4 rounded-full ring-4 ring-card"
                style={{ background: HUNTERS_GOLD }}
              />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {r.ancien_statut && (
                  <>
                    <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                      {STATUT_LABELS[r.ancien_statut] || r.ancien_statut}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </>
                )}
                <span className="px-2 py-0.5 rounded text-xs font-semibold text-white" style={{ background: HUNTERS_GREEN }}>
                  {STATUT_LABELS[r.nouveau_statut] || r.nouveau_statut}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(r.date_changement).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' · il y a '}
                {formatDistanceToNow(new Date(r.date_changement), { locale: fr })}
                {r.auteur_name && ` · par ${r.auteur_name}`}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
