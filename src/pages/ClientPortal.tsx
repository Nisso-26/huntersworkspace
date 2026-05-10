import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPortalData } from '@/hooks/use-client-portal';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, Clock, FileText, Home, HardHat, Calculator, Calendar, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  // Simulateur state
  const [apport, setApport] = useState(0);
  const [taux, setTaux] = useState(3.5);
  const [duree, setDuree] = useState(20);
  const [charges, setCharges] = useState(200);
  const [vacance, setVacance] = useState(5);

  useEffect(() => {
    if (!token) return;
    fetchPortalData(token)
      .then(setData)
      .catch(e => setError(e.message))
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
      toast.success('Commentaire envoyé');
      setComment('');
    } catch {
      toast.error('Erreur lors de l\'envoi');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.dossier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-foreground mb-2">Accès non disponible</h1>
        <p className="text-muted-foreground">{error || 'Ce lien est invalide ou a expiré.'}</p>
      </div>
    );
  }

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
      {/* Header */}
      <header className="bg-primary text-white py-4 px-4 md:px-8" role="banner">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight font-montserrat">HUNTERS</h1>
            <p className="text-xs text-primary-foreground/70">Espace Client</p>
          </div>
          <span className="text-sm text-primary-foreground/70">{data.token.client_name}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6" role="main">
        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Avancement de votre dossier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3 mb-4" aria-label={`Progression : ${progressPercent}%`} />
            <div className="grid grid-cols-7 gap-1 text-center">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 ${
                      i <= currentStepIndex
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                    aria-current={i === currentStepIndex ? 'step' : undefined}
                  >
                    {i <= currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs">{i + 1}</span>}
                  </div>
                  <span className="text-[10px] md:text-xs text-muted-foreground leading-tight">{step.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="biens" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="biens" className="text-xs gap-1"><Home className="w-3 h-3 hidden md:block" />Biens</TabsTrigger>
            <TabsTrigger value="simulation" className="text-xs gap-1"><Calculator className="w-3 h-3 hidden md:block" />Simulation</TabsTrigger>
            <TabsTrigger value="chantier" className="text-xs gap-1"><HardHat className="w-3 h-3 hidden md:block" />Chantier</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1"><FileText className="w-3 h-3 hidden md:block" />Documents</TabsTrigger>
            <TabsTrigger value="echeances" className="text-xs gap-1"><Calendar className="w-3 h-3 hidden md:block" />Échéances</TabsTrigger>
          </TabsList>

          {/* Biens */}
          <TabsContent value="biens">
            {biens.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun bien associé pour le moment.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {biens.map((b: any) => (
                  <Card key={b.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{b.reference}</p>
                          <p className="text-xs text-muted-foreground">{b.type} — {b.ville} {b.code_postal}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{b.statut}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Surface</span><br />{b.surface} m²</div>
                        <div><span className="text-muted-foreground">Prix</span><br />{Number(b.prix_acquisition).toLocaleString('fr-FR')} €</div>
                        <div><span className="text-muted-foreground">Travaux</span><br />{Number(b.budget_travaux).toLocaleString('fr-FR')} €</div>
                        <div><span className="text-muted-foreground">Loyer cible</span><br />{Number(b.loyer_mensuel_cible).toLocaleString('fr-FR')} €/mois</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Simulation interactive */}
          <TabsContent value="simulation">
            {!mainBien ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun bien pour la simulation.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <h3 className="font-semibold text-sm">Simulateur de rentabilité</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Apport (€)</Label>
                      <Input type="number" value={apport} onChange={e => setApport(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Taux (%)</Label>
                      <Input type="number" step="0.1" value={taux} onChange={e => setTaux(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Durée (ans)</Label>
                      <Input type="number" value={duree} onChange={e => setDuree(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Charges (€/mois)</Label>
                      <Input type="number" value={charges} onChange={e => setCharges(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Vacance (%)</Label>
                      <Input type="number" value={vacance} onChange={e => setVacance(Number(e.target.value))} className="h-8 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <ResultCard label="Prix de revient" value={`${prixRevient.toLocaleString('fr-FR')} €`} />
                    <ResultCard label="Mensualité" value={`${Math.round(mensualite).toLocaleString('fr-FR')} €`} />
                    <ResultCard label="Cash-flow" value={`${Math.round(cashFlow).toLocaleString('fr-FR')} €/mois`} positive={cashFlow >= 0} />
                    <ResultCard label="Rentabilité brute" value={`${rentaBrute.toFixed(2)} %`} />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Chantier */}
          <TabsContent value="chantier">
            {chantiers.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun chantier en cours.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {chantiers.map((c: any) => {
                  const cLots = lots.filter((l: any) => l.chantier_id === c.id);
                  const totalDevis = cLots.reduce((s: number, l: any) => s + Number(l.montant_devis || 0), 0);
                  const totalEngage = cLots.reduce((s: number, l: any) => s + Number(l.montant_engage || 0), 0);
                  const avgProgress = cLots.length > 0 ? Math.round(cLots.reduce((s: number, l: any) => s + (l.avancement || 0), 0) / cLots.length) : 0;

                  return (
                    <Card key={c.id}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between">
                          <p className="font-semibold text-sm">{c.reference}</p>
                          <Badge variant="secondary">{c.statut}</Badge>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Avancement global</span>
                            <span>{avgProgress}%</span>
                          </div>
                          <Progress value={avgProgress} className="h-2" />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Budget</span><br />{Number(c.budget_alloue).toLocaleString('fr-FR')} €</div>
                          <div><span className="text-muted-foreground">Devis</span><br />{totalDevis.toLocaleString('fr-FR')} €</div>
                          <div><span className="text-muted-foreground">Engagé</span><br />{totalEngage.toLocaleString('fr-FR')} €</div>
                        </div>
                        {cLots.length > 0 && (
                          <div className="space-y-1">
                            {cLots.map((l: any) => (
                              <div key={l.id} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 truncate">{l.designation}</span>
                                <Progress value={l.avancement || 0} className="w-20 h-1.5" />
                                <span className="text-muted-foreground w-8 text-right">{l.avancement || 0}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            {documents.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucun document disponible.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {documents.map((d: any) => (
                  <Card key={d.id}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1 truncate">{d.file_name}</span>
                      <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString('fr-FR')}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Échéances */}
          <TabsContent value="echeances">
            {futureEvents.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Aucune échéance à venir.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {futureEvents.map((e: any) => (
                  <Card key={e.id}>
                    <CardContent className="py-3 flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-accent" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{e.titre}</p>
                        <p className="text-xs text-muted-foreground">{new Date(e.date_debut).toLocaleDateString('fr-FR')} — {e.lieu || ''}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Commentaires */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              Laisser un commentaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Votre message..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="min-h-[80px]"
              aria-label="Commentaire"
            />
            <Button
              onClick={handleComment}
              disabled={!comment.trim() || sending}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Envoyer
            </Button>
          </CardContent>
        </Card>

        <footer className="text-center text-xs text-muted-foreground py-4">
          <p>© {new Date().getFullYear()} HUNTERS — Espace client sécurisé</p>
          <p className="mt-1">Ce portail est en lecture seule. Les informations sont mises à jour en temps réel.</p>
        </footer>
      </main>
    </div>
  );
}

function ResultCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-secondary rounded-lg p-3 text-center">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold ${positive === false ? 'text-destructive' : positive === true ? 'text-primary' : ''}`}>
        {value}
      </p>
    </div>
  );
}
