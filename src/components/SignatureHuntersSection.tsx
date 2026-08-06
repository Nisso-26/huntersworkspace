import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useSignaturesElectroniques,
  useEnvoyerEnSignature,
  useRelancerSignature,
  useAnnulerSignature,
  telechargerDocumentSigne,
  TYPES_DOCUMENT_SIGNATURE,
  STATUT_SIGNATURE_LABELS,
  type TypeDocumentSignature,
  type SignatureElectronique,
} from '@/hooks/use-signatures-electroniques';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { useBaremesHunters } from '@/hooks/use-baremes-hunters';
import { useZonesMandataires } from '@/hooks/use-zones-mandataires';
import {
  SIGNATURE_DOC_SPECS,
  prefillSignatureDoc,
  buildSignatureDocumentPdf,
  type SignatureDocType,
} from '@/lib/signature-documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ShieldCheck, Send, Loader2, Download, Clock, CheckCircle2, XCircle, AlertTriangle, Copy, Trash2, Plus,
  MailCheck, MailX, MailWarning, ArrowLeft, RefreshCw, FileText, Eye, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  dossierId?: string | null;
  mandataireId?: string | null;
  clientName?: string;
  clientEmail?: string;
  numeroDossier?: string | null;
  typesDisponibles?: TypeDocumentSignature[];
  titre?: string;
}


const statutStyles: Record<string, string> = {
  en_attente: 'bg-accent/15 text-accent-foreground border-accent/30',
  signe: 'bg-hunters-success/10 text-hunters-success border-hunters-success/30',
  expire: 'bg-muted text-muted-foreground border-border',
  refuse: 'bg-destructive/10 text-destructive border-destructive/30',
};

const statutIcons: Record<string, typeof Clock> = {
  en_attente: Clock,
  signe: CheckCircle2,
  expire: AlertTriangle,
  refuse: XCircle,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bandeau d'état d'envoi de l'email au signataire. */
function EmailStatusLine({ s }: { s: SignatureElectronique }) {
  if (s.email_statut === 'envoi_en_cours') {
    return (
      <p className="text-[10px] flex items-center gap-1 text-muted-foreground mt-0.5">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" /> Envoi de l'email en cours…
      </p>
    );
  }
  if (s.email_statut === 'echec') {
    return (
      <p className="text-[10px] flex items-start gap-1 text-destructive mt-0.5">
        <MailX className="w-3 h-3 shrink-0 mt-[1px]" />
        <span>Échec de l'envoi de l'email{s.email_erreur ? ` — ${s.email_erreur}` : ''}. Utilisez « Renvoyer » ou copiez le lien.</span>
      </p>
    );
  }
  return (
    <p className="text-[10px] flex items-center gap-1 text-hunters-success mt-0.5">
      <MailCheck className="w-3 h-3 shrink-0" />
      Email envoyé à {s.signataire_email}
      {s.email_envoye_at ? ` le ${new Date(s.email_envoye_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}
      {s.relance_envoyee_at ? ` · relancé le ${new Date(s.relance_envoyee_at).toLocaleDateString('fr-FR')}` : ''}
    </p>
  );
}

export default function SignatureHuntersSection({
  dossierId = null,
  mandataireId = null,
  clientName = '',
  clientEmail = '',
  numeroDossier = null,
  typesDisponibles,
  titre = 'Signature Hunters',
}: Props) {
  const { data: signatures = [], isLoading } = useSignaturesElectroniques(dossierId, mandataireId);
  const envoyer = useEnvoyerEnSignature();
  const relancer = useRelancerSignature();
  const annuler = useAnnulerSignature();
  const { data: company } = useCompanySettings();
  const { data: baremes = [] } = useBaremesHunters();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'preview' | 'confirm'>('form');
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [form, setForm] = useState({
    type_document: (typesDisponibles?.[0] ?? 'mandat_recherche') as TypeDocumentSignature,
    signataire_nom: clientName,
    signataire_email: clientEmail,
    document_nom: '',
  });

  // Données sources du pré-remplissage
  const { data: source } = useQuery({
    queryKey: ['signature-prefill-source', dossierId],
    enabled: !!dossierId && open,
    queryFn: async () => {
      const { data: dossier, error } = await supabase
        .from('dossiers').select('*').eq('id', dossierId!).single();
      if (error) throw error;
      let conseiller = '';
      if ((dossier as any)?.mandataire_id) {
        const { data: prof } = await supabase
          .from('profiles').select('full_name').eq('id', (dossier as any).mandataire_id).maybeSingle();
        conseiller = (prof as any)?.full_name || '';
      }
      return { dossier: dossier as any, conseiller };
    },
  });
  const { data: zones = [] } = useZonesMandataires(source?.dossier?.mandataire_id ?? undefined);

  const types = typesDisponibles
    ? TYPES_DOCUMENT_SIGNATURE.filter(t => typesDisponibles.includes(t.value))
    : TYPES_DOCUMENT_SIGNATURE;

  const typeLabel = TYPES_DOCUMENT_SIGNATURE.find(t => t.value === form.type_document)?.label ?? form.type_document;
  const spec = SIGNATURE_DOC_SPECS[form.type_document as SignatureDocType];
  const autoDoc = !file;

  const groupes = useMemo(() => {
    const out: { group: string; fields: typeof spec.fields }[] = [];
    for (const f of spec?.fields ?? []) {
      const g = out.find(x => x.group === f.group);
      if (g) g.fields.push(f);
      else out.push({ group: f.group, fields: [f] });
    }
    return out;
  }, [spec]);

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const resetDialog = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setStep('form');
      setFile(null);
      setFields({});
      clearPreview();
      setForm(f => ({ ...f, document_nom: '' }));
    }
  };

  const goNext = () => {
    if (!form.signataire_nom.trim()) {
      toast.error('Nom du signataire requis');
      return;
    }
    if (!EMAIL_RE.test(form.signataire_email.trim())) {
      toast.error('Adresse email du signataire invalide');
      return;
    }
    if (!autoDoc) { setStep('confirm'); return; }
    // Pré-remplit les champs depuis le dossier puis ouvre l'aperçu modifiable
    setFields(prefillSignatureDoc(form.type_document as SignatureDocType, {
      dossier: source?.dossier ?? null,
      company: company ?? null,
      conseiller: source?.conseiller ?? null,
      zones: zones.map(z => z.zone_label),
      baremes,
      signataireNom: form.signataire_nom.trim(),
      signataireEmail: form.signataire_email.trim(),
    }));
    clearPreview();
    setStep('preview');
  };

  const genererApercu = async () => {
    setPreviewLoading(true);
    try {
      const doc = await buildSignatureDocumentPdf(
        form.type_document as SignatureDocType, fields, { company: company ?? null },
      );
      clearPreview();
      setPreviewUrl(URL.createObjectURL(doc.output('blob') as Blob));
    } catch (e: any) {
      toast.error(`Aperçu impossible : ${e.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = () => {
    envoyer.mutate(
      {
        dossier_id: dossierId,
        type_document: form.type_document,
        signataire_nom: form.signataire_nom.trim(),
        signataire_email: form.signataire_email.trim(),
        document_nom: form.document_nom.trim() || null,
        file,
        autoDoc: autoDoc
          ? { type: form.type_document as SignatureDocType, fields, company: company ?? null }
          : null,
        numero_dossier: numeroDossier,
      },
      {
        onSettled: () => resetDialog(false),
      },
    );
  };


  const copierLien = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/signer/${token}`);
    toast.success('Lien de signature copié');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-accent" />
          {titre}
        </h4>
        <Dialog open={open} onOpenChange={resetDialog}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Envoyer en signature
            </Button>
          </DialogTrigger>
          <DialogContent className={step === 'preview' ? 'max-w-4xl' : 'max-w-md'}>
            <DialogHeader>
              <DialogTitle>
                {step === 'form'
                  ? 'Envoyer en signature'
                  : step === 'preview'
                    ? `Aperçu — ${spec?.titre ?? typeLabel}`
                    : 'Confirmer l\u2019envoi'}
                {numeroDossier ? ` — Réf. ${numeroDossier}` : ''}
              </DialogTitle>
            </DialogHeader>

            {step === 'form' ? (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">Document à signer</Label>
                  <Select
                    value={form.type_document}
                    onValueChange={v => setForm(f => ({ ...f, type_document: v as TypeDocumentSignature }))}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                    <FileText className="w-3 h-3 shrink-0 mt-[1px]" />
                    Le document est généré automatiquement à la charte HUNTERS depuis les données du dossier.
                    Vous pourrez le vérifier et corriger chaque champ à l'étape suivante.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Nom du destinataire</Label>
                  <Input
                    value={form.signataire_nom}
                    onChange={e => setForm(f => ({ ...f, signataire_nom: e.target.value }))}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email du destinataire</Label>
                  <Input
                    type="email"
                    value={form.signataire_email}
                    onChange={e => setForm(f => ({ ...f, signataire_email: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="prenom.nom@exemple.fr"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Vérifiez cette adresse : c'est elle qui recevra le lien de signature.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Intitulé (optionnel)</Label>
                  <Input
                    value={form.document_nom}
                    onChange={e => setForm(f => ({ ...f, document_nom: e.target.value }))}
                    className="h-9 text-sm"
                    placeholder="Ex : Mandat M. Dupont — Tours"
                  />
                </div>
                <details className="rounded-md border bg-secondary/30 px-3 py-2">
                  <summary className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3" /> Remplacer par mon propre PDF (cas particulier)
                  </summary>
                  <div className="pt-2">
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Si vous joignez un fichier, la génération automatique et l'aperçu sont désactivés.
                    </p>
                  </div>
                </details>
                <Button onClick={goNext} className="w-full gap-2">
                  {autoDoc ? <>Générer et vérifier le document</> : <>Continuer</>}
                </Button>
              </div>
            ) : step === 'preview' ? (
              <div className="grid gap-4 pt-2 md:grid-cols-2">
                <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  <p className="text-[11px] text-muted-foreground">
                    Champs pré-remplis depuis le dossier. Corrigez toute donnée absente ou erronée avant l'envoi.
                  </p>
                  {groupes.map(g => (
                    <div key={g.group} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
                        {g.group}
                      </p>
                      {g.fields.map(f => (
                        <div key={f.key}>
                          <Label className="text-xs">{f.label}</Label>
                          {f.type === 'textarea' ? (
                            <Textarea
                              value={fields[f.key] ?? ''}
                              onChange={e => setFields(v => ({ ...v, [f.key]: e.target.value }))}
                              className="text-sm min-h-[60px]"
                            />
                          ) : (
                            <Input
                              value={fields[f.key] ?? ''}
                              onChange={e => setFields(v => ({ ...v, [f.key]: e.target.value }))}
                              className={`h-8 text-sm ${!(fields[f.key] ?? '').trim() ? 'border-destructive/40' : ''}`}
                              placeholder="À compléter"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Button
                    type="button" variant="outline" className="w-full gap-2"
                    onClick={genererApercu} disabled={previewLoading}
                  >
                    {previewLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
                      : <><Eye className="w-4 h-4" /> {previewUrl ? 'Régénérer l\u2019aperçu' : 'Afficher l\u2019aperçu PDF'}</>}
                  </Button>
                  {previewUrl ? (
                    <iframe
                      title="Aperçu du document"
                      src={previewUrl}
                      className="w-full h-[58vh] rounded-md border bg-muted"
                    />
                  ) : (
                    <div className="h-[58vh] rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground text-center px-6">
                      Cliquez sur « Afficher l'aperçu PDF » pour vérifier le rendu avant l'envoi.
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="gap-1.5" onClick={() => setStep('form')}>
                      <ArrowLeft className="w-4 h-4" /> Retour
                    </Button>
                    <Button className="flex-1 gap-2" onClick={() => setStep('confirm')}>
                      Valider le document
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">

                <div className="rounded-md border bg-secondary/40 p-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Document</span>
                    <span className="text-xs font-medium text-right">
                      {typeLabel}{form.document_nom.trim() ? ` — ${form.document_nom.trim()}` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Destinataire</span>
                    <span className="text-xs font-medium text-right">{form.signataire_nom.trim()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Email</span>
                    <span className="text-xs font-medium text-right break-all">{form.signataire_email.trim()}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Document joint</span>
                    <span className="text-xs font-medium text-right">
                      {file ? file.name : 'Généré automatiquement à la charte HUNTERS'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <MailWarning className="w-3.5 h-3.5 shrink-0 mt-[1px]" />
                  Un email contenant un lien personnel valable 7 jours sera envoyé immédiatement à cette adresse.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button" variant="outline" className="gap-1.5"
                    disabled={envoyer.isPending}
                    onClick={() => setStep(autoDoc ? 'preview' : 'form')}
                  >
                    <ArrowLeft className="w-4 h-4" /> Modifier
                  </Button>

                  <Button onClick={handleSend} disabled={envoyer.isPending} className="flex-1 gap-2">
                    {envoyer.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                      : <><Send className="w-4 h-4" /> Confirmer et envoyer</>}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Signature électronique simple (eIDAS) — horodatage et IP conservés.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Chargement…</p>
      ) : signatures.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Aucune demande de signature</p>
      ) : (
        <div className="space-y-1.5">
          {signatures.map(s => {
            const Icon = statutIcons[s.statut] || Clock;
            const label = TYPES_DOCUMENT_SIGNATURE.find(t => t.value === s.type_document)?.label ?? s.type_document;
            const relanceEnCours = relancer.isPending && relancer.variables?.id === s.id;
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-md bg-secondary/50">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs font-medium truncate">
                    {label}{s.document_nom ? ` — ${s.document_nom}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.signataire_nom}
                    {s.statut === 'signe' && s.signed_at
                      ? ` · signé le ${new Date(s.signed_at).toLocaleDateString('fr-FR')}`
                      : s.statut === 'en_attente'
                        ? ` · expire le ${new Date(s.expires_at).toLocaleDateString('fr-FR')}`
                        : ''}
                    {s.statut === 'refuse' && s.motif_refus ? ` · motif : ${s.motif_refus}` : ''}
                  </p>
                  <EmailStatusLine s={s} />
                  {s.statut === 'en_attente' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <code className="text-[10px] bg-background border rounded px-1.5 py-0.5 truncate max-w-[240px]">
                        {`${window.location.origin}/signer/${s.token}`}
                      </code>
                      <button
                        type="button"
                        onClick={() => copierLien(s.token)}
                        className="text-[10px] text-accent-foreground hover:underline inline-flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copier
                      </button>
                    </div>
                  )}
                </div>
                <Badge className={`text-[10px] border ${statutStyles[s.statut] || ''}`}>
                  {STATUT_SIGNATURE_LABELS[s.statut] || s.statut}
                </Badge>
                {s.statut === 'en_attente' && (
                  <>
                    <Button
                      type="button"
                      variant={s.email_statut === 'echec' ? 'default' : 'ghost'}
                      size="sm" className="h-7 text-xs"
                      disabled={relanceEnCours}
                      onClick={() => relancer.mutate(s)}
                    >
                      {relanceEnCours
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Envoi…</>
                        : <><RefreshCw className="w-3 h-3 mr-1" /> Renvoyer</>}
                    </Button>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive"
                      onClick={() => annuler.mutate(s.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
                {s.statut === 'signe' && s.document_signe_url && (
                  <Button
                    type="button" variant="outline" size="sm" className="h-7 text-xs"
                    onClick={() => telechargerDocumentSigne(s.document_signe_url!)}
                  >
                    <Download className="w-3 h-3 mr-1" /> PDF signé
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
