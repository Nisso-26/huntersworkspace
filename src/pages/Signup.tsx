import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import huntersLogo from '@/assets/hunters-logo.jpg';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
        <div className="w-full max-w-md bg-card rounded-xl border shadow-card p-8 text-center">
          <img src={huntersLogo} alt="HUNTERS" className="h-12 object-contain mx-auto mb-6" />
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Vérifiez votre email</h2>
          <p className="text-muted-foreground text-sm">Un lien de confirmation a été envoyé à <strong>{email}</strong>.</p>
          <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Retour à la connexion</Link>
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
          <h1 className="text-2xl font-heading font-bold text-foreground text-center mb-2">Inscription</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Créez votre compte HUNTERS</p>
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Inscription...' : "S'inscrire"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
