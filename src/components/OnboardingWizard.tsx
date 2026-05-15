import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, User, FolderPlus, UserPlus, Sparkles } from 'lucide-react';
import huntersLogo from '@/assets/hunters-logo.jpg';

const STEPS = [
  { id: 1, title: 'Bienvenue', icon: Sparkles },
  { id: 2, title: 'Votre profil', icon: User },
  { id: 3, title: 'Premier dossier', icon: FolderPlus },
];

interface Props {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    phone: '',
    zone: '',
    bio: '',
  });

  const [dossier, setDossier] = useState({
    client_name: '',
    ville: '',
    budget: '',
  });

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        phone: profile.phone,
        zone: profile.zone,
        bio: profile.bio,
      } as any).eq('id', user.id);
      toast.success('Profil mis à jour');
      setStep(3);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDossier = async () => {
    if (!dossier.client_name || !dossier.ville) {
      toast.error('Le nom du client et la ville sont requis');
      return;
    }
    setSaving(true);
    try {
      const { data } = await supabase.from('dossiers').insert({
        client_name: dossier.client_name,
        ville: dossier.ville,
        budget: Number(dossier.budget) || 0,
        status: 'nouveau',
        mandataire_id: user?.id,
      } as any).select().single();
      toast.success('Premier dossier créé !');
      onComplete();
      if (data) navigate(`/dossiers/${(data as any).id}`);
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border/60 shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-hunters p-6 text-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 mx-auto mb-3">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white font-heading font-bold text-lg">Bienvenue chez Hunters !</h1>
          <p className="text-white/60 text-xs mt-1">Configurons votre espace en 3 étapes</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-border/40">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${step > s.id ? 'bg-primary text-white' :
                  step === s.id ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                  'bg-secondary text-muted-foreground'}`}>
                {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.id ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Contenu */}
        <div className="p-6">

          {/* Étape 1 — Bienvenue */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground text-lg">
                  Bonjour {user?.user_metadata?.first_name || user?.email?.split('@')[0]} !
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Votre espace Hunters est prêt. En quelques minutes, vous pourrez gérer vos dossiers clients,
                  générer des stratégies d'investissement et suivre vos missions.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: '📁', label: 'Dossiers clients' },
                  { icon: '📈', label: 'Stratégie patrimoniale' },
                  { icon: '📊', label: 'Suivi missions' },
                ].map(f => (
                  <div key={f.label} className="bg-secondary/40 rounded-xl p-3">
                    <div className="text-xl mb-1">{f.icon}</div>
                    <p className="text-[10px] font-semibold text-muted-foreground">{f.label}</p>
                  </div>
                ))}
              </div>
              <Button onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary/90 text-white gap-2">
                Commencer <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Étape 2 — Profil */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-bold text-foreground">Complétez votre profil</h2>
                <p className="text-xs text-muted-foreground mt-1">Ces informations apparaîtront dans vos dossiers clients.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="label-premium">Téléphone</Label>
                  <Input
                    value={profile.phone}
                    onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    placeholder="06 00 00 00 00"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Zone géographique</Label>
                  <Input
                    value={profile.zone}
                    onChange={e => setProfile(p => ({ ...p, zone: e.target.value }))}
                    placeholder="Tours, Indre-et-Loire"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1 text-muted-foreground">
                  Passer
                </Button>
                <Button onClick={handleSaveProfile} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                  {saving ? 'Sauvegarde...' : 'Continuer'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Étape 3 — Premier dossier */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-bold text-foreground">Créez votre premier dossier</h2>
                <p className="text-xs text-muted-foreground mt-1">Commencez avec un client réel ou un test.</p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="label-premium">Nom du client *</Label>
                  <Input
                    value={dossier.client_name}
                    onChange={e => setDossier(d => ({ ...d, client_name: e.target.value }))}
                    placeholder="Jean DUPONT"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Ville cible *</Label>
                  <Input
                    value={dossier.ville}
                    onChange={e => setDossier(d => ({ ...d, ville: e.target.value }))}
                    placeholder="Tours"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Budget (€)</Label>
                  <Input
                    type="number"
                    value={dossier.budget}
                    onChange={e => setDossier(d => ({ ...d, budget: e.target.value }))}
                    placeholder="150000"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onComplete} className="flex-1 text-muted-foreground">
                  Passer
                </Button>
                <Button onClick={handleCreateDossier} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                  {saving ? 'Création...' : 'Créer et démarrer'} <FolderPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
