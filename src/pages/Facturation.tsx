import AppLayout from '@/components/AppLayout';
import { CreditCard, FileText, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { cn } from '@/lib/utils';
import { useFactures, useUpdateFacture } from '@/hooks/use-factures';
import FactureDialog from '@/components/FactureDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const statutLabels: Record<string, string> = {
  en_attente: 'En attente', payee: 'Payée', impayee: 'Impayée', annulee: 'Annulée',
};

const statutStyles: Record<string, string> = {
  en_attente: 'bg-hunters-warning/10 text-hunters-warning',
  payee: 'bg-hunters-success/10 text-hunters-success',
  impayee: 'bg-destructive/10 text-destructive',
  annulee: 'bg-muted text-muted-foreground',
};

const typeLabels: Record<string, string> = {
  abonnement: 'Abonnement', commission: 'Commission', honoraires: 'Honoraires',
};

export default function Facturation() {
  const { data: factures = [], isLoading } = useFactures();
  const updateMut = useUpdateFacture();

  const totalPayees = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + f.montant, 0);
  const impayes = factures.filter(f => f.statut === 'impayee').length;

  const markPaid = (id: string) => {
    updateMut.mutate({ id, statut: 'payee', date_paiement: new Date().toISOString() } as any);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Facturation</h1>
            <p className="text-muted-foreground mt-1">Abonnements et commissions du réseau</p>
          </div>
          <FactureDialog />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total encaissé" value={`${totalPayees.toLocaleString('fr-FR')} €`} icon={CreditCard} variant="gold" />
              <StatCard label="Factures émises" value={factures.length} icon={FileText} />
              <StatCard label="Impayés" value={impayes} icon={AlertTriangle} variant={impayes > 0 ? 'default' : 'success'} />
            </>
          )}
        </div>

        <div className="bg-card rounded-xl border shadow-card overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-heading text-lg font-semibold text-foreground">Historique des factures</h2>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Référence</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Mandataire</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Type</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Montant</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Date</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {factures.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune facture</td></tr>
                  ) : (
                    factures.map((f) => (
                      <tr key={f.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.reference || '—'}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground">{f.mandataire_name}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{typeLabels[f.type] || f.type}</td>
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{f.montant.toLocaleString('fr-FR')} €</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                        <td className="px-5 py-3.5">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', statutStyles[f.statut])}>
                            {statutLabels[f.statut]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {f.statut !== 'payee' && f.statut !== 'annulee' && (
                            <Button variant="outline" size="sm" onClick={() => markPaid(f.id)}>
                              Marquer payée
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
