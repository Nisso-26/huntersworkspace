import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import huntersLogo from '@/assets/hunters-logo.jpg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={huntersLogo} alt="HUNTERS" className="h-16 object-contain" />
        </div>
        <div className="bg-card rounded-xl border shadow-card p-8">
          {sent ? (
            <div className="text-center">
              <h2 className="text-xl font-heading font-bold text-foreground mb-2">Email envoyé</h2>
              <p className="text-muted-foreground text-sm">Vérifiez votre boîte mail pour réinitialiser votre mot de passe.</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">Retour à la connexion</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-heading font-bold text-foreground text-center mb-6">Mot de passe oublié</h1>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Envoi...' : 'Réinitialiser'}
                </Button>
              </form>
              <Link to="/login" className="mt-4 block text-center text-sm text-primary hover:underline">Retour à la connexion</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
