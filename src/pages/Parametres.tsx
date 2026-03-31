import AppLayout from '@/components/AppLayout';
import { Settings } from 'lucide-react';

export default function Parametres() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configuration de la plateforme HUNTERS</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: 'Profil entreprise', desc: 'Nom, logo, mentions légales, carte T' },
            { title: 'Abonnement', desc: 'Montant mensuel, taux de commission réseau' },
            { title: 'Notifications', desc: 'Alertes email, rappels, délais paramétrables' },
            { title: 'Sécurité', desc: 'Double authentification, expiration sessions' },
          ].map((item) => (
            <div key={item.title} className="bg-card rounded-xl border shadow-card p-5 hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
