import { BriefcaseBusiness, CircleGauge, Landmark, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Dossier } from '@/hooks/use-dossiers';
import type { FicheValues } from '@/lib/fiche-client-fields';

interface Props {
  dossier: Dossier;
  fiche: FicheValues;
  onOpenForm: () => void;
}

const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `${amount.toLocaleString('fr-FR')} €` : '—';
};

const text = (value: unknown) => value ? String(value) : '—';

export default function DossierClientSummary({ dossier, fiche, onOpenForm }: Props) {
  const score = Number((dossier as any).score_qualification) || 0;
  const niveau = (dossier as any).niveau_qualification || (score >= 6 ? 'Expert' : score >= 3 ? 'Complexe' : 'Standard');
  const tarif = Number((dossier as any).tarif_conseil_ht) || (score >= 6 ? 3500 : score >= 3 ? 2500 : 1500);
  const revenusFoyer = Number(fiche.revenus_nets_mensuels || 0) + Number(fiche.revenus_conjoint || 0) + Number(fiche.revenus_locatifs_existants || 0);

  const cards = [
    {
      title: 'Situation',
      icon: Users,
      rows: [
        ['Situation familiale', text(fiche.situation_familiale)],
        ['Foyer', fiche.nombre_enfants ? `${fiche.nombre_enfants} enfant${Number(fiche.nombre_enfants) > 1 ? 's' : ''}` : '—'],
        ['Profession', text(fiche.profession || fiche.statut_professionnel)],
        ['Revenus du foyer', money(revenusFoyer)],
        ['Fiscalité', fiche.tmi ? `TMI ${fiche.tmi} %` : '—'],
      ],
    },
    {
      title: 'Capacité financière',
      icon: Landmark,
      rows: [
        ['Enveloppe projet', money(dossier.budget)],
        ['Apport disponible', money(fiche.apport_disponible)],
        ['Capacité d’emprunt', money(fiche.capacite_emprunt_estimee)],
        ['Épargne mensuelle', money(fiche.capacite_epargne_mensuelle)],
        ['Taux d’endettement', fiche.taux_endettement_actuel ? `${fiche.taux_endettement_actuel} %` : '—'],
      ],
    },
    {
      title: 'Profil investisseur',
      icon: CircleGauge,
      rows: [
        ['Objectif', text(fiche.objectif_principal)],
        ['Tolérance au risque', text(fiche.appetence_risque)],
        ['Horizon', text(fiche.horizon_investissement)],
        ['Gestion', text(fiche.aversion_gestion)],
        ['Bien recherché', text(fiche.type_bien_souhaite)],
      ],
    },
  ];

  return (
    <section aria-labelledby="client-summary-title" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase text-hunters-or">Profil client</p>
          <h2 id="client-summary-title" className="mt-1 text-xl">Vue synthétique</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenForm}>Ouvrir le formulaire complet</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, icon: Icon, rows }) => (
          <article key={title} className="border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
              <Icon className="h-4 w-4 text-hunters-or" />
              <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <dl className="space-y-2.5">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] uppercase text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}

        <article className="border border-primary bg-primary p-4 text-primary-foreground">
          <div className="mb-4 flex items-center gap-2 border-b border-primary-foreground/20 pb-3">
            <BriefcaseBusiness className="h-4 w-4 text-hunters-or" />
            <h3 className="text-sm font-semibold">Niveau et tarification</h3>
          </div>
          <p className="font-heading text-xl">Dossier {niveau}</p>
          <p className="mt-3 text-xs text-primary-foreground/70">Tarif conseil recommandé</p>
          <p className="mt-1 text-2xl font-semibold">{tarif.toLocaleString('fr-FR')} € HT</p>
        </article>
      </div>
    </section>
  );
}