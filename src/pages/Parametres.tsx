import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Shield, Bell, Lock } from 'lucide-react';

export default function Parametres() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const updateProfile = async () => {
    setSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (!authErr && user) {
      await supabase.from('profiles').update({ full_name: fullName, updated_at: new Date().toISOString() } as any).eq('id', user.id);
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configuration de votre compte HUNTERS</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile */}
          <div className="bg-card rounded-xl border shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-semibold text-foreground">Profil</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="opacity-70" />
              </div>
              <Button onClick={updateProfile} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="bg-card rounded-xl border shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-accent" />
              <h2 className="font-heading font-semibold text-foreground">Sécurité</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>
              <Button onClick={changePassword} disabled={changingPwd} variant="outline">
                {changingPwd ? 'Modification...' : 'Changer le mot de passe'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
