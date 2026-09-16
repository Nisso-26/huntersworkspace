import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import huntersLogoDark from '@/assets/hunters-symbol-dark.svg';
import huntersLogoLight from '@/assets/hunters-symbol-light.svg';


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
        token_hash: get('token_hash') ?? get('token'),
        code: get('code'),
        type: get('type'),
        error_code: get('error_code') ?? get('error'),
      };
    };

    const init = async () => {
      const { access_token, refresh_token, token_hash, code, type, error_code } = parseParams();

      if (type === 'invite' || type === 'recovery') {
        setMode(type === 'invite' ? 'invite' : 'recovery');
      }

      // 1) Le client Supabase consomme automatiquement le token présent dans l'URL
      // (detectSessionInUrl). Si une session existe déjà, ne PAS retenter de
      // vérifier le token : il est déjà consommé et un second appel échouerait.
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) {
        setReady(true);
        setChecking(false);
        return;
      }

      // Lien réellement en erreur signalé par Supabase (expiré, déjà utilisé...)
      if (error_code) {
        setChecking(false);
        return;
      }

      // 2) Pas de session : on tente la vérification manuelle selon le format du lien.
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) setReady(true);
      } else if (token_hash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type === 'invite' ? 'invite' : 'recovery',
        });
        if (!error) setReady(true);
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) setReady(true);
      }

      // 3) Petite tolérance : la détection automatique peut se terminer juste après.
      if (!ready) {
        const { data: { session: late } } = await supabase.auth.getSession();
        if (late) setReady(true);
      }

      setChecking(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="min-h-screen flex items-center justify-center bg-[#06381E] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06381E] p-4">
        <div className="bg-card rounded-xl border border-border/60 shadow-sm ring-1 ring-[#A87C25]/20 p-8 text-center max-w-md">
          <img src={huntersLogoLight} alt="HUNTERS" className="h-12 object-contain mx-auto mb-4" />
          <p className="text-muted-foreground">Lien invalide ou expiré.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06381E] p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={huntersLogoDark} alt="HUNTERS" className="h-16 object-contain" />
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
