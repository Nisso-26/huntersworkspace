import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePartenaires } from '@/hooks/use-partenaires';
import { useCompanySettings } from '@/hooks/use-company-settings';
import {
  useAccesPortail, useCreateAccesPortail, useRevokeAccesPortail,
  useQuitusDossier, useDerniereDecision, scopesForSpecialite,
  type AccesPortail,
} from '@/hooks/use-portail-partenaire';
import { buildQuitusPdf } from '@/lib/quitus-pdf';
import { mentionMandataireHunters } from '@/lib/mandataire-signature';
import { buildScopedPdf, sectionsFromDossier } from '@/lib/export-scope-pdf';
import { SECTION_LABELS } from '@/lib/export-scope-pdf';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Copy, XCircle, Loader2, ShieldCheck, Download, Landmark,
  AlertTriangle, Send, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props { dossier: Record<string, any> }

const JOURS_DEFAUT = 10;

async function sendMail(body: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('send-notification', { body });
  if (error) {
    const ctx = (error as any)?.context;
    let detail = error.message;
    try {
      if (ctx && typeof ctx.text === 'function') {
        const raw = await ctx.text();
        detail = JSON.parse(raw)?.error || raw || detail;
      }
    } catch { /* message générique */ }
    return detail;
  }
  if (data && (data as any).ok !== true && (data as any).error) return String((data as any).error);
  return null;
}

export default function PortailPartenaireSection({ dossier }: Props) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: partenaires = [] } = usePartenaires();
  const { data: settings } = useCompanySettings();
  const { data: acces = [], isLoading } = useAccesPortail(dossier.id);
  const { data: quitusList = [] } = useQuitusDossier(dossier.id);
  const { data: derniereDecision } = useDerniereDecision(dossier.id);
  const createMut = useCreateAccesPortail();
  const revokeMut = useRevokeAccesPortail();

  const [partenaireId, setPartenaireId] = useState('');
  const [busy, setBusy] = useState(false);
  const relanceFaite = useRef(false);

  const partenaire = partenaires.find((p) => p.id === partenaireId);
  const scopes = scopesForSpecialite(partenaire?.specialite);
  const estActif = (a: AccesPortail) => !a.date_revocation && new Date(a.date_expiration) > new Date();
  const lien = (t: string) => `${window.location.origin}/portail-partenaire/${t}`;

  // ── Relance J+7 : vérifiée à l'ouverture du dossier, une seule fois par accès ──
  useEffect(() => {
    if (relanceFaite.current || acces.length === 0 || partenaires.length === 0) return;
    const seuil = Date.now() - 7 * 24 * 3600 * 1000;
    const cible = acces.find(
      (a) => estActif(a) && !(a as any).date_relance && new Date(a.date_generation).getTime() < seuil,
    );
    if (!cible) return;
    const p = partenaires.find((x) => x.id === cible.partenaire_id);
    if (!p?.email) return;
    relanceFaite.current = true;
    (async () => {
      await (supabase.from('acces_portail' as any) as any)
        .update({ date_relance: new Date().toISOString() })
        .eq('id', cible.id);
      await sendMail({
        to: p.email,
        allow_external: true,
        subject: `Relance — dossier ${dossier.numero_dossier || ''} en attente de votre avis`,
        eyebrow: 'Portail partenaire',
        title: 'Votre avis est toujours attendu',
        cta: { label: 'Ouvrir le dossier', url: lien(cible.token) },
        body: `<p style="margin:0 0 12px;">Bonjour ${p.nom},</p>
          <p style="margin:0 0 12px;">Aucune décision n'a été enregistrée depuis 7 jours sur le dossier ${dossier.numero_dossier || ''}.</p>
          <p style="margin:0;font-size:11px;">Ce lien est personnel et expire le ${new Date(cible.date_expiration).toLocaleDateString('fr-FR')}.</p>`,
      });
    })();
  }, [acces, partenaires, dossier.numero_dossier]);

  const genererAcces = async () => {
    if (!partenaire) return toast.error('Sélectionnez un partenaire');
    setBusy(true);
    try {
      const created = await createMut.mutateAsync({
        dossier_id: dossier.id,
        partenaire_id: partenaire.id,
        specialite: partenaire.specialite,
        jours: JOURS_DEFAUT,
        nb_ouvertures_max: 20,
        nature_validation: scopes.natureValidation,
      });
      if (partenaire.email) {
        const erreur = await sendMail({
          to: partenaire.email,
          allow_external: true,
          subject: `Dossier ${dossier.numero_dossier || ''} — votre avis est attendu`,
          eyebrow: 'Portail partenaire',
          title: 'Accès sécurisé à un dossier anonymisé',
          cta: { label: 'Ouvrir le dossier', url: lien(created.token) },
          body: `<p style="margin:0 0 12px;">Bonjour ${partenaire.nom},</p>
            <p style="margin:0 0 12px;">Un dossier anonymisé vous est soumis pour ${scopes.natureValidation.toLocaleLowerCase('fr-FR')}.</p>
            <p style="margin:0 0 12px;">Périmètre communiqué : ${scopes.scope_lecture.map((s) => SECTION_LABELS[s] || s).join(', ')}.</p>
            <p style="margin:0;font-size:11px;">Ce lien est personnel, journalisé et expire dans ${JOURS_DEFAUT} jours.</p>`,
        });
        if (erreur) toast.error(`Accès créé, mais l'email n'a pas été envoyé : ${erreur}`, { duration: 10000 });
        else toast.success(`Lien envoyé à ${partenaire.email}`);
      }
      setPartenaireId('');
    } finally {
      setBusy(false);
    }
  };

  const exportFinancement = async () => {
    setBusy(true);
    try {
      const doc = await buildScopedPdf({
        kind: 'financement',
        refDossier: dossier.numero_dossier,
        sections: sectionsFromDossier(dossier, 'financement'),
        client: dossier.client_name,
        // Mandataire du dossier, pas l'utilisateur connecté.
        conseiller: mentionMandataireHunters(dossier),
      });
      doc.save(`Financement_${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`);
      toast.success('Export financement généré');
    } catch (e: any) {
      toast.error(e.message || "Erreur d'export");
    } finally {
      setBusy(false);
    }
  };

  const telechargerQuitus = (contenu: Record<string, any>, ref?: string) => {
    const doc = buildQuitusPdf(contenu as any);
    doc.save(`Quitus_${ref || dossier.numero_dossier || 'dossier'}.pdf`);
  };

  const adopterProposition = async (profil: 'cgp' | 'courtier') => {
    const proposition = derniereDecision?.proposition_alternative?.trim();
    if (!proposition || !user) return;
    setBusy(true);
    try {
      if (profil === 'cgp') {
        const { error: archiveError } = await (supabase.from('documents_generes') as any).insert({
          dossier_id: dossier.id,
          type: 'strategie_patrimoniale',
          numero_dossier: dossier.numero_dossier,
          conseiller_id: user.id,
          contenu: dossier.strategie ?? null,
        });
        if (archiveError) throw archiveError;
      }

      const { error: updateError } = await supabase
        .from('dossiers')
        .update(profil === 'cgp'
          ? { strategie: proposition }
          : { montage_financier_propose: proposition } as any)
        .eq('id', dossier.id);
      if (updateError) throw updateError;
      await queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      toast.success(profil === 'cgp'
        ? 'Proposition du CGP adoptée — stratégie précédente archivée'
        : 'Montage financier du courtier adopté');
    } catch (e: any) {
      toast.error(e.message || "La proposition n'a pas pu être adoptée");
    } finally {
      setBusy(false);
    }
  };

  const corriger = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ sous_statut: 'corrige_en_attente_validation' } as any)
        .eq('id', dossier.id);
      if (error) throw error;
      toast.success('Dossier marqué corrigé — générez un nouvel accès pour faire revalider le partenaire');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const contester = async () => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from('dossiers')
        .update({ sous_statut: 'conteste_escalade' } as any)
        .eq('id', dossier.id);
      if (error) throw error;
      const dest = settings?.email_alertes_dirigeant;
      if (dest) {
        await sendMail({
          to: dest,
          allow_external: true,
          subject: `Contestation à arbitrer — dossier ${dossier.numero_dossier || ''}`,
          eyebrow: 'Escalade Direction',
          title: 'Une invalidation partenaire est contestée',
          body: `<p style="margin:0 0 12px;">Le conseiller conteste l'invalidation du dossier ${dossier.numero_dossier || ''}.</p>
            <p style="margin:0 0 12px;"><strong>Motif du partenaire :</strong> ${derniereDecision?.justification || '—'}</p>
            <p style="margin:0;font-size:11px;">Le dossier est bloqué jusqu'à votre arbitrage.</p>`,
        });
      }
      toast.success('Contestation escaladée à la Direction');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const invalide = dossier.sous_statut === 'invalide_motive';
  const escalade = dossier.sous_statut === 'conteste_escalade';
  const decisionAccess = acces.find((a) => a.id === derniereDecision?.acces_portail_id);
  const decisionProfile: 'cgp' | 'courtier' = decisionAccess?.scope_lecture.includes('montage')
    && decisionAccess.scope_lecture.includes('situation_financiere') ? 'cgp' : 'courtier';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Landmark className="w-4 h-4 text-accent" />
          Portail partenaire
        </h4>
        <Button size="sm" variant="outline" className="gap-2" onClick={exportFinancement} disabled={busy}>
          <Download className="w-3.5 h-3.5" />
          Export financement
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Le montage juridique et fiscal n'est jamais téléchargeable : il se consulte uniquement dans le portail partenaire.
      </p>

      {/* Génération d'accès */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div className="space-y-2">
          <Label className="text-xs">Partenaire</Label>
          <Select value={partenaireId || '__none__'} onValueChange={(v) => setPartenaireId(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un partenaire" /></SelectTrigger>
            <SelectContent>
              {partenaires.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nom} — {p.specialite}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="gap-2" onClick={genererAcces} disabled={busy || !partenaireId}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Générer l'accès ({JOURS_DEFAUT} j)
        </Button>
      </div>
      {partenaire && (
        <p className="text-[11px] text-muted-foreground">
          Périmètre automatique ({scopes.famille}) : {scopes.scope_lecture.map((s) => SECTION_LABELS[s] || s).join(' · ')}
        </p>
      )}

      {/* Liste des accès */}
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : acces.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun accès partenaire généré.</p>
      ) : (
        <div className="space-y-2">
          {acces.map((a) => {
            const p = partenaires.find((x) => x.id === a.partenaire_id);
            const actif = estActif(a);
            return (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 text-xs">
                <span className="flex-1 truncate">
                  {p?.nom || 'Partenaire'} · <span className="text-muted-foreground">{a.nature_validation}</span>
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {actif ? `Actif — expire le ${new Date(a.date_expiration).toLocaleDateString('fr-FR')}` : a.date_revocation ? 'Révoqué' : 'Expiré'}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{a.nb_ouvertures_effectuees} ouverture(s)</span>
                {actif && (
                  <>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" title="Copier le lien"
                      onClick={() => { navigator.clipboard.writeText(lien(a.token)); toast.success('Lien copié'); }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Révoquer"
                      onClick={() => revokeMut.mutate({ id: a.id, dossierId: dossier.id })}>
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quitus générés */}
      {quitusList.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-hunters-success" />
            Quitus partenaires
          </p>
          {quitusList.map((q) => (
            (() => {
              const labels = scopesForSpecialite((q.contenu as any)?.partenaire_specialite);
              return (
                <div key={q.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 text-xs">
                  <span className="flex-1 truncate">
                    {(q.contenu as any)?.partenaire_nom || 'Partenaire'} ·{' '}
                    {(q.contenu as any)?.verdict === 'quitus' ? labels.labelQuitus : labels.labelInvalidation}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(q.date_generation).toLocaleDateString('fr-FR')}
                  </span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => telechargerQuitus(q.contenu, (q.contenu as any)?.numero_dossier)}>
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              );
            })()
          ))}
        </div>
      )}

      {derniereDecision?.proposition_alternative?.trim() && (
        <div className="border-t pt-3">
          <div className="border bg-secondary/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">
              {decisionProfile === 'cgp' ? 'Proposition de stratégie du CGP' : 'Montage financier proposé'}
            </p>
            {decisionProfile === 'cgp' && dossier.strategie && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Stratégie actuelle</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{typeof dossier.strategie === 'string' ? dossier.strategie : JSON.stringify(dossier.strategie)}</p>
              </div>
            )}
            {decisionProfile === 'courtier' && dossier.montage_financier_propose && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Montage financier actuel</p>
                <p className="text-xs text-foreground whitespace-pre-wrap">{dossier.montage_financier_propose}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground">Proposition partenaire</p>
              <p className="text-xs text-foreground whitespace-pre-wrap">{derniereDecision.proposition_alternative}</p>
            </div>
            <Button size="sm" onClick={() => adopterProposition(decisionProfile)} disabled={busy}>
              Adopter cette proposition
            </Button>
          </div>
        </div>
      )}

      {/* Invalidation : corriger ou contester */}
      {invalide && (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Invalidation motivée du partenaire
          </p>
          {derniereDecision?.justification && (
            <p className="text-xs text-muted-foreground">{derniereDecision.justification}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={corriger} disabled={busy}>
              <RefreshCw className="w-3.5 h-3.5" />
              J'ai corrigé — faire revalider
            </Button>
            <Button size="sm" variant="outline" className="gap-2 text-destructive" onClick={contester} disabled={busy}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Contester (escalade Direction)
            </Button>
          </div>
        </div>
      )}

      {escalade && (
        <div className="border-t pt-3">
          {isAdmin ? (
            <p className="text-xs text-hunters-warning">
              Contestation en attente d'arbitrage Direction — motif partenaire : {derniereDecision?.justification || '—'}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Dossier bloqué : la contestation est en cours d'arbitrage par la Direction.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
