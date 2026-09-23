import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchPartnerPortal, logPartnerConsultation,
  startPartnerDecision, submitPartnerDecision,
} from '@/hooks/use-portail-partenaire';
import { buildScopedPdf, SECTION_LABELS, FIELD_LABELS, formatScopedValue } from '@/lib/export-scope-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ShieldCheck, ShieldX, Lock, EyeOff, CheckCircle2, FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import huntersLogo from '@/assets/hunters-symbol-dark.svg';
import { partnerPortalProfile } from '@/lib/partner-portal-profile';
import { supabase } from '@/integrations/supabase/client';

type Verdict = 'quitus' | 'invalidation';

export default function PortailPartenaire() {
  const { token } = useParams<{ token: string }>();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [verdict, setVerdict] = useState<Verdict | ''>('');
  const [justification, setJustification] = useState('');
  const [propositionAlternative, setPropositionAlternative] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [decisionId, setDecisionId] = useState('');
  const [codeGenere, setCodeGenere] = useState('');
  const [codeSaisi, setCodeSaisi] = useState('');
  const [busy, setBusy] = useState(false);

  const [montageUrl, setMontageUrl] = useState<string | null>(null);
  const [montageOpen, setMontageOpen] = useState(false);
  const [montageBusy, setMontageBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchPartnerPortal(token)
      .then((p) => {
        if (!p) setError('Ce lien est invalide, expiré ou déjà utilisé.');
        else setPayload(p);
      })
      .catch(() => setError('Ce lien est invalide, expiré ou déjà utilisé.'))
      .finally(() => setLoading(false));
  }, [token]);

  const sections: Record<string, Record<string, unknown>> = payload?.sections || {};
  const exclues: string[] = payload?.sections_exclues || [];
  const peutDecider = (payload?.acces?.scope_decision || []).length > 0;
  const montageAutorise = Object.keys(sections).includes('montage');
  const profile = partnerPortalProfile(payload?.partenaire?.specialite);
  const courtierNeedsProposalForQuitus = profile.profile === 'courtier'
    && payload?.dossier?.budget == null
    && payload?.dossier?.capacite_emprunt_estimee == null;
  const proposalVisible = profile.profile === 'courtier'
    || (profile.profile === 'cgp' && verdict === 'invalidation');
  const proposalRequired = (profile.profile === 'cgp' && verdict === 'invalidation')
    || (profile.profile === 'courtier' && (verdict === 'invalidation' || (verdict === 'quitus' && courtierNeedsProposalForQuitus)));
  const proposalMinLength = profile.profile === 'courtier' ? 50 : 10;
  const verdictLabel = verdict === 'quitus' ? profile.labelQuitus : profile.labelInvalidation;

  const sectionKeys = useMemo(() => Object.keys(sections), [sections]);

  useEffect(() => {
    if (!token || sectionKeys.length === 0) return;
    sectionKeys.forEach((s) => logPartnerConsultation(token, s));
  }, [token, sectionKeys]);

  const ouvrirMontage = async () => {
    if (!token || montageBusy) return;
    setMontageBusy(true);
    try {
      const doc = await buildScopedPdf({
        kind: 'montage',
        refDossier: payload?.dossier?.numero_dossier,
        sections,
        partenaire: payload?.partenaire?.nom,
      });
      const url = URL.createObjectURL(doc.output('blob'));
      setMontageUrl(url);
      setMontageOpen(true);
      await logPartnerConsultation(token, 'montage_pdf');
    } catch (e: any) {
      toast.error(e.message || 'Consultation impossible');
    } finally {
      setMontageBusy(false);
    }
  };

  const demarrer = async () => {
    if (!token || !verdict) return toast.error('Choisissez un verdict');
    if (justification.trim().length < 10) return toast.error('Justification obligatoire (10 caractères minimum)');
    if (proposalRequired && propositionAlternative.trim().length < proposalMinLength) {
      return toast.error(`Proposition obligatoire (${proposalMinLength} caractères minimum)`);
    }
    setBusy(true);
    try {
      const res = await startPartnerDecision(token, verdict, justification.trim(), propositionAlternative.trim() || null);
      setDecisionId(res.decision_id);
      setCodeGenere(res.code);
      setStep('confirm');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const soumettre = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const result = await submitPartnerDecision(
        token,
        decisionId,
        codeSaisi.trim().toUpperCase(),
        propositionAlternative.trim() || null,
      );
      if (verdict === 'invalidation') {
        await supabase.functions.invoke('notify-partner-decision', {
          body: { token, decision_id: decisionId, proposition_jointe: Boolean(result?.proposition_jointe) },
        });
      }
      setStep('done');
      toast.success('Décision enregistrée — accès révoqué');
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
          <h1 className="text-lg font-heading font-bold text-foreground">Accès indisponible</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background print:hidden">
      <header className="bg-primary text-primary-foreground px-5 py-6">
        <div className="max-w-3xl mx-auto space-y-2">
          <img src={huntersLogo} alt="HUNTERS Immobilier" className="h-7 w-auto" />
          <p className="text-[11px] uppercase tracking-[0.25em] text-primary-foreground/70">Portail partenaire</p>
          <h1 className="text-xl font-heading font-bold">
            Dossier {payload?.dossier?.numero_dossier}
          </h1>
          <p className="text-xs text-primary-foreground/80">
            {payload?.partenaire?.nom}
            {payload?.partenaire?.societe ? ` · ${payload.partenaire.societe}` : ''} · {payload?.partenaire?.specialite}
          </p>
          <p className="text-xs text-primary-foreground/70">
            {payload?.acces?.nature_validation || 'Validation'} · accès valable jusqu'au{' '}
            {new Date(payload?.acces?.date_expiration).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
          Dossier anonymisé : aucune donnée identifiante du client ne vous est communiquée.
          Votre consultation et votre décision sont horodatées et journalisées.
        </div>

        {montageAutorise && (
          <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Dossier de montage juridique et fiscal</p>
              <p className="text-xs text-muted-foreground">
                Consultation à l'écran uniquement — téléchargement et impression non autorisés.
              </p>
            </div>
            <Button size="sm" onClick={ouvrirMontage} disabled={montageBusy} className="gap-2">
              {montageBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
              Consulter
            </Button>
          </div>
        )}

        {Object.keys(sections).map((s) => (
          <section key={s} className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-heading font-bold text-foreground mb-3">
              {SECTION_LABELS[s] || s}
            </h2>
            <dl className="divide-y">
              {Object.entries(sections[s] || {}).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-xs text-muted-foreground">{FIELD_LABELS[k] || k}</dt>
                  <dd className="text-xs font-semibold text-foreground text-right">{formatScopedValue(k, v)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        {exclues.length > 0 && (
          <section className="rounded-xl border border-dashed bg-secondary/40 p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <EyeOff className="w-4 h-4" />
              Informations volontairement non communiquées
            </h2>
            <div className="flex flex-wrap gap-2">
              {exclues.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">{SECTION_LABELS[s] || s}</Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Ces éléments sortent du périmètre de votre intervention. Vous pouvez en demander l'accès au conseiller.
            </p>
          </section>
        )}

        {peutDecider && step !== 'done' && (
          <section className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-heading font-bold text-foreground">Votre décision</h2>

            {step === 'form' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVerdict('quitus')}
                    className={`h-auto items-start justify-start p-3 text-left ${verdict === 'quitus' ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <span>
                      <ShieldCheck className="w-4 h-4 text-hunters-success mb-1" />
                      <span className="block text-sm font-semibold text-foreground">{profile.labelQuitus}</span>
                      <span className="block text-[11px] text-muted-foreground">Je valide le dossier dans mon périmètre.</span>
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVerdict('invalidation')}
                    className={`h-auto items-start justify-start p-3 text-left ${verdict === 'invalidation' ? 'border-destructive bg-destructive/5' : ''}`}
                  >
                    <span>
                      <ShieldX className="w-4 h-4 text-destructive mb-1" />
                      <span className="block text-sm font-semibold text-foreground">{profile.labelInvalidation}</span>
                      <span className="block text-[11px] text-muted-foreground">Le dossier ne peut pas être validé en l'état.</span>
                    </span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Justification <span className="text-destructive">*</span></Label>
                  <Textarea
                    rows={5}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Motivez votre verdict (10 caractères minimum)"
                  />
                  <p className="text-[11px] text-muted-foreground">{justification.trim().length} caractère(s)</p>
                </div>

                {proposalVisible && (
                  <div className="space-y-2">
                    <Label>
                      {profile.profile === 'cgp' ? 'Votre proposition de stratégie' : 'Votre proposition de montage financier'}
                      {proposalRequired && <span className="text-destructive"> *</span>}
                    </Label>
                    <Textarea
                      rows={5}
                      value={propositionAlternative}
                      onChange={(e) => setPropositionAlternative(e.target.value)}
                      placeholder={profile.profile === 'courtier'
                        ? 'Précisez si possible : montant finançable, durée, taux visé, type de prêt, apport nécessaire, garanties.'
                        : 'Décrivez la stratégie que vous recommandez.'}
                    />
                    <p className="text-[11px] text-muted-foreground">
                       {propositionAlternative.trim().length} caractère(s){proposalRequired ? ` — minimum ${proposalMinLength}` : ' — facultatif'}
                    </p>
                  </div>
                )}

                <Button onClick={demarrer} disabled={busy} className="gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Poursuivre
                </Button>
              </>
            )}

            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-secondary/50 p-4 space-y-2 text-xs">
                  <p><span className="text-muted-foreground">Verdict :</span>{' '}
                    <strong>{verdictLabel}</strong></p>
                  <p className="text-muted-foreground">{justification}</p>
                  {propositionAlternative.trim() && (
                    <p><span className="text-muted-foreground">Proposition :</span> {propositionAlternative.trim()}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    En confirmant, j'atteste avoir examiné les éléments du dossier {payload?.dossier?.numero_dossier}{' '}
                    dans le périmètre présenté, et je certifie l'exactitude de mon verdict et de ma justification.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Code de confirmation</Label>
                  <p className="text-xs text-muted-foreground">
                    Recopiez le code suivant pour signer votre décision :{' '}
                    <span className="font-mono font-bold tracking-[0.3em] text-foreground">{codeGenere}</span>
                  </p>
                  <Input
                    value={codeSaisi}
                    onChange={(e) => setCodeSaisi(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-32 font-mono tracking-[0.3em] uppercase"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('form')} disabled={busy}>Retour</Button>
                  <Button size="sm" onClick={soumettre} disabled={busy || codeSaisi.trim().length !== 4} className="gap-2">
                    {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmer ma décision
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 'done' && (
          <section className="rounded-xl border bg-card p-6 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-hunters-success" />
            <h2 className="text-sm font-heading font-bold text-foreground">Décision enregistrée</h2>
            <p className="text-xs text-muted-foreground">
              Un quitus horodaté a été généré et transmis à HUNTERS. Cet accès est désormais révoqué.
            </p>
          </section>
        )}
      </main>

      <Dialog open={montageOpen} onOpenChange={(o) => { setMontageOpen(o); if (!o && montageUrl) { URL.revokeObjectURL(montageUrl); setMontageUrl(null); } }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Montage juridique et fiscal — consultation à l'écran</DialogTitle>
          </DialogHeader>
          {montageUrl && (
            <iframe
              title="Montage juridique et fiscal"
              src={`${montageUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-[70vh] rounded-md border"
            />
          )}
          <p className="text-[11px] text-muted-foreground">
            Téléchargement et impression désactivés — document non diffusable.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
