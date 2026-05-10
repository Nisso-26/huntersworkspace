import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import huntersLogo from '@/assets/hunters-logo.jpg';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Signup désactivé — accès sur invitation uniquement

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error('Identifiants incorrects. Vérifiez votre email et mot de passe.');
      return;
    }
    const next = searchParams.get('next') || '/';
    navigate(next, { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Panneau gauche — décoratif */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hunters flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/3 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-accent/8 translate-x-1/3 translate-y-1/3" />

        <div className="relative text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/10 mx-auto shadow-gold">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white font-heading tracking-tight">HUNTERS</h1>
            <p className="text-accent font-medium tracking-widest text-sm uppercase mt-1">Immobilier</p>
          </div>
          <div className="w-12 h-0.5 bg-accent/50 mx-auto rounded-full" />
          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Cabinet de conseil en investissement immobilier haut de gamme · Tours
          </p>
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo mobile */}
        <div className="lg:hidden mb-8 text-center">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary mx-auto mb-3">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground">HUNTERS</h1>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-2xl font-bold font-heading text-foreground">Connexion</h2>
            <p className="text-muted-foreground text-sm mt-1">Accédez à votre espace Hunters</p>
            <div className="bar-or mt-3" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="label-premium">Email professionnel</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="prenom@hunters.fr"
                required
                className="h-11 bg-card border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="label-premium">Mot de passe</Label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11 bg-card border-border/80 focus:border-primary focus:ring-1 focus:ring-primary/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold gap-2 group"
            >
              {loading ? 'Connexion...' : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Accès réservé aux membres du réseau Hunters.<br />
            Contactez votre directeur pour une invitation.
          </p>
        </div>
      </div>
    </div>
  );
}
