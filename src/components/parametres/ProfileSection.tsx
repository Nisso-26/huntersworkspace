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

export default function ProfileSection() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name || '');
    supabase.from('profiles').select('zone').eq('id', user.id).single().then(({ data }) => {
      if (data) setZone(data.zone || '');
    });
  }, [user]);

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (!authErr) {
      await supabase.from('profiles').update({ full_name: fullName, zone, updated_at: new Date().toISOString() } as any).eq('id', user.id);
    }
    setSaving(false);
    if (authErr) toast.error(authErr.message);
    else toast.success('Profil mis à jour');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast.error('6 caractères minimum'); return; }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success('Mot de passe mis à jour'); setNewPassword(''); }
  };

  const roleLabelsMap: Record<string, string> = {
    super_admin: 'Super Admin', mandataire: 'Mandataire', decoratrice: 'Décoratrice',
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Profil</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nom complet</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="opacity-70" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zone</Label><Input value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Paris, Lyon..." /></div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-secondary">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">{role ? roleLabelsMap[role] : '...'}</span>
          </div>
          <Button onClick={updateProfile} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Sécurité</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button onClick={changePassword} disabled={changingPwd} variant="outline">{changingPwd ? 'Modification...' : 'Changer le mot de passe'}</Button>
        </div>
      </Card>
    </div>
  );
}

