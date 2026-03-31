import AppLayout from '@/components/AppLayout';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { dossiers, mandataires } from '@/data/mock-data';
import {
  FolderOpen,
  TrendingUp,
  Users,
  Target,
  Eye,
  FileCheck,
  ArrowUpRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

const caReseau = mandataires.reduce((sum, m) => sum + (m.caTotal || 0), 0);
const commissionsTotal = mandataires.reduce((sum, m) => sum + (m.commissionsTotal || 0), 0);
const dossiersActifs = dossiers.filter(d => !['cloture', 'signe'].includes(d.status)).length;
const dossiersSigne = dossiers.filter(d => d.status === 'signe').length;

const recentDossiers = [...dossiers].sort((a, b) => b.dateMaj.localeCompare(a.dateMaj)).slice(0, 5);
const topMandataires = [...mandataires].sort((a, b) => (b.caTotal || 0) - (a.caTotal || 0)).slice(0, 5);

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Dashboard() {
  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Header */}
        <motion.div variants={item}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d'ensemble du réseau HUNTERS</p>
        </motion.div>

        {/* KPIs */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="CA Réseau" value={`${(caReseau / 1000).toFixed(1)}k €`} change={12} icon={TrendingUp} variant="gold" />
          <StatCard label="Dossiers actifs" value={dossiersActifs} change={8} icon={FolderOpen} />
          <StatCard label="Mandataires actifs" value={mandataires.filter(m => m.status === 'actif').length} icon={Users} variant="info" />
          <StatCard label="Dossiers signés" value={dossiersSigne} change={25} icon={FileCheck} variant="success" />
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent dossiers */}
          <motion.div variants={item} className="lg:col-span-2 bg-card rounded-xl border shadow-card">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-heading text-lg font-semibold text-foreground">Derniers dossiers mis à jour</h2>
              <a href="/dossiers" className="text-sm text-accent hover:underline flex items-center gap-1">
                Voir tout <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="divide-y">
              {recentDossiers.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.clientName}</p>
                      <p className="text-xs text-muted-foreground">{d.mandataireName} · {d.ville}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground hidden sm:block">
                      {d.budget.toLocaleString('fr-FR')} €
                    </span>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top mandataires */}
          <motion.div variants={item} className="bg-card rounded-xl border shadow-card">
            <div className="p-5 border-b">
              <h2 className="font-heading text-lg font-semibold text-foreground">Top Mandataires</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Par chiffre d'affaires généré</p>
            </div>
            <div className="divide-y">
              {topMandataires.map((m, idx) => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="text-xs font-bold text-accent w-5">{idx + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-foreground">{m.name.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.zone}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{((m.caTotal || 0) / 1000).toFixed(1)}k €</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Commissions summary */}
        <motion.div variants={item} className="bg-gradient-navy rounded-xl p-6 text-sidebar-accent-foreground">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-sidebar-foreground">Commissions réseau dues au siège ce mois</p>
              <p className="text-3xl font-heading font-bold text-gradient-gold mt-1">
                {commissionsTotal.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-sidebar-foreground">Mandataires à jour</p>
                <p className="text-lg font-semibold">{mandataires.filter(m => m.abonnementStatus === 'actif').length}/{mandataires.length}</p>
              </div>
              <div>
                <p className="text-xs text-sidebar-foreground">Impayés</p>
                <p className="text-lg font-semibold text-destructive">{mandataires.filter(m => m.abonnementStatus === 'impaye').length}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
