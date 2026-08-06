// Bouton générique « Envoyer au client » avec statut d'envoi réel.
// Utilisé pour les factures, rapports de conseil, documents contractuels et
// rapports de chantier — même mécanique que les devis (pas de faux succès).
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Mail, Loader2, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { DocEmailStatut } from '@/lib/document-email';

interface Props {
  statut?: DocEmailStatut | null;
  destinataire?: string | null;
  envoyeAt?: string | null;
  erreur?: string | null;
  defaultEmail?: string | null;
  documentLabel: string;
  onSend: (email: string) => Promise<unknown>;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost' | 'default';
}

export function EnvoiStatutBadge({
  statut,
  destinataire,
  envoyeAt,
  erreur,
}: Pick<Props, 'statut' | 'destinataire' | 'envoyeAt' | 'erreur'>) {
  if (!statut || statut === 'non_envoye') return null;
  if (statut === 'envoi_en_cours') {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Loader2 className="w-3 h-3 animate-spin" /> Envoi en cours…
      </Badge>
    );
  }
  if (statut === 'envoye') {
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <CheckCircle2 className="w-3 h-3 text-primary" />
        Envoyé{destinataire ? ` à ${destinataire}` : ''}
        {envoyeAt
          ? ` le ${new Date(envoyeAt).toLocaleDateString('fr-FR')} à ${new Date(envoyeAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
          : ''}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1 font-normal" title={erreur || undefined}>
      <AlertTriangle className="w-3 h-3" /> Échec — {erreur || 'motif inconnu'}
    </Badge>
  );
}

export default function EnvoyerDocumentButton({
  statut,
  destinataire,
  envoyeAt,
  erreur,
  defaultEmail,
  documentLabel,
  onSend,
  size = 'sm',
  variant = 'outline',
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(destinataire || defaultEmail || '');
  const [busy, setBusy] = useState(false);

  const isSent = statut === 'envoye';
  const isFail = statut === 'echec';
  const inFlight = statut === 'envoi_en_cours' || busy;

  const submit = async () => {
    setBusy(true);
    try {
      await onSend(email.trim());
      setOpen(false);
    } catch (e: any) {
      // L'erreur est déjà remontée en toast par la mutation ; garde le popover ouvert.
      if (!e?.__handled) toast.error(e?.message || "Échec de l'envoi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size={size}
          variant={variant}
          className="gap-1.5"
          disabled={inFlight}
          title={isSent ? 'Renvoyer au client' : 'Envoyer au client'}
        >
          {inFlight ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Mail className="w-3.5 h-3.5" />
          )}
          {isSent || isFail ? 'Renvoyer' : 'Envoyer'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-semibold">Envoyer au client</p>
          <p className="text-xs text-muted-foreground">
            {documentLabel} — envoyé en pièce jointe PDF.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="envoi-email" className="text-xs">
            Email du client
          </Label>
          <Input
            id="envoi-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@exemple.fr"
          />
        </div>
        {isFail && erreur && (
          <p className="text-xs text-destructive">Dernier échec : {erreur}</p>
        )}
        <Button size="sm" className="w-full gap-2" onClick={submit} disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? 'Envoi…' : isSent || isFail ? 'Renvoyer maintenant' : 'Envoyer maintenant'}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
