import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import huntersLogo from '@/assets/hunters-logo.jpg';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<'invite' | 'recovery'>('recovery');

  useEffect(() => {
    const parseParams = () => {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const searchParams = new URLSearchParams(window.location.search);
      const get = (k: string) => hashParams.get(k) ?? searchParams.get(k);
      return {
        access_token: get('access_token'),
        refresh_token: get('refresh_token'),
        type: get('type'),
      };
    };

    const init = async () => {
      const { access_token, refresh_token, type } = parseParams();

      if ((type === 'invite' || type === 'recovery') && access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          setMode(type === 'invite' ? 'invite' : 'recovery');
          setReady(true);
        }
      }
      setChecking(false);
    };

    init();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(mode === 'invite' ? 'Compte activé avec succès' : 'Mot de passe mis à jour');
      navigate('/');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
        <div className="bg-card rounded-xl border border-border/60 shadow-card p-8 text-center max-w-md">
          <img src={huntersLogo} alt="HUNTERS" className="h-12 object-contain mx-auto mb-4" />
          <p className="text-muted-foreground">Lien invalide ou expiré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={huntersLogo} alt="HUNTERS" className="h-16 object-contain" />
        </div>
        <div className="bg-card rounded-xl border border-border/60 shadow-card p-8">
          <h1 className="text-2xl font-heading font-bold text-foreground text-center mb-2">
            {mode === 'invite' ? 'Activez votre compte' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === 'invite'
              ? 'Définissez votre mot de passe pour accéder à votre espace.'
              : 'Choisissez un nouveau mot de passe.'}
          </p>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {mode === 'invite' ? 'Mot de passe' : 'Nouveau mot de passe'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Enregistrement...'
                : mode === 'invite'
                ? 'Activer mon compte'
                : 'Mettre à jour'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
