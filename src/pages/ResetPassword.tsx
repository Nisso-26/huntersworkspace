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

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setReady(true);
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Mot de passe mis à jour');
      navigate('/');
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
        <div className="bg-card rounded-xl border shadow-card p-8 text-center max-w-md">
          <img src={huntersLogo} alt="HUNTERS" className="h-12 object-contain mx-auto mb-4" />
          <p className="text-muted-foreground">Lien de réinitialisation invalide ou expiré.</p>
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
        <div className="bg-card rounded-xl border shadow-card p-8">
          <h1 className="text-2xl font-heading font-bold text-foreground text-center mb-6">Nouveau mot de passe</h1>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
