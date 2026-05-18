import { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Search, Download, FileText, FileSpreadsheet, Globe, BookOpen, Wrench, TrendingUp, Tag, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──
interface Doc {
  id: string;
  cat: 'client' | 'proc' | 'fin';
  name: string;
  ref: string;
  file: string;
  type: 'docx' | 'xlsx' | 'html' | 'pdf' | 'pptx';
  tags: string[];
  desc: string;
  details: string;
  usage: string;
  pages?: string;
  version: string;
  size: string;
  isNew?: boolean;
  adminOnly?: boolean;
}

// ── Catalogue ──
const DOCS: Doc[] = [
  // Documents clients
  {
    id: 'mandat_chasse', cat: 'client', name: 'Mandat de Recherche — Chasse Immobilière',
    ref: 'Mandat_Recherche_Hunters_2026.docx', file: 'Mandat_Recherche_Hunters_2026.docx', type: 'docx',
    tags: ['legal'], desc: 'Mandat exclusif conforme loi Hoguet. Clause de protection des honoraires, durée 90 jours renouvelable.',
    details: 'Contient : identification parties, mission détaillée, critères de recherche (CDC), honoraires TTC, clauses de résiliation, mentions légales obligatoires (Hoguet + RGPD). Validé par juriste.',
    usage: 'Remis et signé au 1er rendez-vous conseil — obligatoire avant toute action de chasse', pages: '3 pages', version: 'v2.0 — 2026', size: '42 Ko',
  },
  {
    id: 'cdc_client', cat: 'client', name: 'Cahier des Charges Client',
    ref: 'CDC_Client_Hunters_2026.docx', file: 'CDC_Client_Hunters_2026.docx', type: 'docx',
    tags: ['terrain'], desc: 'Recueil structuré des critères d\'investissement. Méthode MoSCoW intégrée pour prioriser les exigences.',
    details: 'Sections : profil investisseur, capacité financière, objectifs patrimoniaux, critères bien (Must/Should/Could/Won\'t), contraintes géographiques, horizon de détention.',
    usage: 'Complété lors du 1er entretien conseil — base de la mission de chasse', pages: '4 pages', version: 'v1.0 — 2026', size: '38 Ko',
  },
  {
    id: 'rapport_visite', cat: 'client', name: 'Rapport de Visite',
    ref: 'Rapport_Visite_Hunters_2026.docx', file: 'Rapport_Visite_Hunters_2026.docx', type: 'docx',
    tags: ['terrain'], desc: 'Compte rendu détaillé post-visite avec analyse comparative et recommandation. Remis sous 24h.',
    details: 'Contient : fiche bien (adresse, surface, DPE), photos commentées, grille notation 5 critères, analyse conformité CDC, estimation travaux, avis conseiller, décision recommandée.',
    usage: 'Envoyé au client dans les 24h après chaque visite', pages: '5 pages', version: 'v1.0 — 2026', size: '45 Ko',
  },
  {
    id: 'lettre_mission', cat: 'client', name: 'Lettre de Mission — Suivi Travaux',
    ref: 'Lettre_Mission_Travaux_Hunters.docx', file: 'Lettre_Mission_Travaux_Hunters.docx', type: 'docx',
    tags: ['legal'], desc: 'Lettre de mission pour le service de coordination et suivi de travaux post-acquisition.',
    details: 'Définit le périmètre de la mission travaux, les honoraires de suivi (% du budget), les responsabilités, les livrables attendus (rapports hebdo, réception).',
    usage: 'Signé après compromis si mission travaux confiée à Hunters', pages: '2 pages', version: 'v1.0 — 2026', size: '28 Ko',
  },
  {
    id: 'cr_conseil', cat: 'client', name: 'Compte Rendu de Conseil',
    ref: 'CR_Conseil_Hunters_2026.docx', file: 'CR_Conseil_Hunters_2026.docx', type: 'docx',
    tags: ['legal', 'terrain'], desc: 'Synthèse du rendez-vous conseil avec stratégie recommandée, budget validé et prochaines étapes.',
    details: 'Sections : rappel profil, stratégie retenue, simulation financière simplifiée, zones ciblées, budget validé, prochaines étapes, signature client.',
    usage: 'Remis au client à la fin du rendez-vous conseil — trace écrite de la recommandation', pages: '3 pages', version: 'v1.0 — 2026', size: '35 Ko',
  },

  // Procédures internes
  {
    id: 'p01_accueil', cat: 'proc', name: 'P01 — Accueil & Qualification Prospect',
    ref: 'P01_Accueil_Qualification.docx', file: 'P01_Accueil_Qualification.docx', type: 'docx',
    tags: ['proc'], desc: 'Procédure complète d\'accueil et qualification d\'un nouveau prospect. Score de faisabilité intégré.',
    details: 'Étapes : prise de contact (script téléphonique), qualification financière (5 critères), score faisabilité (0-100), décision go/no-go, planification RDV conseil.',
    usage: 'Usage interne conseiller — référence P01 v1.0', pages: '6 pages', version: 'v1.0 — 2026', size: '22 Ko', adminOnly: false,
  },
  {
    id: 'p02_chasse', cat: 'proc', name: 'P02 — Mission de Chasse Immobilière',
    ref: 'P02_Mission_Chasse.docx', file: 'P02_Mission_Chasse.docx', type: 'docx',
    tags: ['proc'], desc: 'Procédure opérationnelle complète de la mission chasse : 7 étapes du mandat à l\'acte authentique.',
    details: 'Étapes : Mandat → CDC (MoSCoW) → Activation sources → Présélection (grille 5 niveaux, max 3 biens) → Visite + rapport 24h → Négociation + offre écrite → Suivi acte.',
    usage: 'Usage interne conseiller — référence P02 v1.0', pages: '9 pages', version: 'v1.0 — 2026', size: '27 Ko',
  },
  {
    id: 'p03_negociation', cat: 'proc', name: 'P03 — Négociation & Offre d\'Achat',
    ref: 'P03_Negociation_Offre.docx', file: 'P03_Negociation_Offre.docx', type: 'docx',
    tags: ['proc', 'legal'], desc: 'Script et procédure de négociation. Rédaction et transmission de l\'offre d\'achat écrite.',
    details: 'Contient : analyse de marge de négociation, arguments tactiques, modèle offre d\'achat, délais légaux, conditions suspensives recommandées.',
    usage: 'Usage interne conseiller — déclenché quand bien sélectionné par client', pages: '7 pages', version: 'v1.0 — 2026', size: '24 Ko',
  },
  {
    id: 'p04_compromis', cat: 'proc', name: 'P04 — Suivi Compromis & Financement',
    ref: 'P04_Compromis_Financement.docx', file: 'P04_Compromis_Financement.docx', type: 'docx',
    tags: ['proc', 'legal'], desc: 'Checklist et procédure de suivi entre compromis et acte authentique. Points de contrôle financement.',
    details: 'Checklist 28 points : conditions suspensives, délais légaux, suivi financement (3 banques minimum), coordination notaire, points de blocage fréquents et solutions.',
    usage: 'Usage interne conseiller — actif dès signature compromis', pages: '8 pages', version: 'v1.0 — 2026', size: '26 Ko',
  },
  {
    id: 'p05_travaux', cat: 'proc', name: 'P05 — Coordination & Suivi Travaux',
    ref: 'P05_Suivi_Travaux.docx', file: 'P05_Suivi_Travaux.docx', type: 'docx',
    tags: ['proc'], desc: 'Procédure de coordination des artisans et suivi de chantier. Rapport hebdomadaire client inclus.',
    details: 'Sélection artisans, comparaison devis (grille), planning chantier, rapport photo hebdomadaire, réception des travaux, levée des réserves.',
    usage: 'Usage interne conseiller + décoratrice — post-acquisition', pages: '7 pages', version: 'v1.0 — 2026', size: '25 Ko',
  },
  {
    id: 'p06_location', cat: 'proc', name: 'P06 — Mise en Location',
    ref: 'P06_Mise_Location.docx', file: 'P06_Mise_Location.docx', type: 'docx',
    tags: ['proc', 'legal'], desc: 'Procédure complète de mise en location : annonce, sélection locataire, état des lieux.',
    details: 'Rédaction annonce optimisée, critères sélection locataire, dossier locataire complet, bail type ALUR, état des lieux d\'entrée, remise des clés.',
    usage: 'Usage interne conseiller — déclenché après travaux ou acte si location directe', pages: '8 pages', version: 'v1.0 — 2026', size: '28 Ko',
  },
  {
    id: 'p07_reporting', cat: 'proc', name: 'P07 — Reporting Mensuel Mandataire',
    ref: 'P07_Reporting_Mensuel.docx', file: 'P07_Reporting_Mensuel.docx', type: 'docx',
    tags: ['proc'], desc: 'Procédure et template de rapport mensuel d\'activité mandataire. Indicateurs KPI Hunters.',
    details: 'KPIs : prospects qualifiés, mandats actifs, visites réalisées, offres déposées, compromis signés, CA généré. Analyse et objectifs mois suivant.',
    usage: 'Usage interne conseiller — soumis au directeur le 1er de chaque mois', pages: '4 pages', version: 'v1.0 — 2026', size: '20 Ko', adminOnly: true,
  },

  // Outils financiers
  {
    id: 'calc_excel', cat: 'fin', name: 'Calculateur de Rentabilité',
    ref: 'Calculateur_Rentabilite_Hunters_2026.xlsx', file: 'Calculateur_Rentabilite_Hunters_2026.xlsx', type: 'xlsx',
    tags: ['fin', 'terrain'], desc: 'Calculateur Excel avec barème Hunters automatique, projection sur 20 ans, cashflow mensuel.',
    details: 'Paramètres : prix FAI, travaux, financement, loyer, charges. Barème automatique intégré. Graphique projection 20 ans. Comparaison 3 scénarios.',
    usage: 'Utilisation client — envoi par email ou présentation en rendez-vous', pages: '3 onglets', version: 'v2.0 — 2026', size: '18 Ko',
  },
  {
    id: 'calc_html', cat: 'fin', name: 'Calculateur de Rentabilité Web',
    ref: 'Calculateur_Hunters_2026.html', file: 'Calculateur_Hunters_2026.html', type: 'html',
    tags: ['fin', 'terrain'], desc: 'Application web autonome sans serveur. 3 onglets interactifs : calcul temps réel, projection 20 ans.',
    details: 'Fonctionne hors ligne — ouvrir dans Chrome. Barème officiel Hunters intégré. Alertes conformité CDC automatiques. Déployable sur Netlify en 30 secondes.',
    usage: 'Partage client via lien ou fichier — utilisation en rendez-vous', pages: '3 onglets', version: 'v1.0 — 2026', size: '33 Ko',
  },
  {
    id: 'carte', cat: 'fin', name: 'Carte Interactive 10 Secteurs',
    ref: 'carte_hunters_secteurs.html', file: 'carte_hunters_secteurs.html', type: 'html',
    tags: ['fin', 'terrain'], desc: 'Carte interactive des 10 secteurs Hunters avec prix au m², rendements et caractéristiques.',
    details: 'Phase 1 (Tours + agglo proches) et Phase 2 (Touraine élargie). Prix m², rendement brut, profil locataire cible par secteur.',
    usage: 'Présentation client — support visuel entretien conseil', pages: 'Application web', version: 'v1.0 — 2026', size: '18 Ko',
  },
];

// ── Métadonnées catégories ──
const CAT_META = {
  client: { label: 'Documents clients', icon: FileText, color: 'text-[#1A4D2E]', bg: 'bg-[#E8F2EC]', desc: 'Remis et signés avec le client à chaque étape' },
  proc:   { label: 'Procédures internes', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Référentiels opérationnels — usage conseiller' },
  fin:    { label: 'Outils financiers', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Calcul, analyse et pilotage d\'activité' },
};

const TYPE_COLORS: Record<string, string> = {
  docx: 'bg-[#E8F2EC] text-[#1A4D2E] border border-[#1A4D2E]/20',
  xlsx: 'bg-green-100 text-green-700 border border-green-200',
  html: 'bg-orange-100 text-orange-700 border border-orange-200',
  pdf:  'bg-red-100 text-red-700 border border-red-200',
  pptx: 'bg-pink-100 text-pink-700 border border-pink-200',
};

// ── Composant carte document ──
function DocCard({ doc, onDetail }: { doc: Doc; onDetail: (d: Doc) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3 hover:shadow-card-hover hover:-translate-y-px transition-all duration-150 card-hover"
    >
      <div className="flex items-start gap-3">
        <div className={cn('px-2 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0', TYPE_COLORS[doc.type] || 'bg-secondary text-foreground')}>
          {doc.type.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-foreground leading-tight">{doc.name}</p>
            {doc.isNew && (
              <span className="text-[9px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded flex-shrink-0">NOUVEAU</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{doc.ref}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{doc.desc}</p>

      <div className="flex items-center gap-1.5 flex-wrap">
        {doc.tags.includes('legal') && (
          <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">Légal</span>
        )}
        {doc.tags.includes('fin') && (
          <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded font-medium">Finance</span>
        )}
        {doc.tags.includes('terrain') && (
          <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-medium">Terrain</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground">{doc.size} · {doc.version}</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => onDetail(doc)}
            className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-secondary"
          >
            Détails
          </button>
          <a
            href={doc.file}
            download={doc.file}
            className="flex items-center gap-1 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-white px-2.5 py-1 rounded transition-colors"
          >
            <Download className="w-3 h-3" />
            Télécharger
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Modal détail ──
function DocModal({ doc, onClose }: { doc: Doc; onClose: () => void }) {
  const meta = CAT_META[doc.cat];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border/60 shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border/40">
          <div className="flex items-start gap-3">
            <div className={cn('px-2 py-1.5 rounded-lg text-[10px] font-bold flex-shrink-0', TYPE_COLORS[doc.type])}>
              {doc.type.toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading font-bold text-foreground text-base">{doc.name}</h2>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{doc.ref}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{doc.details}</p>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Catégorie', value: meta.label },
              { label: 'Format', value: doc.type.toUpperCase() },
              { label: 'Version', value: doc.version },
              { label: 'Taille', value: doc.size },
              ...(doc.pages ? [{ label: 'Volume', value: doc.pages }] : []),
            ].map(item => (
              <div key={item.label} className="bg-secondary/40 rounded-lg p-2.5">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Quand l'utiliser</p>
            <p className="text-xs text-foreground">{doc.usage}</p>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-border/40">
          <a
            href={doc.file}
            download={doc.file}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Télécharger
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-border/60 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ──
export default function Ressources() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return DOCS.filter(doc => {
      // Masquer les docs adminOnly pour les conseillers
      if (doc.adminOnly && !isAdmin) return false;
      // Filtre catégorie
      if (catFilter !== 'all' && doc.cat !== catFilter) return false;
      // Filtre type
      if (typeFilter && doc.type !== typeFilter) return false;
      // Recherche
      if (q && !doc.name.toLowerCase().includes(q) && !doc.desc.toLowerCase().includes(q) && !doc.ref.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, catFilter, typeFilter, isAdmin]);

  const counts = useMemo(() => ({
    all: DOCS.filter(d => !d.adminOnly || isAdmin).length,
    client: DOCS.filter(d => d.cat === 'client').length,
    proc: DOCS.filter(d => d.cat === 'proc' && (!d.adminOnly || isAdmin)).length,
    fin: DOCS.filter(d => d.cat === 'fin').length,
  }), [isAdmin]);

  // Grouper par catégorie
  const grouped = useMemo(() => {
    const groups: Record<string, Doc[]> = {};
    filtered.forEach(d => {
      if (!groups[d.cat]) groups[d.cat] = [];
      groups[d.cat].push(d);
    });
    return groups;
  }, [filtered]);

  const catOrder: Array<'client' | 'proc' | 'fin'> = ['client', 'proc', 'fin'];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* Header */}
        <div>
          <p className="label-premium mb-1">Base documentaire</p>
          <h1 className="text-2xl font-bold text-foreground font-heading">Ressources Hunters</h1>
          <div className="bar-or mt-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Documents opérationnels, procédures internes et outils financiers du réseau.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Documents total', value: counts.all, icon: BookOpen, color: 'text-primary' },
            { label: 'Docs clients', value: counts.client, icon: FileText, color: 'text-[#1A4D2E]' },
            { label: 'Procédures', value: counts.proc, icon: Wrench, color: 'text-purple-600' },
            { label: 'Outils financiers', value: counts.fin, icon: TrendingUp, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border border-border/60 rounded-xl p-4 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold font-heading text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filtres + recherche */}
        <div className="bg-card border border-border/60 rounded-xl p-4 shadow-card">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Recherche */}
            <div className="flex items-center gap-2 bg-secondary/40 border border-border/60 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un document..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground flex-1"
              />
            </div>

            {/* Filtres catégorie */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'Tous', count: counts.all },
                { key: 'client', label: 'Clients', count: counts.client },
                { key: 'proc', label: 'Procédures', count: counts.proc },
                { key: 'fin', label: 'Financiers', count: counts.fin },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => { setCatFilter(f.key); setTypeFilter(null); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    catFilter === f.key && !typeFilter
                      ? 'bg-primary text-white'
                      : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  {f.label}
                  <span className={cn('text-[10px] px-1 rounded', catFilter === f.key && !typeFilter ? 'bg-white/20' : 'bg-secondary')}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filtres type */}
            <div className="flex gap-1.5">
              {['docx', 'xlsx', 'html'].map(type => (
                <button
                  key={type}
                  onClick={() => { setTypeFilter(typeFilter === type ? null : type); setCatFilter('all'); }}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors',
                    typeFilter === type
                      ? TYPE_COLORS[type]
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  )}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultats */}
        {filtered.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-xl p-12 text-center shadow-card">
            <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun document trouvé pour cette recherche.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {catOrder.filter(cat => grouped[cat]?.length > 0).map(cat => {
              const meta = CAT_META[cat];
              const Icon = meta.icon;
              return (
                <div key={cat}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', meta.bg)}>
                      <Icon className={cn('w-4 h-4', meta.color)} />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-foreground text-sm">{meta.label}</h2>
                      <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
                    </div>
                    <span className="ml-auto text-[11px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {grouped[cat].length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grouped[cat].map(doc => (
                      <DocCard key={doc.id} doc={doc} onDetail={setSelectedDoc} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Note stockage */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Les fichiers seront téléchargeables une fois uploadés dans Supabase Storage.
            Contactez votre directeur pour obtenir les fichiers par email en attendant.
          </p>
        </div>
      </div>

      {/* Modal */}
      {selectedDoc && <DocModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </AppLayout>
  );
}
