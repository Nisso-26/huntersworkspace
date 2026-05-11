import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { useDossiers } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import { useAuth } from '@/contexts/AuthContext';
import { FolderOpen, TrendingUp, Users, FileCheck, ArrowUpRight, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import OnboardingWizard from '@/components/OnboardingWizard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } } as const;
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } } as const;

export default function Dashboard() {
  const { data: dossiers = [], isLoading: loadingD } = useDossiers();
  const { data: mandataires = [], isLoading: loadingM } = useMandataires();
  const { isAdmin, user, role } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Afficher l'onboarding pour les nouveaux conseillers sans dossiers
  useEffect(() => {
    if (!isAdmin && role === 'mandataire' && !loadingD && dossiers.length === 0) {
      const key = `onboarding_done_${user?.id}`;
      if (!localStorage.getItem(key)) {
        setShowOnboarding(true);
      }
    }
  }, [isAdmin, role, loadingD, dossiers.length, user?.id]);

  const handleOnboardingComplete = () => {
    if (user?.id) localStorage.setItem(`onboarding_done_${user.id}`, '1');
    setShowOnboarding(false);
  };

  const caTotal = dossiers
    .filter(d => ['signe', 'compromis'].includes(d.status))
    .reduce((sum, d) => sum + (d.honoraires || 0), 0);
  const dossiersActifs = dossiers.filter(d => !['cloture', 'signe'].includes(d.status)).length;
  const dossiersSigne = dossiers.filter(d => d.status === 'signe').length;
  const mandatairesActifs = mandataires.filter(m => m.status === 'actif').length;
  const recentDossiers = [...dossiers].slice(0, 6);

  // Données CA mensuel sur 6 mois
  const caMonthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString('fr-FR', { month: 'short' });
    const ca = dossiers
      .filter(dos => {
        if (!['signe', 'compromis'].includes(dos.status)) return false;
        const updated = new Date(dos.updated_at || dos.created_at || '');
        return updated.getMonth() === d.getMonth() && updated.getFullYear() === d.getFullYear();
      })
      .reduce((sum, dos) => sum + (dos.honoraires || 0), 0);
    return { month, ca };
  });
  const topMandataires = [...mandataires].sort((a, b) => b.ca_total - a.ca_total).slice(0, 5);
  const isLoading = loadingD || loadingM;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}
      <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">

        {/* Header */}
        <motion.div variants={item} className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="label-premium mb-1">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-2xl font-bold text-foreground font-heading">
              {isAdmin ? 'Tableau de bord' : `Bonjour, ${firstName}`}
            </h1>
            <div className="bar-or mt-2" />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border/60 px-3 py-2 rounded-lg shadow-card">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Hunters Immobilier · Tours</span>
            </div>
          )}
        </motion.div>

        {/* KPI Cards */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: isAdmin ? 4 : 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label={isAdmin ? 'CA Réseau' : 'Mon CA'}
                value={`${(caTotal / 1000).toFixed(1)}k €`}
                icon={TrendingUp}
                variant="gold"
                subtitle="Honoraires encaissés"
              />
              <StatCard
                label={isAdmin ? 'Dossiers actifs' : 'Mes dossiers actifs'}
                value={dossiersActifs}
                icon={FolderOpen}
                subtitle="En cours de traitement"
              />
              {isAdmin && (
                <StatCard
                  label="Conseillers actifs"
                  value={mandatairesActifs}
                  icon={Users}
                  variant="info"
                  subtitle="Dans le réseau"
                />
              )}
              <StatCard
                label={isAdmin ? 'Actes signés' : 'Mes actes signés'}
                value={dossiersSigne}
                icon={FileCheck}
                variant="success"
                subtitle="Transactions finalisées"
              />
            </>
          )}
        </motion.div>

        {/* Graphique CA mensuel — directeur uniquement */}
        {isAdmin && !isLoading && (
          <motion.div variants={item}>
            <div className="bg-card rounded-xl border border-border/60 shadow-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-heading font-bold text-foreground text-sm">Évolution du CA</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Honoraires encaissés sur 6 mois</p>
                </div>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={caMonthly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(147,49%,20%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(147,49%,20%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(40,12%,88%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(0,0%,48%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(0,0%,48%)' }} axisLine={false} tickLine={false} tickFormatter={v => v > 0 ? `${(v/1000).toFixed(0)}k` : '0'} />
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString('fr-FR')} €`, 'CA']}
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(40,12%,88%)' }}
                  />
                  <Area type="monotone" dataKey="ca" stroke="hsl(147,49%,20%)" strokeWidth={2} fill="url(#caGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* Corps principal */}
        <div className={`grid ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>

          {/* Derniers dossiers */}
          <motion.div variants={item} className={isAdmin ? 'lg:col-span-2' : ''}>
            <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <div>
                  <h2 className="font-heading font-bold text-foreground text-sm">
                    {isAdmin ? 'Derniers dossiers clients' : 'Mes derniers dossiers'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Mis à jour récemment</p>
                </div>
                <Link
                  to="/dossiers"
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent transition-colors"
                >
                  Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : recentDossiers.length === 0 ? (
                <div className="py-12 text-center">
                  <FolderOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun dossier pour le moment</p>
                  <Link to="/dossiers" className="text-xs text-primary hover:underline mt-1 inline-block">
                    Créer un premier dossier →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentDossiers.map((d, idx) => (
                    <Link
                      key={d.id}
                      to={`/dossiers/${d.id}`}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-secondary/40 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/12 transition-colors">
                          <span className="text-[11px] font-bold text-primary">
                            {d.client_name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {d.client_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {isAdmin ? `${d.mandataire_name} · ` : ''}{d.ville || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-bold text-foreground hidden sm:block">
                          {d.budget.toLocaleString('fr-FR')} €
                        </span>
                        <StatusBadge status={d.status} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Top Conseillers */}
          {isAdmin && (
            <motion.div variants={item}>
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden">
                <div className="px-6 py-4 border-b border-border/50">
                  <h2 className="font-heading font-bold text-foreground text-sm">Top Conseillers</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires</p>
                </div>

                {isLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                  </div>
                ) : topMandataires.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun conseiller dans le réseau</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {topMandataires.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-3 px-6 py-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold
                            ${idx === 0 ? 'bg-accent text-accent-foreground shadow-gold' : 'bg-secondary text-foreground'}`}>
                            {(m.full_name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          {idx === 0 && (
                            <span className="absolute -top-1 -right-1 text-[10px]">🏆</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{m.full_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{m.zone || '—'}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground flex-shrink-0">
                          {(m.ca_total / 1000).toFixed(1)}k €
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="px-6 py-3 border-t border-border/40 bg-secondary/20">
                  <Link to="/mandataires" className="text-xs font-semibold text-primary hover:text-accent transition-colors flex items-center gap-1">
                    Voir le réseau complet <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AppLayout>
    </>
  );
}
