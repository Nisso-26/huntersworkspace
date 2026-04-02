import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, MapPin, Shield } from 'lucide-react';

export default function Parametres() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name || '');
    // Fetch profile for zone
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

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    mandataire: 'Mandataire',
    decoratrice: 'Décoratrice',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configuration de votre compte HUNTERS</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
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
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zone géographique</Label>
                <Input value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Paris, Lyon..." />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
                <Shield className="w-4 h-4 text-accent" />
                <span className="text-sm text-foreground font-medium">{role ? roleLabels[role] : 'Chargement...'}</span>
              </div>
              <Button onClick={updateProfile} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>

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
