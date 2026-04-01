import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import {
  FolderOpen, TrendingUp, Users, Target, FileCheck, ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Dashboard() {
  const { data: dossiers = [], isLoading: loadingD } = useDossiers();
  const { data: mandataires = [], isLoading: loadingM } = useMandataires();

  const caReseau = mandataires.reduce((sum, m) => sum + (m.ca_total || 0), 0);
  const dossiersActifs = dossiers.filter(d => !['cloture', 'signe'].includes(d.status)).length;
  const dossiersSigne = dossiers.filter(d => d.status === 'signe').length;
  const mandatairesActifs = mandataires.filter(m => m.status === 'actif').length;

  const recentDossiers = [...dossiers].slice(0, 5);
  const topMandataires = [...mandataires].sort((a, b) => b.ca_total - a.ca_total).slice(0, 5);

  const isLoading = loadingD || loadingM;

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble du réseau HUNTERS</p>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="CA Réseau" value={`${(caReseau / 1000).toFixed(1)}k €`} icon={TrendingUp} variant="gold" />
              <StatCard label="Dossiers actifs" value={dossiersActifs} icon={FolderOpen} />
              <StatCard label="Mandataires actifs" value={mandatairesActifs} icon={Users} variant="info" />
              <StatCard label="Dossiers signés" value={dossiersSigne} icon={FileCheck} variant="success" />
            </>
          )}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div variants={item} className="lg:col-span-2 bg-card rounded-xl border shadow-card">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-heading text-lg font-semibold text-foreground">Derniers dossiers mis à jour</h2>
              <a href="/dossiers" className="text-sm text-accent hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 mx-5 my-2 rounded" />)
              ) : recentDossiers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5 text-center">Aucun dossier pour le moment</p>
              ) : (
                recentDossiers.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Target className="w-4 h-4 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{d.client_name}</p>
                        <p className="text-xs text-muted-foreground">{d.mandataire_name} · {d.ville}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground hidden sm:block">
                        {d.budget.toLocaleString('fr-FR')} €
                      </span>
                      <StatusBadge status={d.status as any} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-card rounded-xl border shadow-card">
            <div className="p-5 border-b">
              <h2 className="font-heading text-lg font-semibold text-foreground">Top Mandataires</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires généré</p>
            </div>
            <div className="divide-y">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 mx-5 my-2 rounded" />)
              ) : topMandataires.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5 text-center">Aucun mandataire</p>
              ) : (
                topMandataires.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="text-xs font-bold text-accent w-5">{idx + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-foreground">{(m.full_name || '?').split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                      <p className="text-xs text-muted-foreground">{m.zone}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{(m.ca_total / 1000).toFixed(1)}k €</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AppLayout>
  );
}
