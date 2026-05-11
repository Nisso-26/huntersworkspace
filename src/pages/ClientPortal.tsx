import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPortalData } from '@/hooks/use-client-portal';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, FileText, Home, HardHat, Calculator, Calendar, MessageSquare, TrendingUp, Star, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import huntersLogo from '@/assets/hunters-logo.jpg';

const PIPELINE_STEPS = [
  { key: 'nouveau', label: 'Nouveau', icon: '📋' },
  { key: 'conseil', label: 'Conseil', icon: '💬' },
  { key: 'chasse', label: 'Chasse', icon: '🔍' },
  { key: 'visite', label: 'Visites', icon: '🏠' },
  { key: 'offre', label: 'Offre', icon: '📝' },
  { key: 'compromis', label: 'Compromis', icon: '🤝' },
  { key: 'signe', label: 'Acte signé', icon: '✅' },
];

function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const r = rate / 12;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

function ResultCard({ label, value, positive, highlight }: { label: string; value: string; positive?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 text-center border ${highlight ? 'bg-primary text-white border-primary/20' : 'bg-card border-border/60'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${highlight ? 'text-white/60' : 'text-muted-foreground'}`}>{label}</p>
      <p className={`text-base font-bold font-heading ${highlight ? 'text-accent' : positive === false ? 'text-destructive' : positive === true ? 'text-hunters-success' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [apport, setApport] = useState(0);
  const [taux, setTaux] = useState(3.5);
  const [duree, setDuree] = useState(20);
  const [charges, setCharges] = useState(200);
  const [vacance, setVacance] = useState(5);
  const [expandedRec, setExpandedRec] = useState<number | null>(0);

  useEffect(() => {
    if (!token) return;
    fetchPortalData(token)
      .then(setData)
      .catch(e => {
        const msg = e.message || '';
        if (msg.includes('expiré') || msg.includes('expired') || msg.includes('invalid')) {
          setError("Ce lien d'accès a expiré ou n'est plus valide. Contactez votre conseiller pour en obtenir un nouveau.");
        } else {
          setError('Impossible de charger votre espace. Veuillez réessayer ou contacter votre conseiller.');
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleComment = async () => {
    if (!comment.trim() || !data) return;
    setSending(true);
    try {
      const { error: err } = await supabase.from('client_comments').insert({
        dossier_id: data.dossier.id,
        token_id: data.token.id,
        content: comment.trim(),
      } as any);
      if (err) throw err;
      toast.success('Message envoyé avec succès');
      setComment('');
    } catch { toast.error('Erreur lors de l\'envoi'); }
    setSending(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Chargement de votre espace...</p>
      </div>
    </div>
  );

  if (error || !data?.dossier) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </div>
      <h1 className="text-lg font-bold text-foreground mb-2">Accès non disponible</h1>
      <p className="text-muted-foreground text-sm max-w-xs">{error || 'Ce lien est invalide ou a expiré.'}</p>
    </div>
  );

  const { dossier, biens, chantiers, lots, documents, evenements } = data;
  const currentStepIndex = PIPELINE_STEPS.findIndex(s => s.key === dossier.status);
  const progressPercent = Math.round(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100);
  const mainBien = biens[0];
  const prixRevient = mainBien ? (Number(mainBien.prix_acquisition) + Number(mainBien.frais_notaire) + Number(mainBien.budget_travaux)) : 0;
  const loyerMensuel = mainBien ? Number(mainBien.loyer_mensuel_cible) : 0;
  const montantEmprunte = Math.max(0, prixRevient - apport);
  const mensualite = montantEmprunte > 0 ? pmt(taux / 100, duree * 12, montantEmprunte) : 0;
  const loyerEffectif = loyerMensuel * (1 - vacance / 100);
  const cashFlow = loyerEffectif - mensualite - charges;
  const rentaBrute = prixRevient > 0 ? ((loyerMensuel * 12) / prixRevient) * 100 : 0;
  const futureEvents = evenements.filter((e: any) => new Date(e.date_debut) > new Date());

  return (
    <div className="min-h-screen bg-background">
      {/* Header premium */}
      <header className="bg-gradient-hunters sticky top-0 z-50 shadow-sidebar">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/10">
              <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm font-heading tracking-wide">HUNTERS</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/90 text-xs font-semibold">{data.token.client_name}</p>
            <p className="text-white/50 text-[10px]">Espace client sécurisé</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Progression */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="label-premium">Avancement du dossier</p>
              <h2 className="font-heading font-bold text-foreground text-lg mt-0.5">{dossier.client_name}</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary font-heading">{progressPercent}%</p>
              <p className="text-xs text-muted-foreground">complété</p>
            </div>
          </div>

          {/* Barre de progression */}
          <div className="h-2 bg-secondary rounded-full mb-5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>

          {/* Étapes */}
          <div className="flex items-start justify-between">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all
                  ${i < currentStepIndex ? 'bg-primary text-white' :
                    i === currentStepIndex ? 'bg-accent text-accent-foreground shadow-gold ring-2 ring-accent/30' :
                    'bg-secondary text-muted-foreground'}`}>
                  {i < currentStepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                    i === currentStepIndex ? <span className="text-[10px] font-bold">{i + 1}</span> :
                    <span className="text-[10px]">{i + 1}</span>}
                </div>
                <span className={`text-[9px] text-center leading-tight hidden sm:block
                  ${i === currentStepIndex ? 'text-accent font-semibold' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Onglets */}
        <Tabs defaultValue="biens" className="w-full">
          <TabsList className="w-full grid grid-cols-5 bg-card border border-border/60 shadow-card p-1 rounded-xl h-auto">
            {[
              { value: 'strategie', icon: TrendingUp, label: 'Stratégie' },
              { value: 'biens', icon: Home, label: 'Biens' },
              { value: 'simulation', icon: Calculator, label: 'Simulation' },
              { value: 'chantier', icon: HardHat, label: 'Travaux' },
              { value: 'documents', icon: FileText, label: 'Docs' },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg"
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>


          {/* Stratégie d'investissement */}
          <TabsContent value="strategie" className="mt-4">
            {!data.strategie ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card p-8 text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">Stratégie en cours d'élaboration</p>
                <p className="text-xs text-muted-foreground">Votre conseiller Hunters prépare une stratégie personnalisée basée sur votre profil.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Synthèse */}
                <div className="bg-card rounded-xl border border-border/60 shadow-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Star className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Synthèse de votre stratégie</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{data.strategie.synthese}</p>
                  {data.strategie.profil_investisseur && (
                    <p className="text-xs text-muted-foreground italic mt-2">{data.strategie.profil_investisseur}</p>
                  )}
                </div>

                {/* Indicateurs */}
                {data.strategie.indicateurs_cles && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Capacité d'emprunt', value: `${(data.strategie.indicateurs_cles.capacite_emprunt_estimee || 0).toLocaleString('fr-FR')} €` },
                      { label: 'Cash-flow libre', value: `${(data.strategie.indicateurs_cles.cash_flow_mensuel_libre || 0).toLocaleString('fr-FR')} €/mois` },
                    ].map(ind => (
                      <div key={ind.label} className="bg-secondary/50 rounded-xl p-3 text-center border border-border/40">
                        <p className="text-[10px] text-muted-foreground">{ind.label}</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">{ind.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommandations */}
                {data.strategie.recommandations?.map((rec: any, idx: number) => (
                  <div key={idx} className="bg-card rounded-xl border border-border/60 shadow-card overflow-hidden">
                    <button
                      onClick={() => setExpandedRec(expandedRec === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {rec.rang}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{rec.titre}</p>
                          <p className="text-xs text-muted-foreground">{rec.dispositif}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-accent">{rec.rendement_brut_estime_pct}%</span>
                        {expandedRec === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {expandedRec === idx && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border/40 bg-secondary/10">
                        <p className="text-sm text-foreground leading-relaxed pt-3">{rec.description}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Budget', value: `${(rec.budget_acquisition_total || 0).toLocaleString('fr-FR')} €` },
                            { label: 'Apport', value: `${(rec.apport_recommande || 0).toLocaleString('fr-FR')} €` },
                            { label: 'Cash-flow net', value: `${(rec.cash_flow_net_mensuel_estime || 0).toLocaleString('fr-FR')} €/mois` },
                            { label: 'Éco. fiscale/an', value: `${(rec.economie_fiscale_annuelle_estimee || 0).toLocaleString('fr-FR')} €` },
                          ].map(item => (
                            <div key={item.label} className="bg-card border border-border/40 rounded-lg p-2">
                              <p className="text-[10px] text-muted-foreground">{item.label}</p>
                              <p className="text-sm font-semibold text-foreground">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        {rec.avantages?.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-green-600 mb-1">✓ Avantages</p>
                            <ul className="space-y-0.5">
                              {rec.avantages.map((a: string, i: number) => <li key={i} className="text-xs text-foreground">• {a}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Disclaimer */}
                <p className="text-[10px] text-muted-foreground italic text-center px-4">
                  Cette analyse est fournie à titre indicatif par Hunters Immobilier dans le cadre d'un accompagnement personnalisé.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Biens */}
          <TabsContent value="biens" className="mt-4 space-y-3">
            {biens.length === 0 ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
                <Home className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun bien associé pour le moment.</p>
              </div>
            ) : biens.map((b: any) => (
              <div key={b.id} className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-foreground">{b.reference}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.type} · {b.ville} {b.code_postal}</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">{b.statut}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Surface', value: `${b.surface} m²` },
                    { label: 'Prix', value: `${Number(b.prix_acquisition).toLocaleString('fr-FR')} €` },
                    { label: 'Travaux', value: `${Number(b.budget_travaux).toLocaleString('fr-FR')} €` },
                    { label: 'Loyer cible', value: `${Number(b.loyer_mensuel_cible).toLocaleString('fr-FR')} €/mois` },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/50 rounded-lg p-2.5">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Simulation */}
          <TabsContent value="simulation" className="mt-4">
            {!mainBien ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
                <Calculator className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun bien pour la simulation.</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5 space-y-5">
                <div>
                  <p className="label-premium mb-1">Simulateur de rentabilité</p>
                  <h3 className="font-heading font-bold text-foreground">Personnalisez votre financement</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Apport (€)', value: apport, setter: setApport, step: 1000 },
                    { label: 'Taux (%)', value: taux, setter: setTaux, step: 0.1 },
                    { label: 'Durée (ans)', value: duree, setter: setDuree, step: 1 },
                    { label: 'Charges (€/mois)', value: charges, setter: setCharges, step: 50 },
                    { label: 'Vacance (%)', value: vacance, setter: setVacance, step: 1 },
                  ].map(field => (
                    <div key={field.label} className="space-y-1">
                      <Label className="label-premium">{field.label}</Label>
                      <Input
                        type="number"
                        step={field.step}
                        value={field.value}
                        onChange={e => field.setter(Number(e.target.value))}
                        className="h-9 text-sm bg-secondary/40 border-border/60"
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <ResultCard label="Prix de revient" value={`${prixRevient.toLocaleString('fr-FR')} €`} />
                  <ResultCard label="Mensualité" value={`${Math.round(mensualite).toLocaleString('fr-FR')} €`} />
                  <ResultCard label="Cash-flow net" value={`${Math.round(cashFlow).toLocaleString('fr-FR')} €/mois`} positive={cashFlow >= 0} highlight />
                  <ResultCard label="Rentabilité brute" value={`${rentaBrute.toFixed(2)} %`} />
                </div>
              </div>
            )}
          </TabsContent>

          {/* Chantier */}
          <TabsContent value="chantier" className="mt-4 space-y-3">
            {chantiers.length === 0 ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
                <HardHat className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun chantier en cours.</p>
              </div>
            ) : chantiers.map((c: any) => {
              const cLots = lots.filter((l: any) => l.chantier_id === c.id);
              const avgProgress = cLots.length > 0 ? Math.round(cLots.reduce((s: number, l: any) => s + (l.avancement || 0), 0) / cLots.length) : 0;
              return (
                <div key={c.id} className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{c.reference}</p>
                    <Badge className="bg-hunters-warning/10 text-hunters-warning border-hunters-warning/20 text-[10px]">{c.statut}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Avancement global</span><span className="font-bold text-foreground">{avgProgress}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all" style={{ width: `${avgProgress}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Budget', value: `${Number(c.budget_alloue).toLocaleString('fr-FR')} €` },
                      { label: 'Lots', value: cLots.length },
                    ].map(item => (
                      <div key={item.label} className="bg-secondary/50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-bold text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4 space-y-2">
            {documents.length === 0 ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucun document disponible.</p>
              </div>
            ) : documents.map((d: any) => (
              <div key={d.id} className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground flex-1 truncate font-medium">{d.file_name}</span>
                <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </TabsContent>

          {/* Échéances */}
          <TabsContent value="echeances" className="mt-4 space-y-2">
            {futureEvents.length === 0 ? (
              <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Aucune échéance à venir.</p>
              </div>
            ) : futureEvents.map((e: any) => (
              <div key={e.id} className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{e.titre}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.date_debut).toLocaleDateString('fr-FR')} · {e.lieu || ''}</p>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>

        {/* Commentaire */}
        <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-5 space-y-3">
          <div>
            <p className="label-premium mb-0.5">Votre message</p>
            <h3 className="font-heading font-bold text-foreground text-sm">Laisser un commentaire</h3>
          </div>
          <Textarea
            placeholder="Partagez vos questions ou remarques avec votre conseiller..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="min-h-[80px] bg-secondary/30 border-border/60 resize-none"
          />
          <Button
            onClick={handleComment}
            disabled={!comment.trim() || sending}
            className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {sending ? 'Envoi...' : 'Envoyer le message'}
          </Button>
        </div>

        <footer className="text-center text-[11px] text-muted-foreground py-4 space-y-1">
          <p className="font-semibold text-foreground/60">HUNTERS Immobilier · Tours</p>
          <p>© {new Date().getFullYear()} · Espace client sécurisé · Informations mises à jour en temps réel</p>
        </footer>
      </main>
    </div>
  );
}
