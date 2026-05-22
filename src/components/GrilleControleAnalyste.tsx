import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateDossier, type Dossier } from '@/hooks/use-dossiers';
import { parseStrategie } from '@/lib/strategie-parser';

type Statut = 'ok' | 'ko' | 'na' | null;

interface ModifEntry {
  ref: string;
  modification: string;
  justification: string;
  champ_crm: string;
}

interface PointControle {
  ref: string;
  bloc: string;
  titre: string;
  detail: string;
  bloquant: boolean;
}

const POINTS_CONTROLE: readonly PointControle[] = [
  { ref: 'A1', bloc: 'A', titre: 'Identité et situation familiale complètes', detail: 'Nom, prénom, date de naissance, situation familiale, régime matrimonial', bloquant: false },
  { ref: 'A2', bloc: 'A', titre: 'Revenus nets cohérents avec le statut professionnel', detail: 'Salarié CDI : net plausible vs secteur. TNS : net après cotisations TNS.', bloquant: true },
  { ref: 'A3', bloc: 'A', titre: 'Charges mensuelles complètes et non sous-estimées', detail: 'Loyer RP + crédits en cours + charges. Vérifier crédits conso et LOA.', bloquant: false },
  { ref: 'A4', bloc: 'A', titre: 'TMI correctement renseigné', detail: 'Vérifier que le TMI correspond aux revenus imposables réels du foyer.', bloquant: true },
  { ref: 'A5', bloc: 'A', titre: 'Épargne disponible vs apport — distinction faite', detail: "L'apport ≠ épargne totale. Conserver 3-6 mois de charges en précaution.", bloquant: true },
  { ref: 'A6', bloc: 'A', titre: 'Patrimoine immobilier existant renseigné', detail: 'Valeur + capital restant dû de chaque bien locatif existant.', bloquant: false },
  { ref: 'A7', bloc: 'A', titre: 'IFI — assujettissement vérifié', detail: 'Si patrimoine net > 1,3 M€, champ assujetti_ifi doit être coché.', bloquant: false },
  { ref: 'B1', bloc: 'B', titre: "Taux d'effort actuel ≤ 35 % (seuil HCSF)", detail: '(Mensualités + loyer RP) / revenus nets. Si > 35% avec crédit recommandé : bloquer.', bloquant: true },
  { ref: 'B2', bloc: 'B', titre: "Capacité d'emprunt plausible (écart < 15 % vs calcul manuel)", detail: 'Vérifier avec PMT : revenus × 35% - charges actuelles × facteur durée/taux.', bloquant: true },
  { ref: 'B3', bloc: 'B', titre: 'Mensualité max supplémentaire cohérente', detail: '= revenus nets × 35% - mensualités actuelles. Ne doit pas dépasser le seuil HCSF.', bloquant: true },
  { ref: 'B4', bloc: 'B', titre: 'Cash-flow mensuel libre positif ou nul', detail: '= revenus - charges - mensualités. Si négatif, le mentionner explicitement.', bloquant: true },
  { ref: 'B5', bloc: 'B', titre: 'Revenus nets totaux = client + conjoint + locatifs', detail: "Vérifier que l'IA a intégré toutes les sources de revenus du formulaire.", bloquant: false },
  { ref: 'C1', bloc: 'C', titre: 'Dispositif recommandé adapté au TMI du client', detail: 'TMI 0-11%: LMNP classique. TMI 30%: LMNP/SCI IR. TMI 41-45%: SCI IS/nu-prop.', bloquant: true },
  { ref: 'C2', bloc: 'C', titre: 'Rendement brut estimé plausible selon la zone', detail: 'Tours/Angers/Le Mans: 5-7%. Paris: 2,5-4%. IDF: 4-5,5%. > 8% = vérifier.', bloquant: true },
  { ref: 'C3', bloc: 'C', titre: 'Budget acquisition cohérent avec capacité réelle', detail: 'Budget = apport + emprunt max. Si dépassement : corriger ou adapter le bien.', bloquant: true },
  { ref: 'C4', bloc: 'C', titre: 'Mensualité crédit estimée cohérente (écart ≤ 10%)', detail: 'PMT(taux/12, durée×12, -budget×0,8). 100k€ à 4% 20 ans ≈ 606€/mois.', bloquant: false },
  { ref: 'C5', bloc: 'C', titre: 'Loyer brut mensuel estimé plausible (vérifier le marché)', detail: 'Vérifier sur SeLoger/PAP le loyer de marché pour le type de bien et la zone.', bloquant: true },
  { ref: 'C6', bloc: 'C', titre: 'Cash-flow net inclut les charges propriétaire', detail: 'Taxe foncière ÷ 12 + PNO + charges copro non récupérables ≈ 20% du loyer.', bloquant: true },
  { ref: 'C7', bloc: 'C', titre: 'Économie fiscale annuelle vérifiée par régime', detail: 'LMNP: amortissements × TMI. Déficit: travaux × TMI, plafonné 10 700€/an.', bloquant: true },
  { ref: 'C8', bloc: 'C', titre: 'Horizon recommandé cohérent avec objectif client', detail: 'Revente < 5 ans : éviter dispositifs à sortie contrainte (Pinel, Malraux).', bloquant: false },
  { ref: 'C9', bloc: 'C', titre: 'Zones suggérées cohérentes avec contraintes géographiques', detail: "Vérifier que l'IA ne recommande pas une zone exclue dans le formulaire.", bloquant: false },
  { ref: 'C10', bloc: 'C', titre: 'Minimum 2 recommandations distinctes générées', detail: 'Si une seule recommandation : régénérer ou compléter manuellement.', bloquant: false },
  { ref: 'D1', bloc: 'D', titre: "Plan d'action en 4 à 6 étapes séquentielles", detail: '< 4 étapes = trop vague. > 8 = trop complexe. Rééquilibrer si nécessaire.', bloquant: false },
  { ref: 'D2', bloc: 'D', titre: 'Délais réalistes selon le marché', detail: 'Rencontre banque: 2-4 sem. Trouver le bien: 2-6 mois selon tension marché.', bloquant: false },
  { ref: 'D3', bloc: 'D', titre: 'Première étape = action immédiate pour le client', detail: 'Doit commencer par quelque chose que le client fait cette semaine.', bloquant: false },
  { ref: 'E1', bloc: 'E', titre: "Points d'attention spécifiques au profil (non génériques)", detail: "Au moins un point d'attention doit être propre au profil de ce client.", bloquant: false },
  { ref: 'E2', bloc: 'E', titre: 'Disclaimer légal présent dans le rapport', detail: "Le texte 'fourni à titre indicatif... ne constitue pas un conseil' doit figurer.", bloquant: true },
  { ref: 'E3', bloc: 'E', titre: "Aucun conseil fiscal illicite (Hunters n'est pas CIF)", detail: "Pas de 'vous devez opter pour X' ou montants fiscaux au centime près.", bloquant: true },
  { ref: 'E4', bloc: 'E', titre: 'Données personnelles sensibles non exposées dans le PDF', detail: 'Pas de NSS, RIB, ou donnée inutile à la stratégie dans le rapport exporté.', bloquant: false },
  { ref: 'F1', bloc: 'F', titre: 'Numéro de dossier correct sur le rapport PDF', detail: 'Le numéro affiché dans le PDF = numéro_dossier dans Workspace.', bloquant: false },
  { ref: 'F2', bloc: 'F', titre: 'Nom du client correctement orthographié', detail: 'Vérifier avant export, notamment les noms composés ou étrangers.', bloquant: false },
  { ref: 'F3', bloc: 'F', titre: 'Rapport sauvegardé dans le dossier Workspace', detail: 'PDF attaché au dossier dans le CRM, pas seulement téléchargé localement.', bloquant: true },
  { ref: 'F4', bloc: 'F', titre: 'Statut dossier mis à jour après validation', detail: "Le pipeline doit passer à 'conseil' dans Hunters Workspace à la transmission.", bloquant: true },
  { ref: 'F5', bloc: 'F', titre: 'Analyste disponible pour les questions du mandataire', detail: 'Indiquer la fenêtre de disponibilité au mandataire avant transmission.', bloquant: false },
] as const;

const BLOCS: Record<string, string> = {
  A: 'Cohérence des données client',
  B: "Indicateurs clés générés par l'IA",
  C: 'Recommandations et dispositifs fiscaux',
  D: "Plan d'action",
  E: 'Conformité et mentions légales',
  F: 'Transmission au mandataire',
};

export function GrilleStatutBadge({ statut }: { statut?: string | null }) {
  if (statut === 'valide') {
    return (
      <Badge className="bg-[#1A4D2E] text-white border-transparent hover:bg-[#1A4D2E] gap-1">
        <ShieldCheck className="w-3 h-3" /> Grille validée
      </Badge>
    );
  }
  if (statut === 'en_cours') {
    return (
      <Badge className="bg-[#F5A800] text-[#1A4D2E] border-transparent hover:bg-[#F5A800] gap-1">
        <AlertTriangle className="w-3 h-3" /> Grille en cours
      </Badge>
    );
  }
  return null;
}

interface Props {
  dossier: Dossier & {
    grille_controle?: Record<string, Statut> | null;
    grille_validee_at?: string | null;
    grille_validee_par?: string | null;
    grille_statut?: string | null;
    grille_modifications?: ModifEntry[] | null;
  };
}

export default function GrilleControleAnalyste({ dossier }: Props) {
  const { isAdmin, user } = useAuth();
  const updateMut = useUpdateDossier();

  const parsed = parseStrategie(dossier.strategie);
  const hasStrategie = !!parsed.strategie || parsed.isPlainText;

  const [controles, setControles] = useState<Record<string, Statut>>(
    (dossier.grille_controle as Record<string, Statut>) || {},
  );
  const [modifications, setModifications] = useState<ModifEntry[]>(
    (dossier.grille_modifications as ModifEntry[]) || [],
  );
  const [actions, setActions] = useState<Record<string, string>>({});
  const [visaAnalyste, setVisaAnalyste] = useState(
    dossier.grille_validee_par || user?.email || '',
  );

  const { nbBloquantsKO, nbNonRenseignes, rapportValide } = useMemo(() => {
    let bloquantsKO = 0;
    let nonRenseignes = 0;
    for (const p of POINTS_CONTROLE) {
      const s = controles[p.ref];
      if (!s) nonRenseignes++;
      if (s === 'ko' && p.bloquant) bloquantsKO++;
    }
    return {
      nbBloquantsKO: bloquantsKO,
      nbNonRenseignes: nonRenseignes,
      rapportValide: bloquantsKO === 0 && nonRenseignes === 0,
    };
  }, [controles]);

  if (!hasStrategie) return null;

  // Mandataire : badge uniquement, pas la grille
  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Contrôle qualité analyste :</span>
        <GrilleStatutBadge statut={dossier.grille_statut} />
        {!dossier.grille_statut && <span className="italic">en attente</span>}
      </div>
    );
  }

  const setStatut = (ref: string, s: Statut) => {
    setControles(c => ({ ...c, [ref]: c[ref] === s ? null : s }));
  };

  const handleSave = async (statut: 'en_cours' | 'valide') => {
    if (statut === 'valide' && (!rapportValide || !visaAnalyste.trim())) return;
    await updateMut.mutateAsync({
      id: dossier.id,
      grille_controle: controles as any,
      grille_modifications: modifications as any,
      grille_statut: statut,
      grille_validee_par: statut === 'valide' ? visaAnalyste.trim() : null,
      grille_validee_at: statut === 'valide' ? new Date().toISOString() : null,
    } as any);
    if (statut === 'valide') {
      toast.success('Rapport validé — le mandataire peut maintenant consulter le rapport');
    } else {
      toast.success('Grille enregistrée');
    }
  };

  const blocsOrdre = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-heading font-bold text-[#1A4D2E]">
            Grille de contrôle qualité — 25 points
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Validation analyste avant transmission au mandataire
          </p>
        </div>
        <GrilleStatutBadge statut={dossier.grille_statut} />
      </div>

      {blocsOrdre.map(bloc => {
        const points = POINTS_CONTROLE.filter(p => p.bloc === bloc);
        const valides = points.filter(p => controles[p.ref]).length;
        return (
          <div key={bloc} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{ backgroundColor: '#F5A800', color: '#1A4D2E' }}
            >
              <span className="font-bold text-sm">
                Bloc {bloc} — {BLOCS[bloc]}
              </span>
              <span className="text-xs font-semibold">
                ({valides}/{points.length} points renseignés)
              </span>
            </div>
            <div className="divide-y">
              {points.map(p => {
                const statut = controles[p.ref];
                return (
                  <div
                    key={p.ref}
                    className={cn('px-4 py-3', p.bloquant && 'bg-red-50/50')}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-[280px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold text-muted-foreground">
                            {p.ref}
                          </span>
                          <span className="font-semibold text-sm text-foreground">
                            {p.titre}
                          </span>
                          {p.bloquant && (
                            <Badge variant="destructive" className="text-[10px] h-5">
                              Bloquant
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs italic text-muted-foreground mt-1">
                          {p.detail}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(['ok', 'ko', 'na'] as const).map(s => {
                          const active = statut === s;
                          const colors = {
                            ok: active
                              ? 'bg-[#1A4D2E] text-white border-[#1A4D2E]'
                              : 'border-[#1A4D2E]/30 text-[#1A4D2E] hover:bg-[#1A4D2E]/10',
                            ko: active
                              ? 'bg-destructive text-destructive-foreground border-destructive'
                              : 'border-destructive/30 text-destructive hover:bg-destructive/10',
                            na: active
                              ? 'bg-muted-foreground text-white border-muted-foreground'
                              : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted',
                          }[s];
                          return (
                            <button
                              type="button"
                              key={s}
                              onClick={() => setStatut(p.ref, s)}
                              className={cn(
                                'px-3 py-1 text-xs font-semibold border rounded-sm transition-colors',
                                colors,
                              )}
                            >
                              {s.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {statut === 'ko' && p.bloquant && (
                      <Textarea
                        placeholder="Action corrective requise..."
                        value={actions[p.ref] || ''}
                        onChange={e =>
                          setActions(a => ({ ...a, [p.ref]: e.target.value }))
                        }
                        rows={2}
                        className="mt-2 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Tableau de traçabilité */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-semibold text-sm text-[#1A4D2E]">
            Traçabilité des modifications apportées au rapport
          </h4>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setModifications(m => [
                ...m,
                { ref: '', modification: '', justification: '', champ_crm: '' },
              ])
            }
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </Button>
        </div>
        {modifications.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucune modification enregistrée.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-2 w-20">Réf.</th>
                  <th className="py-2 pr-2">Modification</th>
                  <th className="py-2 pr-2">Justification</th>
                  <th className="py-2 pr-2 w-40">Champ CRM</th>
                  <th className="py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {modifications.map((mod, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <Input
                        value={mod.ref}
                        onChange={e =>
                          setModifications(m =>
                            m.map((x, j) => (j === i ? { ...x, ref: e.target.value } : x)),
                          )
                        }
                        placeholder="B2"
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={mod.modification}
                        onChange={e =>
                          setModifications(m =>
                            m.map((x, j) =>
                              j === i ? { ...x, modification: e.target.value } : x,
                            ),
                          )
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={mod.justification}
                        onChange={e =>
                          setModifications(m =>
                            m.map((x, j) =>
                              j === i ? { ...x, justification: e.target.value } : x,
                            ),
                          )
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={mod.champ_crm}
                        onChange={e =>
                          setModifications(m =>
                            m.map((x, j) =>
                              j === i ? { ...x, champ_crm: e.target.value } : x,
                            ),
                          )
                        }
                        className="h-8 text-xs"
                      />
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          setModifications(m => m.filter((_, j) => j !== i))
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bandeau sticky */}
      <div className="sticky bottom-2 z-10 bg-card border-2 border-[#1A4D2E]/20 rounded-lg p-4 shadow-lg space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant={nbBloquantsKO > 0 ? 'destructive' : 'outline'}
            className="font-mono"
          >
            {nbBloquantsKO} KO bloquant{nbBloquantsKO > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {nbNonRenseignes} non renseigné{nbNonRenseignes > 1 ? 's' : ''}
          </Badge>
          {dossier.grille_validee_at && (
            <span className="text-xs text-muted-foreground">
              Validé le{' '}
              {new Date(dossier.grille_validee_at).toLocaleString('fr-FR')} par{' '}
              <strong>{dossier.grille_validee_par}</strong>
            </span>
          )}
        </div>
        <Separator />
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="text-xs font-semibold text-muted-foreground">
              Visa analyste
            </label>
            <Input
              value={visaAnalyste}
              onChange={e => setVisaAnalyste(e.target.value)}
              placeholder="Nom ou email de l'analyste"
              className="h-9 mt-1"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave('en_cours')}
            disabled={updateMut.isPending}
          >
            Enregistrer le brouillon
          </Button>
          <Button
            type="button"
            onClick={() => handleSave('valide')}
            disabled={!rapportValide || !visaAnalyste.trim() || updateMut.isPending}
            className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 text-white gap-1"
          >
            <ShieldCheck className="w-4 h-4" />
            Valider et transmettre
          </Button>
        </div>
      </div>
    </div>
  );
}
