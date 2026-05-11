import { useState, useEffect } from 'react';
import { useClientTokens, useCreateClientToken, useRevokeClientToken } from '@/hooks/use-client-portal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

export function ClientComments({ dossierId }: { dossierId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('client_comments' as any)
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[ClientComments] table client_comments inaccessible:', error.message);
        }
        setComments(data || []);
        setLoading(false);
      });
  }, [dossierId]);

  if (loading) return <p className="text-xs text-muted-foreground">Chargement...</p>;
  if (comments.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-3">Aucun commentaire client.</p>
  );

  return (
    <div className="space-y-2 mt-2">
      {comments.map((c: any) => (
        <div key={c.id} className="bg-secondary/30 rounded-lg px-3 py-2 text-sm">
          <p className="text-foreground">{c.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      ))}
    </div>
  );
}
