import { useState } from 'react';
import {
  useSignaturesElectroniques,
  useEnvoyerEnSignature,
  useRelancerSignature,
  useAnnulerSignature,
  telechargerDocumentSigne,
  TYPES_DOCUMENT_SIGNATURE,
  STATUT_SIGNATURE_LABELS,
  type TypeDocumentSignature,
} from '@/hooks/use-signatures-electroniques';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ShieldCheck, Send, Loader2, Download, Clock, CheckCircle2, XCircle, AlertTriangle, Copy, Trash2, Plus,
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
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    type_document: (typesDisponibles?.[0] ?? 'mandat_recherche') as TypeDocumentSignature,
    signataire_nom: clientName,
    signataire_email: clientEmail,
    document_nom: '',
  });

  const types = typesDisponibles
    ? TYPES_DOCUMENT_SIGNATURE.filter(t => typesDisponibles.includes(t.value))
    : TYPES_DOCUMENT_SIGNATURE;

  const handleSend = () => {
    if (!form.signataire_nom.trim() || !form.signataire_email.trim()) {
      toast.error('Nom et email du signataire requis');
      return;
    }
    envoyer.mutate(
      {
        dossier_id: dossierId,
        type_document: form.type_document,
        signataire_nom: form.signataire_nom.trim(),
        signataire_email: form.signataire_email.trim(),
        document_nom: form.document_nom.trim() || null,
        file,
        numero_dossier: numeroDossier,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setFile(null);
          setForm(f => ({ ...f, document_nom: '' }));
        },
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Envoyer en signature
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Envoyer en signature{numeroDossier ? ` — Réf. ${numeroDossier}` : ''}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Type de document</Label>
                <Select
                  value={form.type_document}
                  onValueChange={v => setForm(f => ({ ...f, type_document: v as TypeDocumentSignature }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nom du signataire</Label>
                <Input
                  value={form.signataire_nom}
                  onChange={e => setForm(f => ({ ...f, signataire_nom: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email du signataire</Label>
                <Input
                  type="email"
                  value={form.signataire_email}
                  onChange={e => setForm(f => ({ ...f, signataire_email: e.target.value }))}
                  className="h-9 text-sm"
                />
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
              <div>
                <Label className="text-xs">PDF à signer (optionnel)</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sans PDF, seul le certificat de signature est généré.
                </p>
              </div>
              <Button onClick={handleSend} disabled={envoyer.isPending} className="w-full gap-2">
                {envoyer.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer la demande
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Lien personnel valable 7 jours — signature électronique simple (eIDAS).
              </p>
            </div>
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
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-md bg-secondary/50">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs font-medium truncate">
                    {label}{s.document_nom ? ` — ${s.document_nom}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.signataire_nom} — {s.signataire_email}
                    {s.statut === 'signe' && s.signed_at
                      ? ` · signé le ${new Date(s.signed_at).toLocaleDateString('fr-FR')}`
                      : s.statut === 'en_attente'
                        ? ` · expire le ${new Date(s.expires_at).toLocaleDateString('fr-FR')}`
                        : ''}
                    {s.statut === 'refuse' && s.motif_refus ? ` · motif : ${s.motif_refus}` : ''}
                  </p>
                </div>
                <Badge className={`text-[10px] border ${statutStyles[s.statut] || ''}`}>
                  {STATUT_SIGNATURE_LABELS[s.statut] || s.statut}
                </Badge>
                {s.statut === 'en_attente' && (
                  <>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copierLien(s.token)}>
                      <Copy className="w-3 h-3 mr-1" /> Lien
                    </Button>
                    <Button
                      type="button" variant="ghost" size="sm" className="h-7 text-xs"
                      disabled={relancer.isPending}
                      onClick={() => relancer.mutate(s)}
                    >
                      <Send className="w-3 h-3 mr-1" /> Relancer
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
