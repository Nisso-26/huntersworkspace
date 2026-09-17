import { CalendarDays, ChevronDown, Clock3, FolderOpen, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useEvenements } from '@/hooks/use-evenements';
import type { Dossier } from '@/hooks/use-dossiers';
import { cn } from '@/lib/utils';

interface Props {
  dossier: Dossier;
  dossiers: Dossier[];
}

const eventType = (value: string) => value.replaceAll('_', ' ').replace(/^./, char => char.toUpperCase());

export default function DossierContextRail({ dossier, dossiers }: Props) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: evenements = [] } = useEvenements();
  const [open, setOpen] = useState(false);

  const otherDossiers = useMemo(() => dossiers
    .filter(item => item.id !== dossier.id)
    .filter(item => isAdmin || item.mandataire_id === user?.id)
    .slice(0, 8), [dossiers, dossier.id, isAdmin, user?.id]);

  const prochainesEcheances = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return evenements
      .filter(event => event.dossier_id === dossier.id && new Date(event.date_debut) >= now)
      .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
      .slice(0, 3);
  }, [evenements, dossier.id]);

  return (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start" aria-label="Contexte du dossier">
      <Collapsible open={open} onOpenChange={setOpen}>
        <section className="border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-[11px] font-medium uppercase text-hunters-or">Navigation</p>
              <h2 className="font-body text-sm font-semibold">Autres dossiers</h2>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? 'Masquer les autres dossiers' : 'Afficher les autres dossiers'}>
                <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent forceMount className={cn('data-[state=closed]:hidden lg:!block')}>
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {otherDossiers.length ? otherDossiers.map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-none px-4 py-3 text-left"
                  onClick={() => navigate(`/dossiers/${item.id}`)}
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.client_name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{item.numero_dossier || 'Sans numéro'}</span>
                  </span>
                  <StatusBadge status={item.status} size="sm" />
                </Button>
              )) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Aucun autre dossier</p>
              )}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <section className="border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-[11px] font-medium uppercase text-hunters-or">Agenda</p>
          <h2 className="font-body text-sm font-semibold">Prochaines échéances</h2>
        </div>
        <div className="divide-y divide-border">
          {prochainesEcheances.length ? prochainesEcheances.map(event => {
            const date = new Date(event.date_debut);
            return (
              <div key={event.id} className="flex gap-3 px-4 py-3">
                <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center border border-border bg-secondary">
                  <span className="text-xs font-semibold text-primary">{date.toLocaleDateString('fr-FR', { day: '2-digit' })}</span>
                  <span className="text-[9px] uppercase text-muted-foreground">{date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{event.titre}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" />
                    {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {eventType(event.type)}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="px-4 py-6 text-center">
              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucune échéance à venir</p>
            </div>
          )}
        </div>
      </section>

      <section className="border border-primary bg-primary px-4 py-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-hunters-or" />
          <div>
            <p className="text-[10px] uppercase text-primary-foreground/70">Conseiller référent</p>
            <p className="text-sm font-semibold">{dossier.mandataire_name && dossier.mandataire_name !== 'Non assigné' ? dossier.mandataire_name : 'HUNTERS Immobilier'}</p>
          </div>
        </div>
      </section>
    </aside>
  );
}