import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
import HelpTip from '@/components/HelpTip';
  useObjectifTrimestre, useHistoriqueObjectifs, useConseilsMois,
  useUpsertConseilMois, currentTrimestre, type ObjectifTrimestriel,
} from '@/hooks/use-objectifs';

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

function StatutBadge({ s }: { s: ObjectifTrimestriel['statut'] }) {
  if (s === 'atteint') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-hunters-success/10 text-hunters-success"><CheckCircle2 className="w-3 h-3"/>Objectif atteint</span>;
  if (s === 'insuffisant') return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-3 h-3"/>Insuffisant</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-hunters-warning/10 text-hunters-warning"><Clock className="w-3 h-3"/>En cours</span>;
}

function Bar({ label, value, target, suffix = '' }: { label: string; value: number; target: number; suffix?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const ok = value >= target;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={cn('font-semibold', ok ? 'text-hunters-success' : 'text-foreground')}>
          {value.toLocaleString('fr-FR')}{suffix} / {target.toLocaleString('fr-FR')}{suffix}
        </span>
      </div>
      <Progress value={pct} className={cn('h-2', ok && '[&>div]:bg-hunters-success')} />
    </div>
  );
}

export default function ObjectifsTab({ mandataireId, canEdit = false }: { mandataireId: string; canEdit?: boolean }) {
  const annee = new Date().getFullYear();
  const trimestre = currentTrimestre();
  const { data: obj, isLoading } = useObjectifTrimestre(mandataireId, annee, trimestre);
  const { data: historique = [] } = useHistoriqueObjectifs(mandataireId, 4);
  const { data: conseilsMois = [] } = useConseilsMois(mandataireId, annee);
  const upsertConseil = useUpsertConseilMois();

  const moisDuTrim = useMemo(() => [0,1,2].map(i => (trimestre - 1) * 3 + 1 + i), [trimestre]);
  const moisCourant = new Date().getMonth() + 1;
  const conseilDuMois = conseilsMois.find(c => c.mois === moisCourant);
  const moisDernierTermine = new Date().getDate() > 28 ? moisCourant : moisCourant - 1;
  const conseilManqueMoisDernier = moisDernierTermine >= 1 &&
    !(conseilsMois.find(c => c.mois === moisDernierTermine && c.nb_conseils_realises >= 1));

  if (isLoading || !obj) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;

  const handleAddConseil = (mois: number) => {
    const existing = conseilsMois.find(c => c.mois === mois);
    upsertConseil.mutate({
      mandataire_id: mandataireId, annee, mois,
      nb_conseils_realises: (existing?.nb_conseils_realises ?? 0) + 1,
      nb_conseils_objectif: existing?.nb_conseils_objectif ?? 1,
    });
  };

  return (
    <div className="space-y-5">
      {/* Bannière permanente */}
      <div className="p-3 rounded-sm border-2 border-destructive bg-destructive/5 text-sm text-destructive font-medium">
        ⚠️ Rappel : le conseil patrimonial est facturé au tarif plein — aucune remise autorisée, y compris en pack clé en main.
      </div>

      {/* Badge leads bloqués */}
      {obj.leads_bloques && (
        <div className="p-3 rounded-sm border-2 border-destructive bg-destructive/10 text-sm font-semibold text-destructive flex items-center gap-2">
          <Lock className="w-4 h-4"/> Leads bloqués — {obj.trimestres_rates_consecutifs} trimestres consécutifs ratés
        </div>
      )}

      {/* Trimestre courant */}
      <div className="bg-card rounded-xl border border-border/60 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Trimestre en cours</p>
            <h3 className="font-heading font-semibold flex items-center gap-2">
              T{obj.trimestre} {obj.annee}
              <HelpTip
                title="Objectifs du trimestre"
                intro="Chaque conseiller a trois objectifs sur trois mois : un chiffre d'affaires, un nombre de mandats signés et un nombre de conseils lancés."
                points={[
                  { label: 'Les barres', text: "elles montrent où vous en êtes par rapport à l'objectif. Elles se remplissent automatiquement avec vos dossiers." },
                  { label: 'Trimestre raté', text: "cela arrive et ne pose pas de problème en soi. C'est la répétition qui compte." },
                  { label: 'Leads bloqués', text: "après plusieurs trimestres ratés d'affilée, l'envoi de nouveaux contacts est suspendu. Il reprend dès qu'un trimestre est atteint." },
                ]}
                note="Les objectifs se clôturent automatiquement à la fin du trimestre : rien à faire de votre côté."
              />
            </h3>
          </div>
          <StatutBadge s={obj.statut} />
        </div>
        <div className="space-y-3">
          <Bar label="CA généré" value={obj.ca_realise} target={obj.ca_objectif} suffix=" €" />
          <Bar label="Mandats signés" value={obj.mandats_realises} target={obj.mandats_objectif} />
          <div className="space-y-1">
            <Bar label="Conseils initiés ce trimestre" value={obj.conseils_realises} target={obj.conseils_objectif} />
            <div className="flex gap-2 text-xs pt-1">
              {moisDuTrim.map(m => {
                const c = conseilsMois.find(x => x.mois === m);
                const ok = (c?.nb_conseils_realises ?? 0) >= (c?.nb_conseils_objectif ?? 1);
                return (
                  <span key={m} className="flex items-center gap-1">
                    {MOIS[m-1]} {ok ? '✅' : '❌'}
                    {canEdit && <Button size="sm" variant="ghost" className="h-5 px-1 text-[10px]" onClick={() => handleAddConseil(m)}>+1</Button>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Alerte conseil manquant */}
      {conseilManqueMoisDernier && (
        <div className="p-3 rounded-sm border border-hunters-warning bg-hunters-warning/10 text-sm text-hunters-warning font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4"/> Conseil manquant — mois de {MOIS[moisDernierTermine-1]}
        </div>
      )}

      {/* Historique */}
      <div className="bg-card rounded-xl border border-border/60 shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50">
          <h3 className="font-heading font-semibold text-sm">Historique — 4 derniers trimestres</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead>CA</TableHead>
              <TableHead>Mandats</TableHead>
              <TableHead>Conseils</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historique.map(h => (
              <TableRow key={h.id}>
                <TableCell className="font-medium">T{h.trimestre} {h.annee}</TableCell>
                <TableCell>{h.ca_realise.toLocaleString('fr-FR')} / {h.ca_objectif.toLocaleString('fr-FR')} €</TableCell>
                <TableCell>{h.mandats_realises} / {h.mandats_objectif}</TableCell>
                <TableCell>{h.conseils_realises} / {h.conseils_objectif}</TableCell>
                <TableCell><StatutBadge s={h.statut}/></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
