import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import { TrendingUp, Users, Target, Wallet, Package, LineChart } from 'lucide-react';
import { useDossiers } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import { useFactures } from '@/hooks/use-factures';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export default function Reporting() {
  const { data: dossiers = [], isLoading: dLoad } = useDossiers();
  const { data: mandataires = [], isLoading: mLoad } = useMandataires();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = useMemo(() => {
    const signes = dossiers.filter(d => d.status === 'signe');
    const signesMois = signes.filter(d => new Date(d.updated_at) >= monthStart);
    const caMois = signesMois.reduce((s, d) => s + (Number(d.honoraires) || 0), 0);
    const actifs = dossiers.filter(d => !['nouveau', 'signe', 'cloture'].includes(d.status)).length;
    const tauxConv = dossiers.length > 0 ? (signes.length / dossiers.length) * 100 : 0;

    // Commissions du mois selon niveau (N1 50% / N2 60%)
    const niveauMap = new Map(mandataires.map(m => [m.id, m.niveau || 'N1']));
    const commMois = signesMois.reduce((s, d) => {
      const niveau = d.mandataire_id ? niveauMap.get(d.mandataire_id) : 'N1';
      const taux = niveau === 'N2' ? 0.6 : 0.5;
      return s + (Number(d.honoraires) || 0) * taux;
    }, 0);

    return { caMois, actifs, tauxConv, commMois };
  }, [dossiers, mandataires, monthStart]);

  const perfRows = useMemo(() => {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return mandataires.map(m => {
      const mDoss = dossiers.filter(d => d.mandataire_id === m.id);
      const actifs = mDoss.filter(d => !['nouveau', 'signe', 'cloture'].includes(d.status)).length;
      const signes = mDoss.filter(d => d.status === 'signe');
      const ca = signes.reduce((s, d) => s + (Number(d.honoraires) || 0), 0);
      const signesMois = signes.filter(d => new Date(d.updated_at) >= monthStart);
      const taux = (m.niveau || 'N1') === 'N2' ? 0.6 : 0.5;
      const commMois = signesMois.reduce((s, d) => s + (Number(d.honoraires) || 0) * taux, 0);
      const lastUpdate = mDoss.reduce((max, d) => {
        const t = new Date(d.updated_at).getTime();
        return t > max ? t : max;
      }, 0);
      const isActive = lastUpdate > 0 && new Date(lastUpdate) >= thirtyDaysAgo;
      return {
        id: m.id,
        nom: m.full_name || m.email || '—',
        actifs,
        signes: signes.length,
        ca,
        commMois,
        isActive,
      };
    }).sort((a, b) => b.ca - a.ca);
  }, [dossiers, mandataires, monthStart, now]);

  const loading = dLoad || mLoad;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Reporting réseau</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance globale et par conseiller</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
          ) : (
            <>
              <StatCard label="CA réseau du mois" value={fmtEur(stats.caMois)} icon={TrendingUp} variant="gold" />
              <StatCard label="Dossiers actifs" value={stats.actifs} icon={Users} variant="info" />
              <StatCard label="Taux de conversion" value={`${stats.tauxConv.toFixed(1)}%`} icon={Target} variant="success" />
              <StatCard label="Commissions dues ce mois" value={fmtEur(stats.commMois)} icon={Wallet} />
            </>
          )}
        </div>

        {/* Tableau performance */}
        <div className="bg-card border border-border/60 rounded-xl shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Performance par conseiller
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Conseiller</th>
                  <th className="px-5 py-3 font-semibold text-right">Dossiers actifs</th>
                  <th className="px-5 py-3 font-semibold text-right">Actes signés</th>
                  <th className="px-5 py-3 font-semibold text-right">CA généré</th>
                  <th className="px-5 py-3 font-semibold text-right">Commission ce mois</th>
                  <th className="px-5 py-3 font-semibold text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="p-3"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : perfRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">Aucun conseiller</td></tr>
                ) : perfRows.map(r => (
                  <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{r.nom}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.actifs}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.signes}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold">{fmtEur(r.ca)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-accent font-semibold">{fmtEur(r.commMois)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold',
                        r.isActive
                          ? 'bg-hunters-success/15 text-hunters-success'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {r.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
