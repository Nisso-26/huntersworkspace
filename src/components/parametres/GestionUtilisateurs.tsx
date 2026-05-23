import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserPlus, Trash2, Copy, CheckCircle2 } from 'lucide-react';

export default function GestionUtilisateurs() {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>('mandataire');
  const [creating, setCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; name: string } | null>(null);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email, status, created_at');
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const roleMap = (roles || []).reduce((acc: Record<string, string>, r: any) => {
      acc[r.user_id] = r.role;
      return acc;
    }, {});
    setUsers((profiles || []).map(p => ({ ...p, role: roleMap[p.id] || 'mandataire' })));
    setLoadingUsers(false);
  };

  const handleCreate = async () => {
    if (!email || !fullName) {
      toast.error('Le nom complet et l\'email sont requis');
      return;
    }
    setCreating(true);
    setInviteLink(null);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: {
          mode: 'invite',
          email,
          full_name: fullName,
          role,
          app_url: window.location.origin,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      toast.success(`Invitation envoyée à ${fullName}`);
      setInviteLink(res.data?.invitation_link ?? null);
      setEmail('');
      setFullName('');
      setRole('mandataire');
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'invitation');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Lien copié dans le presse-papier');
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { user_id: userId, action },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      setConfirmAction(null);
      setTimeout(() => {
        toast.success(res.data.message);
        loadUsers();
      }, 50);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
      setConfirmAction(null);
    } finally {
      setActionLoading(null);
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: 'Directeur',
    mandataire: 'Conseiller',
    decoratrice: 'Décoratrice',
    analyste: 'Analyste patrimoniale',
  };

  return (
    <>
      <Card className="p-6 space-y-6">
        <h3 className="text-lg font-heading font-bold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" /> Inviter un collaborateur
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="label-premium">Nom complet *</Label>
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jean DUPONT"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="label-premium">Email professionnel *</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jean@hunters.fr"
              className="h-10"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="label-premium">Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-10 w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mandataire">Conseiller en investissement</SelectItem>
                <SelectItem value="analyste">Analyste patrimoniale</SelectItem>
                <SelectItem value="decoratrice">Décoratrice</SelectItem>
                <SelectItem value="super_admin">Directeur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={creating}
          className="bg-primary hover:bg-primary/90 text-white gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {creating ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
        </Button>

        {/* Lien d'activation généré */}
        {inviteLink && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-sm font-semibold text-primary">Lien d'activation généré</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Transmettez ce lien au collaborateur pour qu'il définisse son mot de passe. Il expire dans 24h.
            </p>
            <div className="flex gap-2 items-center">
              <Input
                readOnly
                value={inviteLink}
                className="flex-1 text-xs font-mono bg-white border-border/60 cursor-text"
                onClick={e => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className="flex-shrink-0 gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copié !' : 'Copier'}
              </Button>
            </div>
          </div>
        )}

        {/* Liste des utilisateurs */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3 text-foreground">
            Collaborateurs ({users.length})
          </h4>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const isCurrentUser = u.id === currentUser?.id;
                const isDisabled = u.status === 'suspendu' || u.status === 'inactif';
                return (
                  <div
                    key={u.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      isDisabled ? 'bg-destructive/5 opacity-70 border-destructive/20' : 'bg-muted/30 border-border/60'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-primary">
                          {(u.full_name || u.email || '?').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                          {u.full_name || 'Sans nom'}
                          {isDisabled && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Désactivé</Badge>
                          )}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Vous</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={u.role === 'super_admin' ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {roleLabels[u.role] || u.role}
                      </Badge>
                      {!isCurrentUser && (
                        <div className="flex gap-1">
                          {isDisabled ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => handleUserAction(u.id, 'enable')}
                            >
                              {actionLoading === u.id ? '...' : 'Réactiver'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionLoading === u.id}
                              onClick={() => setConfirmAction({ userId: u.id, action: 'disable', name: u.full_name || u.email })}
                            >
                              Désactiver
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading === u.id}
                            onClick={() => setConfirmAction({ userId: u.id, action: 'delete', name: u.full_name || u.email })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(o) => { if (actionLoading) return; if (!o) setConfirmAction(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'delete' ? 'Supprimer ce collaborateur ?' : 'Désactiver ce collaborateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'delete'
                ? `"${confirmAction?.name}" sera définitivement supprimé ainsi que toutes ses données. Cette action est irréversible.`
                : `"${confirmAction?.name}" ne pourra plus se connecter. Vous pourrez le réactiver ultérieurement.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleUserAction(confirmAction.userId, confirmAction.action)}
              className={confirmAction?.action === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction?.action === 'delete' ? 'Supprimer définitivement' : 'Désactiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
