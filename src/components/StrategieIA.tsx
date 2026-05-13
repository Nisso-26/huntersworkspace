import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dossier } from '@/hooks/use-dossiers';
import { useUpdateDossier } from '@/hooks/use-dossiers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Loader2, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Info, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportStrategiePdf } from '@/lib/export-strategie-pdf';
import {
  parseStrategie,
  STRATEGIE_ERROR_MESSAGES,
  type StrategieData,
} from '@/lib/strategie-parser';

interface Props {
  dossier: Dossier;
}

const fmt = (v: number) => v?.toLocaleString('fr-FR') ?? '0';

export default function StrategieIA({ dossier }: Props) {
  const updateMut = useUpdateDossier();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [expanded, setExpanded] = useState<number | null>(0);

  // Parsing strict, tolérant et non-bloquant — voir src/lib/strategie-parser.ts
  const parsed = parseStrategie(dossier.strategie);
  const strategie: StrategieData | null = parsed.strategie;
  const parseError = parsed.error;
  const isPlainText = parsed.isPlainText;
  const rawText = parsed.rawText;


  const [form, setForm] = useState({
    age: '',
    situation_familiale: '',
    enfants: '0',
    profession: '',
    statut_pro: '',
    revenus_nets_mensuels: '',
    revenus_conjoint_mensuels: '',
    autres_revenus_mensuels: '',
    tmi: '',
    charges_mensuelles: '',
    mensualites_credits: '',
    loyer_mensuel: '',
    epargne_disponible: '',
    capacite_epargne: '',
    patrimoine_immo: '',
    taux_credit: '3.8',
    duree_credit: '20',
    objectifs: '',
    horizon: '',
    revenu_cible: '',
    implication: '',
    tolerance_risque: '',
    zones_souhaitees: '',
    types_biens: '',
    delai_decision: '',
  });

  const handleExportPdf = async () => {
    if (!strategie) return;
    setExporting(true);
    try {
      const conseiller = user?.user_metadata?.full_name || user?.email || 'Hunters Immobilier';
      await exportStrategiePdf(strategie, dossier.client_name, conseiller, dossier.numero_dossier);
    } catch (e) {
      console.error('Export PDF error:', e);
    } finally {
      setExporting(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('generate-strategie', {
        body: {
          client_name: dossier.client_name,
          ville: dossier.ville,
          budget: dossier.budget,
          notes: dossier.notes,
          ...form,
        },
      });

      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de génération');

      const strategieJson = JSON.stringify(res.data.strategie);
      await updateMut.mutateAsync({ id: dossier.id, strategie: strategieJson });
      toast.success('Stratégie générée avec succès');
      setShowForm(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Stratégie patrimoniale
        </h3>
        <div className="flex gap-2">
          {strategie && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
              className="gap-2 border-border/60"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Export...' : 'PDF'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <FileText className="w-3.5 h-3.5" />
            {strategie ? 'Régénérer' : 'Générer la stratégie'}
          </Button>
        </div>
      </div>

      {/* Formulaire de saisie */}
      {showForm && (
        <div className="bg-secondary/30 rounded-lg p-4 space-y-4 border">
          <p className="text-xs text-muted-foreground">Complétez le profil financier du client pour une stratégie précise. Les champs marqués * sont importants.</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Âge *</Label>
              <Input type="number" placeholder="42" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Situation familiale</Label>
              <Select value={form.situation_familiale} onValueChange={v => setForm(f => ({ ...f, situation_familiale: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {['Célibataire', 'Marié(e)', 'Pacsé(e)', 'Divorcé(e)', 'Veuf/veuve'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Enfants à charge</Label>
              <Input type="number" placeholder="0" value={form.enfants} onChange={e => setForm(f => ({ ...f, enfants: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">TMI (%) *</Label>
              <Select value={form.tmi} onValueChange={v => setForm(f => ({ ...f, tmi: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="%" /></SelectTrigger>
                <SelectContent>
                  {['0', '11', '30', '41', '45'].map(t => (
                    <SelectItem key={t} value={t}>{t}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profession</Label>
              <Input placeholder="Cadre supérieur" value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Statut professionnel</Label>
              <Select value={form.statut_pro} onValueChange={v => setForm(f => ({ ...f, statut_pro: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  {['Salarié CDI', 'Fonctionnaire', 'TNS', 'Gérant', 'Retraité', 'Autre'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-foreground mb-2">Finances (€/mois)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Revenus nets *</Label>
                <Input type="number" placeholder="4500" value={form.revenus_nets_mensuels} onChange={e => setForm(f => ({ ...f, revenus_nets_mensuels: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Revenus conjoint</Label>
                <Input type="number" placeholder="0" value={form.revenus_conjoint_mensuels} onChange={e => setForm(f => ({ ...f, revenus_conjoint_mensuels: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Charges courantes</Label>
                <Input type="number" placeholder="1200" value={form.charges_mensuelles} onChange={e => setForm(f => ({ ...f, charges_mensuelles: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mensualités crédits</Label>
                <Input type="number" placeholder="500" value={form.mensualites_credits} onChange={e => setForm(f => ({ ...f, mensualites_credits: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Épargne disponible (€)</Label>
                <Input type="number" placeholder="30000" value={form.epargne_disponible} onChange={e => setForm(f => ({ ...f, epargne_disponible: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Capacité épargne/mois</Label>
                <Input type="number" placeholder="800" value={form.capacite_epargne} onChange={e => setForm(f => ({ ...f, capacite_epargne: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Taux crédit (%)</Label>
                <Input type="number" step="0.1" placeholder="3.8" value={form.taux_credit} onChange={e => setForm(f => ({ ...f, taux_credit: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Durée crédit (ans)</Label>
                <Input type="number" placeholder="20" value={form.duree_credit} onChange={e => setForm(f => ({ ...f, duree_credit: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-foreground mb-2">Objectifs & contraintes</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Objectifs *</Label>
                <Textarea placeholder="Revenus complémentaires, défiscalisation, constitution de patrimoine..." value={form.objectifs} onChange={e => setForm(f => ({ ...f, objectifs: e.target.value }))} rows={2} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Horizon</Label>
                <Select value={form.horizon} onValueChange={v => setForm(f => ({ ...f, horizon: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {['Court terme (< 5 ans)', 'Moyen terme (5-10 ans)', 'Long terme (> 10 ans)'].map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Revenu cible/mois (€)</Label>
                <Input type="number" placeholder="500" value={form.revenu_cible} onChange={e => setForm(f => ({ ...f, revenu_cible: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tolérance au risque</Label>
                <Select value={form.tolerance_risque} onValueChange={v => setForm(f => ({ ...f, tolerance_risque: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    {['Faible', 'Modérée', 'Élevée'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Zones souhaitées</Label>
                <Input placeholder="Tours, Lyon, Paris..." value={form.zones_souhaitees} onChange={e => setForm(f => ({ ...f, zones_souhaitees: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Annuler</Button>
            <Button size="sm" onClick={handleGenerate} disabled={generating} className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Génération en cours...</> : <><FileText className="w-3.5 h-3.5" /> Générer</>}
            </Button>
          </div>
        </div>
      )}

      {/* État vide / invalide — non bloquant, avec motif explicite */}
      {!strategie && !showForm && (
        <div className="rounded-lg border border-dashed bg-secondary/20 p-6 text-center space-y-2">
          <TrendingUp className="w-6 h-6 text-accent mx-auto opacity-60" />
          {parseError === 'empty' || parseError === null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Aucune stratégie générée pour ce dossier.
              </p>
              <p className="text-xs text-muted-foreground">
                Cliquez sur « Générer la stratégie » pour lancer l'analyse.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <Info className="w-3.5 h-3.5" />
                {STRATEGIE_ERROR_MESSAGES[parseError]}
              </div>
              {isPlainText && rawText ? (
                <div className="text-left bg-card border rounded p-3 mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Contenu actuel :</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{rawText}</p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Vous pouvez régénérer une stratégie structurée à tout moment.
              </p>
            </>
          )}
        </div>
      )}

      {/* Affichage de la stratégie générée */}
      {strategie && !showForm && (
        <div className="space-y-4">
          {/* Synthèse */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Synthèse</p>
            <p className="text-sm text-foreground leading-relaxed">{strategie.synthese}</p>
            <p className="text-xs text-muted-foreground mt-2 italic">{strategie.profil_investisseur}</p>
          </div>

          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Revenus nets/mois', value: `${fmt(strategie.indicateurs_cles.revenus_nets_totaux_mensuels)} €` },
              { label: 'Taux endettement', value: `${strategie.indicateurs_cles.taux_effort_actuel_pct}%` },
              { label: 'Capacité emprunt', value: `${fmt(strategie.indicateurs_cles.capacite_emprunt_estimee)} €` },
              { label: 'Mensualité max', value: `${fmt(strategie.indicateurs_cles.mensualite_max_supplementaire)} €` },
              { label: 'Cash flow libre', value: `${fmt(strategie.indicateurs_cles.cash_flow_mensuel_libre)} €` },
            ].map((ind) => (
              <div key={ind.label} className="bg-card border rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{ind.label}</p>
                <p className="text-sm font-bold text-foreground mt-1">{ind.value}</p>
              </div>
            ))}
          </div>

          {/* Recommandations */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Recommandations</p>
            {strategie.recommandations.map((rec, idx) => (
              <div key={idx} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {rec.rang}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rec.titre}</p>
                      <p className="text-xs text-muted-foreground">{rec.dispositif}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-accent">{rec.rendement_brut_estime_pct}% brut</span>
                    {expanded === idx ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {expanded === idx && (
                  <div className="px-4 pb-4 space-y-4 border-t bg-secondary/10">
                    <p className="text-sm text-foreground leading-relaxed pt-3">{rec.description}</p>

                    {/* Chiffres clés */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Budget total', value: `${fmt(rec.budget_acquisition_total)} €` },
                        { label: 'Apport recommandé', value: `${fmt(rec.apport_recommande)} €` },
                        { label: 'Mensualité crédit', value: `${fmt(rec.mensualite_credit_estimee)} €/mois` },
                        { label: 'Loyer brut estimé', value: `${fmt(rec.loyer_brut_mensuel_estime)} €/mois` },
                        { label: 'Cash-flow net', value: `${fmt(rec.cash_flow_net_mensuel_estime)} €/mois` },
                        { label: 'Éco. fiscale/an', value: `${fmt(rec.economie_fiscale_annuelle_estimee)} €` },
                      ].map(item => (
                        <div key={item.label} className="bg-card border rounded p-2">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-semibold text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold text-green-600 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Avantages</p>
                        <ul className="space-y-1">
                          {rec.avantages.map((a, i) => <li key={i} className="text-xs text-foreground">• {a}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Points de vigilance</p>
                        <ul className="space-y-1">
                          {rec.points_vigilance.map((p, i) => <li key={i} className="text-xs text-foreground">• {p}</li>)}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">⏱ {rec.horizon_recommande}</span>
                      {rec.zones_suggerees.map((z, i) => (
                        <span key={i} className="text-xs bg-secondary text-foreground px-2 py-1 rounded">📍 {z}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Plan d'action */}
          <div>
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Plan d'action</p>
            <div className="space-y-2">
              {strategie.plan_action.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0">{step.etape}</span>
                    {idx < strategie!.plan_action.length - 1 && <div className="w-px h-4 bg-border mt-1" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-foreground">{step.titre} <span className="text-xs text-accent font-normal">— {step.delai}</span></p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Points d'attention */}
          {strategie.points_attention?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Points d'attention</p>
              <ul className="space-y-1">
                {strategie.points_attention.map((p, i) => <li key={i} className="text-xs text-amber-800">• {p}</li>)}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground italic border-t pt-3">
            Cette analyse est fournie à titre indicatif par Hunters Immobilier dans le cadre d'un accompagnement personnalisé. Elle ne constitue pas un conseil en investissement au sens juridique du terme.
          </p>
        </div>
      )}

      {!strategie && !showForm && parseError === null && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucune stratégie générée pour ce dossier.</p>
          <p className="text-xs mt-1">Cliquez sur « Générer la stratégie » pour commencer.</p>
        </div>
      )}
    </div>
  );
}
