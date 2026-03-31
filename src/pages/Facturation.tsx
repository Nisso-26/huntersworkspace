import AppLayout from '@/components/AppLayout';
import { CreditCard, FileText, AlertTriangle } from 'lucide-react';
import { mandataires } from '@/data/mock-data';
import StatCard from '@/components/StatCard';
import { cn } from '@/lib/utils';

const paiements = mandataires.map(m => ({
  ...m,
  montant: 99,
  datePaiement: m.dernierPaiement,
}));

export default function Facturation() {
  const totalMensuel = mandataires.filter(m => m.abonnementStatus === 'actif').length * 99;
  const impayes = mandataires.filter(m => m.abonnementStatus === 'impaye').length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Facturation</h1>
          <p className="text-muted-foreground mt-1">Abonnements et commissions du réseau</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Revenu abonnements/mois" value={`${totalMensuel} €`} icon={CreditCard} variant="gold" />
          <StatCard label="Factures émises" value={mandataires.length} icon={FileText} />
          <StatCard label="Impayés" value={impayes} icon={AlertTriangle} variant={impayes > 0 ? 'default' : 'success'} />
        </div>

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-heading text-lg font-semibold text-foreground">Historique des paiements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-secondary/50">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Mandataire</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Zone</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Abonnement</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Dernier paiement</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paiements.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{p.name}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{p.zone}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{p.montant} € HT/mois</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        p.abonnementStatus === 'actif' ? 'bg-hunters-success/10 text-hunters-success' :
                        p.abonnementStatus === 'impaye' ? 'bg-destructive/10 text-destructive' :
                        'bg-hunters-warning/10 text-hunters-warning'
                      )}>
                        {p.abonnementStatus === 'actif' ? 'Payé' : p.abonnementStatus === 'impaye' ? 'Impayé' : 'Suspendu'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
