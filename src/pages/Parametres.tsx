import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { User, Lock, MapPin, Shield, Bell } from 'lucide-react';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';

const alertLabels: Record<keyof AlertSettings, { label: string; description: string }> = {
  relance_client: { label: 'Relance client J+3', description: 'Alerte si un dossier reste en "Nouveau" après 3 jours' },
  chasse_30j: { label: 'Chasse > 30 jours', description: 'Alerte si un dossier est en chasse depuis plus de 30 jours' },
  compromis_rappel: { label: 'Rappels compromis', description: 'Alertes J-15 et J-7 avant signature acte' },
  acte_signe_facture: { label: 'Facture acte signé', description: 'Alerte quand un dossier passe en "Acte signé"' },
  pack_impaye: { label: 'Pack impayé', description: 'Alerte si un pack est impayé depuis plus de 5 jours' },
  commission_attente: { label: 'Commission en attente', description: 'Alerte si une commission est due depuis plus de 30 jours' },
  mandataire_inactif: { label: 'Mandataire inactif', description: 'Alerte si aucune activité depuis 60 jours' },
};

export default function Parametres() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const { settings, toggle } = useAlertSettings();

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
                <span className="text-sm text-foreground font-medium">{role ? roleLabelsMap[role] : 'Chargement...'}</span>
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

        {/* Alert settings */}
        <div className="bg-card rounded-xl border shadow-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="font-heading font-semibold text-foreground">Notifications & Alertes</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Activez ou désactivez chaque type d'alerte automatique</p>
          <div className="space-y-4">
            {(Object.keys(alertLabels) as Array<keyof AlertSettings>).map((key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{alertLabels[key].label}</p>
                  <p className="text-xs text-muted-foreground">{alertLabels[key].description}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
