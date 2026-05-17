import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, IdCard, Briefcase, Wallet, Calculator, Building2, Target, Banknote, Compass } from 'lucide-react';
import type { FicheValues } from '@/lib/fiche-client-fields';

interface Props {
  values: FicheValues;
  onChange: (patch: Partial<FicheValues>) => void;
}

const NONE = '__none__';

function SelectField({
  label, value, onChange, options, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || NONE} onValueChange={v => onChange(v === NONE ? '' : v)}>
        <SelectTrigger><SelectValue placeholder={placeholder || '—'} /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string; }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function JsonList<T extends Record<string, any>>({
  label, items, onChange, schema, empty,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  schema: { key: keyof T; label: string; type?: 'text' | 'number'; placeholder?: string }[];
  empty: T;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {items.length === 0 && <p className="text-xs text-muted-foreground italic">Aucune entrée</p>}
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 p-2 border border-border/60 rounded-md bg-muted/30">
          <div className={`flex-1 grid gap-2 grid-cols-${Math.min(schema.length, 3)}`}>
            {schema.map(s => (
              <Input
                key={String(s.key)}
                type={s.type || 'text'}
                placeholder={s.placeholder || s.label}
                value={it[s.key] ?? ''}
                onChange={e => {
                  const next = [...items];
                  next[i] = { ...next[i], [s.key]: s.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value };
                  onChange(next);
                }}
                className="h-8 text-sm"
              />
            ))}
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onChange([...items, { ...empty }])}>
        <Plus className="w-3.5 h-3.5" /> Ajouter
      </Button>
    </div>
  );
}

export default function FicheClientFields({ values, onChange }: Props) {
  const set = (k: string) => (v: any) => onChange({ [k]: v });

  return (
    <Accordion type="multiple" className="w-full">
      {/* IDENTITÉ */}
      <AccordionItem value="identite">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><IdCard className="w-4 h-4 text-primary" /> Identité &amp; situation personnelle</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <TextField label="Date de naissance" value={values.date_naissance} onChange={set('date_naissance')} type="date" />
            <TextField label="Nationalité" value={values.nationalite} onChange={set('nationalite')} />
            <SelectField label="Situation familiale" value={values.situation_familiale} onChange={set('situation_familiale')} options={[
              { value: 'celibataire', label: 'Célibataire' },
              { value: 'marie', label: 'Marié(e)' },
              { value: 'pacse', label: 'Pacsé(e)' },
              { value: 'divorce', label: 'Divorcé(e)' },
              { value: 'veuf', label: 'Veuf / Veuve' },
            ]} />
            <SelectField label="Régime matrimonial" value={values.regime_matrimonial} onChange={set('regime_matrimonial')} options={[
              { value: 'communaute', label: 'Communauté' },
              { value: 'separation', label: 'Séparation de biens' },
              { value: 'participation', label: 'Participation aux acquêts' },
            ]} />
            <TextField label="Nombre d'enfants" value={values.nombre_enfants} onChange={set('nombre_enfants')} type="number" />
            <TextField label="Âges des enfants" value={values.ages_enfants} onChange={set('ages_enfants')} placeholder="ex: 5, 8, 12" />
            <SelectField label="Résidence principale" value={values.residence_principale} onChange={set('residence_principale')} options={[
              { value: 'proprietaire', label: 'Propriétaire' },
              { value: 'locataire', label: 'Locataire' },
            ]} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* PRO */}
      <AccordionItem value="pro">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /> Situation professionnelle</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <SelectField label="Statut professionnel" value={values.statut_professionnel} onChange={set('statut_professionnel')} options={[
              { value: 'salarie', label: 'Salarié' },
              { value: 'tns', label: 'TNS / Indépendant' },
              { value: 'fonctionnaire', label: 'Fonctionnaire' },
              { value: 'retraite', label: 'Retraité' },
              { value: 'sans_activite', label: 'Sans activité' },
            ]} />
            <TextField label="Profession" value={values.profession} onChange={set('profession')} />
            <TextField label="Secteur d'activité" value={values.secteur_activite} onChange={set('secteur_activite')} />
            <TextField label="Ancienneté dans l'emploi" value={values.anciennete_emploi} onChange={set('anciennete_emploi')} placeholder="ex: 5 ans" />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* FINANCES */}
      <AccordionItem value="finances">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Situation financière</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <TextField label="Revenus nets mensuels (€)" value={values.revenus_nets_mensuels} onChange={set('revenus_nets_mensuels')} type="number" />
            <TextField label="Revenus du conjoint (€)" value={values.revenus_conjoint} onChange={set('revenus_conjoint')} type="number" />
            <TextField label="Revenus locatifs existants (€/mois)" value={values.revenus_locatifs_existants} onChange={set('revenus_locatifs_existants')} type="number" />
            <TextField label="Autres revenus (€/mois)" value={values.autres_revenus} onChange={set('autres_revenus')} type="number" />
            <TextField label="Charges mensuelles fixes (€)" value={values.charges_mensuelles_fixes} onChange={set('charges_mensuelles_fixes')} type="number" />
            <TextField label="Capacité d'épargne mensuelle (€)" value={values.capacite_epargne_mensuelle} onChange={set('capacite_epargne_mensuelle')} type="number" />
            <TextField label="Épargne disponible (€)" value={values.epargne_disponible} onChange={set('epargne_disponible')} type="number" />
            <TextField label="Apport disponible (€)" value={values.apport_disponible} onChange={set('apport_disponible')} type="number" />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* FISCALITÉ */}
      <AccordionItem value="fiscalite">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Situation fiscale</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <SelectField label="TMI (%)" value={values.tmi?.toString() || ''} onChange={v => onChange({ tmi: v })} options={[
              { value: '0', label: '0 %' },
              { value: '11', label: '11 %' },
              { value: '30', label: '30 %' },
              { value: '41', label: '41 %' },
              { value: '45', label: '45 %' },
            ]} />
            <TextField label="Revenu fiscal de référence (€)" value={values.revenus_fiscaux_reference} onChange={set('revenus_fiscaux_reference')} type="number" />
            <TextField label="Impôt sur le revenu payé (€)" value={values.impot_revenu_paye} onChange={set('impot_revenu_paye')} type="number" />
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="ifi" checked={!!values.assujetti_ifi} onCheckedChange={v => onChange({ assujetti_ifi: !!v })} />
              <Label htmlFor="ifi" className="text-xs cursor-pointer">Assujetti à l'IFI</Label>
            </div>
            <TextField label="Déficits fonciers existants (€)" value={values.deficits_fonciers_existants} onChange={set('deficits_fonciers_existants')} type="number" />
            <TextField label="Dispositifs fiscaux en cours" value={values.dispositifs_fiscaux_en_cours} onChange={set('dispositifs_fiscaux_en_cours')} placeholder="Pinel, Denormandie…" />
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Objectif fiscal</Label>
              <Textarea value={values.objectif_fiscal || ''} onChange={e => onChange({ objectif_fiscal: e.target.value })} rows={2} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* PATRIMOINE */}
      <AccordionItem value="patrimoine">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Patrimoine existant</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <TextField label="Résidence principale — valeur (€)" value={values.residence_principale_valeur} onChange={set('residence_principale_valeur')} type="number" />
            <TextField label="Résidence principale — CRD (€)" value={values.residence_principale_crd} onChange={set('residence_principale_crd')} type="number" />
            <TextField label="Passif total (€)" value={values.passif_total} onChange={set('passif_total')} type="number" />
            <TextField label="Taux d'endettement actuel (%)" value={values.taux_endettement_actuel} onChange={set('taux_endettement_actuel')} type="number" />
            <div className="sm:col-span-2">
              <JsonList
                label="Biens locatifs existants"
                items={values.biens_locatifs_existants || []}
                onChange={v => onChange({ biens_locatifs_existants: v })}
                schema={[
                  { key: 'adresse', label: 'Adresse' },
                  { key: 'valeur', label: 'Valeur (€)', type: 'number' },
                  { key: 'loyer', label: 'Loyer (€)', type: 'number' },
                  { key: 'credit', label: 'CRD (€)', type: 'number' },
                  { key: 'regime_fiscal', label: 'Régime' },
                ]}
                empty={{ adresse: '', valeur: '', loyer: '', credit: '', regime_fiscal: '' }}
              />
            </div>
            <div className="sm:col-span-2">
              <JsonList
                label="Épargne financière"
                items={values.epargne_financiere || []}
                onChange={v => onChange({ epargne_financiere: v })}
                schema={[
                  { key: 'type', label: 'Type (PEA, AV…)' },
                  { key: 'montant', label: 'Montant (€)', type: 'number' },
                ]}
                empty={{ type: '', montant: '' }}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Autres actifs</Label>
              <Textarea value={values.autres_actifs || ''} onChange={e => onChange({ autres_actifs: e.target.value })} rows={2} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* PROFIL INVESTISSEUR */}
      <AccordionItem value="profil">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Profil investisseur</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <SelectField label="Objectif principal" value={values.objectif_principal} onChange={set('objectif_principal')} options={[
              { value: 'revenus_complementaires', label: 'Revenus complémentaires' },
              { value: 'constitution_patrimoine', label: 'Constitution de patrimoine' },
              { value: 'retraite', label: 'Préparation retraite' },
              { value: 'transmission', label: 'Transmission' },
              { value: 'reduction_fiscale', label: 'Réduction fiscale' },
            ]} />
            <SelectField label="Horizon d'investissement" value={values.horizon_investissement} onChange={set('horizon_investissement')} options={[
              { value: 'court', label: 'Court terme (< 5 ans)' },
              { value: 'moyen', label: 'Moyen terme (5-10 ans)' },
              { value: 'long', label: 'Long terme (> 10 ans)' },
            ]} />
            <SelectField label="Appétence au risque" value={values.appetence_risque} onChange={set('appetence_risque')} options={[
              { value: 'prudent', label: 'Prudent' },
              { value: 'equilibre', label: 'Équilibré' },
              { value: 'dynamique', label: 'Dynamique' },
            ]} />
            <TextField label="Contraintes géographiques" value={values.contraintes_geographiques} onChange={set('contraintes_geographiques')} placeholder="Lyon, Grand Est…" />
            <SelectField label="Type de bien souhaité" value={values.type_bien_souhaite} onChange={set('type_bien_souhaite')} options={[
              { value: 'appartement', label: 'Appartement' },
              { value: 'maison', label: 'Maison' },
              { value: 'immeuble', label: 'Immeuble' },
              { value: 'local_commercial', label: 'Local commercial' },
            ]} />
            <SelectField label="Type de location souhaité" value={values.type_location_souhaite} onChange={set('type_location_souhaite')} options={[
              { value: 'nue', label: 'Nue' },
              { value: 'meublee', label: 'Meublée' },
              { value: 'saisonniere', label: 'Saisonnière' },
              { value: 'colocation', label: 'Colocation' },
              { value: 'commercial', label: 'Bail commercial' },
            ]} />
            <SelectField label="Aversion à la gestion" value={values.aversion_gestion} onChange={set('aversion_gestion')} options={[
              { value: 'delegue_tout', label: 'Délègue tout' },
              { value: 'gere_en_partie', label: 'Gère en partie' },
              { value: 'gere_tout', label: 'Gère tout seul' },
            ]} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* FINANCEMENT */}
      <AccordionItem value="financement">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Capacité de financement</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <TextField label="Banque principale" value={values.banque_principale} onChange={set('banque_principale')} />
            <TextField label="Capacité d'emprunt estimée (€)" value={values.capacite_emprunt_estimee} onChange={set('capacite_emprunt_estimee')} type="number" />
            <TextField label="Durée de crédit souhaitée (années)" value={values.duree_credit_souhaitee} onChange={set('duree_credit_souhaitee')} type="number" />
            <SelectField label="Préférence de taux" value={values.preference_taux} onChange={set('preference_taux')} options={[
              { value: 'fixe', label: 'Taux fixe' },
              { value: 'variable', label: 'Taux variable' },
            ]} />
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="banque" checked={!!values.deja_rencontre_banque} onCheckedChange={v => onChange({ deja_rencontre_banque: !!v })} />
              <Label htmlFor="banque" className="text-xs cursor-pointer">Déjà rencontré la banque</Label>
            </div>
            <div className="sm:col-span-2">
              <JsonList
                label="Crédits en cours"
                items={values.credits_en_cours || []}
                onChange={v => onChange({ credits_en_cours: v })}
                schema={[
                  { key: 'nature', label: 'Nature' },
                  { key: 'mensualite', label: 'Mensualité (€)', type: 'number' },
                  { key: 'duree_restante', label: 'Durée restante' },
                  { key: 'capital_restant_du', label: 'CRD (€)', type: 'number' },
                ]}
                empty={{ nature: '', mensualite: '', duree_restante: '', capital_restant_du: '' }}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* PROJET */}
      <AccordionItem value="projet">
        <AccordionTrigger className="text-sm font-semibold">
          <span className="flex items-center gap-2"><Compass className="w-4 h-4 text-primary" /> Projet &amp; source</span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <SelectField label="Délai de concrétisation" value={values.delai_concretisation} onChange={set('delai_concretisation')} options={[
              { value: 'urgent', label: 'Urgent' },
              { value: '3_mois', label: '< 3 mois' },
              { value: '6_mois', label: '< 6 mois' },
              { value: '1_an', label: '< 1 an' },
              { value: 'flexible', label: 'Flexible' },
            ]} />
            <SelectField label="Source de recommandation" value={values.source_recommandation} onChange={set('source_recommandation')} options={[
              { value: 'bouche_a_oreille', label: 'Bouche-à-oreille' },
              { value: 'instagram', label: 'Instagram' },
              { value: 'google', label: 'Google' },
              { value: 'site_web', label: 'Site web' },
              { value: 'autre', label: 'Autre' },
            ]} />
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs">Contraintes particulières</Label>
              <Textarea value={values.contraintes_particulieres || ''} onChange={e => onChange({ contraintes_particulieres: e.target.value })} rows={2} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
