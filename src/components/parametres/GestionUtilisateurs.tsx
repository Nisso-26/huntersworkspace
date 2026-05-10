import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User, Lock, MapPin, Shield, Bell, Building2, Receipt, Network, FileText,
  History, Plus, Trash2, Save, AlertTriangle, UserPlus,
} from 'lucide-react';
import {
  useCompanySettings, useUpdateCompanySettings,
  useHonorairesTranches, useSaveHonorairesTranches,
  useAuditLog, type CompanySettings, type HonorairesTranche,
} from '@/hooks/use-company-settings';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function GestionUtilisateurs() {
  const { user: currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('mandataire');
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; name: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

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
    if (!email || !fullName || !password) {
      toast.error('Tous les champs sont requis');
      return;
    }
    if (password.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    setCreating(true);
    try {
      const res = await supabase.functions.invoke('create-user', {
        body: { email, password, full_name: fullName, role },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Utilisateur ${fullName} créé avec succès`);
      setEmail(''); setFullName(''); setPassword(''); setRole('mandataire');
      loadUsers();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    setActionLoading(userId);
    try {
      const res = await supabase.functions.invoke('manage-user', {
        body: { user_id: userId, action },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      // Ferme le dialog d'abord, puis notifie/recharge après démontage Radix
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
  };

  return (
    <>
      <Card className="p-6 space-y-6">
        <h3 className="text-lg font-heading font-bold flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary" /> Créer un utilisateur
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@hunters.fr" />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe initial</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mandataire">Conseiller</SelectItem>
                <SelectItem value="decoratrice">Décoratrice</SelectItem>
                <SelectItem value="super_admin">Directeur</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={creating}>
          <UserPlus className="w-4 h-4 mr-1" /> {creating ? 'Création...' : 'Créer l\'utilisateur'}
        </Button>

        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Utilisateurs existants ({users.length})</h4>
          {loadingUsers ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : (
            <div className="space-y-2">
              {users.map(u => {
                const isCurrentUser = u.id === currentUser?.id;
                const isDisabled = u.status === 'inactif';
                return (
                  <div key={u.id} className={cn('flex items-center justify-between p-3 rounded-lg border', isDisabled ? 'bg-destructive/5 opacity-70' : 'bg-muted/30')}>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {u.full_name || 'Sans nom'}
                          {isDisabled && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Désactivé</Badge>}
                          {isCurrentUser && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Vous</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.role === 'super_admin' ? 'default' : 'secondary'}>
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

      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (actionLoading) return; if (!o) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'delete' ? 'Supprimer l\'utilisateur ?' : 'Désactiver l\'utilisateur ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'delete'
                ? `L'utilisateur "${confirmAction?.name}" sera définitivement supprimé ainsi que toutes ses données associées. Cette action est irréversible.`
                : `L'utilisateur "${confirmAction?.name}" ne pourra plus se connecter. Vous pourrez le réactiver ultérieurement.`}
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

