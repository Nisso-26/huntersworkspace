import { Link } from 'react-router-dom';
import huntersLogo from '@/assets/hunters-logo.jpg';

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-navy p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={huntersLogo} alt="HUNTERS" className="h-16 object-contain" />
        </div>
        <div className="bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card p-8 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            Accès sur invitation
          </h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            L'accès à la plateforme HUNTERS est réservé aux membres du réseau.<br />
            Contactez votre directeur pour recevoir une invitation.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm text-primary hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
