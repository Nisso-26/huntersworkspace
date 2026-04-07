import { useState } from 'react';
import { useClientTokens, useCreateClientToken, useRevokeClientToken } from '@/hooks/use-client-portal';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Link2, Copy, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  dossierId: string;
  clientName: string;
}

export default function ClientPortalSection({ dossierId, clientName }: Props) {
  const { user } = useAuth();
  const { data: tokens = [], isLoading } = useClientTokens(dossierId);
  const createMut = useCreateClientToken();
  const revokeMut = useRevokeClientToken();
  const [email, setEmail] = useState('');

  const activeTokens = tokens.filter(t => t.is_active && new Date(t.expires_at) > new Date());

  const handleGenerate = () => {
    if (!user) return;
    createMut.mutate({
      dossier_id: dossierId,
      client_name: clientName,
      client_email: email || undefined,
      created_by: user.id,
    });
    setEmail('');
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/client/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié dans le presse-papier');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Link2 className="w-4 h-4 text-accent" />
          Espace Client
        </h4>
      </div>

      {activeTokens.length > 0 ? (
        <div className="space-y-2">
          {activeTokens.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 text-xs">
              <span className="flex-1 truncate font-mono text-[10px]">
                …{t.token.slice(-12)}
              </span>
              <Badge variant="outline" className="text-[10px]">
                Expire {new Date(t.expires_at).toLocaleDateString('fr-FR')}
              </Badge>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyLink(t.token)}>
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={() => revokeMut.mutate({ id: t.id, dossierId })}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">Email client (optionnel)</Label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@email.com"
            className="h-8 text-sm"
          />
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={createMut.isPending}
          className="gap-1.5"
        >
          {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Générer lien
        </Button>
      </div>
    </div>
  );
}
