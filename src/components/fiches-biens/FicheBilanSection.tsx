import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { fmtPdfEurInt } from '@/lib/pdf-utils';
import type { Bilan, CriteresEval, Hypotheses, StatutCritere, evaluerCriteres } from '@/lib/fiche-bien-calculs';

const eur = (v: number | null | undefined) => (v == null || !isFinite(v) ? '—' : fmtPdfEurInt(Math.round(v)));
const pct = (v: number | null | undefined) => (v == null || !isFinite(v) ? '—' : `${v.toFixed(2)} %`);
const STATUTS: Record<StatutCritere, string> = { respecte: 'Respecté', sous_condition: 'Sous condition', non_respecte: 'Non respecté', non_renseigne: 'Non renseigné' };

interface Props {
  typeProjet: string;
  h: Hypotheses;
  setH: (h: Hypotheses) => void;
  bilan: Bilan;
  criteres: ReturnType<typeof evaluerCriteres>;
  crit: CriteresEval;
  setCrit: (c: CriteresEval) => void;
}

export default function FicheBilanSection({ typeProjet, h, setH, bilan, criteres, crit, setCrit }: Props) {
  const up = (patch: Partial<Hypotheses>) => setH({
    ...h, ...patch,
    ...(patch.etat && patch.etat !== h.etat ? { notaire_pct: patch.etat === 'neuf' ? 2.5 : 7.5, notaire_montant: null } : {}),
  });
  const N = (k: keyof Hypotheses, label: string, hint?: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="decimal" className="h-9" value={(h[k] as any) ?? ''}
        onChange={e => up({ [k]: e.target.value === '' ? (k === 'notaire_montant' || k === 'frais_reels_acquisition' ? null : 0) : Number(e.target.value) } as any)} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  const Arr = (k: 'remises' | 'revente_variations', label: string) => (
    <div className="space-y-1 sm:col-span-2">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-3 gap-1">
        {h[k].map((v, i) => <Input key={i} type="number" className="h-9" value={v}
          onChange={e => { const a = [...h[k]] as [number, number, number]; a[i] = Number(e.target.value) || 0; up({ [k]: a } as any); }} />)}
      </div>
    </div>
  );
  const Sel = (k: keyof Hypotheses, label: string, opts: [string, string][]) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={(h[k] as string) || '__none__'} onValueChange={v => up({ [k]: v === '__none__' ? '' : v } as any)}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const r: any = bilan.resultat;
  const resumeScenario = (s: any) => typeProjet === 'achat_revente' ? `Marge nette ${eur(s.resultat.marge_nette)}`
    : typeProjet === 'locatif' ? `Cash-flow ${eur(s.resultat.cash_flow_mensuel)}/mois`
    : `Mensualité ${eur(s.resultat.financement.mensualite)} · ${pct(s.resultat.endettement)}`;
  const Row = ({ l, v, cls }: { l: string; v: string; cls?: string }) => (
    <div className="flex justify-between border-b border-border/60 py-1 text-sm"><span>{l}</span><span className={`font-semibold ${cls ?? ''}`}>{v}</span></div>
  );
  const pos = (v: number) => (v >= 0 ? 'text-primary' : 'text-destructive');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {N('deduction_travaux', 'Déduction travaux sur le prix (€)')}
        {Sel('etat', 'Ancien / neuf', [['ancien', 'Ancien (7,5 %)'], ['neuf', 'Neuf (2,5 %)']])}
        {N('notaire_pct', 'Frais de notaire (%)')}
        {N('notaire_montant', 'Montant notaire (€, facultatif)', `Calculé : ${eur(bilan.prix_achat * h.notaire_pct / 100)}`)}
        {N('frais_divers', 'Frais divers (€)', 'Diagnostics, frais de dossier ou de garantie')}
        {N('budget_deco', 'Budget déco (€)')}
        {N('enveloppe', 'Enveloppe du client (€)')}
        {N('apport', 'Apport (€)')}
        <div />
        {N('prix_marche_m2', 'Prix de marché (€/m²)')}
        <div className="space-y-1"><Label className="text-xs">Source du prix de marché</Label>
          <Input className="h-9" value={h.source_marche} onChange={e => up({ source_marche: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-1">{N('marche_min', 'Min €/m²')}{N('marche_max', 'Max €/m²')}</div>
        {Arr('remises', 'Scénarios de négociation (remise %)')}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {(['conseil', 'chasse', 'amo', 'deco'] as const).map(s => (
          <label key={s} className="flex items-center gap-2"><Checkbox checked={h.hono[s]} onCheckedChange={v => up({ hono: { ...h.hono, [s]: !!v } })} />Honoraires {s === 'amo' ? 'AMO' : s}</label>
        ))}
        <label className="flex items-center gap-2"><Checkbox checked={h.pack} onCheckedChange={v => up({ pack: !!v })} />Remise pack 10 % (hors conseil)</label>
      </div>

      {typeProjet !== 'achat_revente' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {N('taux', 'Taux du crédit (%)', 'À ajuster selon les conditions du moment')}
          {N('duree', 'Durée (années)')}
          {N('assurance_pct', 'Assurance emprunteur (%/an du capital)')}
          {typeProjet === 'residence_principale' && N('mensualites_existantes', 'Mensualités existantes (€)')}
          {typeProjet === 'locatif' && <>
            {N('loyer', 'Loyer mensuel (€)')}
            {Sel('location', 'Type de location', [['nue', 'Nue'], ['meublee', 'Meublée']])}
            {N('vacance_mois', 'Vacance locative (mois/an)')}
            {N('charges_non_recup', 'Charges copro non récupérables (€/an)')}
            {N('pno', 'Assurance PNO (€/an)')}
            {N('gestion_pct', 'Gestion (% des loyers)', '7 % si gestion déléguée')}
            {Sel('regime_fiscal', 'Régime fiscal envisagé (informatif)', [['__none__', 'Non défini'], ['micro_foncier', 'Micro-foncier'], ['reel', 'Réel'], ['lmnp_micro_bic', 'LMNP micro-BIC'], ['lmnp_reel', 'LMNP réel']])}
          </>}
        </div>
      )}
      {typeProjet === 'achat_revente' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Arr('revente_variations', 'Revente : prudente / centrale / optimiste (%)')}
          {N('interets_detention', 'Intérêts pendant la détention (€)')}
          {N('diagnostics_revente', 'Diagnostics revente (€)')}
          {N('commission_agence_pct', "Commission d'agence (%)", '0 en vente directe')}
          {N('frais_reels_acquisition', "Frais d'acquisition réels (€)", 'Vide = frais de notaire')}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Row l="Prix d'achat retenu" v={eur(bilan.prix_achat)} />
          <Row l="Frais de notaire" v={eur(bilan.notaire)} />
          <Row l="Travaux (haut de fourchette)" v={eur(bilan.travaux)} />
          <Row l="Honoraires HUNTERS TTC" v={eur(bilan.honoraires.total_ttc)} />
          <Row l="Frais divers" v={eur(bilan.frais_divers)} />
          <Row l="Coût total de l'opération" v={eur(bilan.cout_total)} />
          <Row l="Enveloppe du client" v={eur(bilan.enveloppe)} />
          <Row l="Apport" v={eur(bilan.apport)} />
          <Row l="Écart" v={eur(bilan.ecart)} cls={pos(bilan.ecart)} />
          {bilan.marche && <>
            <Row l="Prix au m² du bien" v={eur(bilan.marche.prix_m2_bien)} />
            <Row l="Écart avec le marché" v={pct(bilan.marche.ecart_pct)} />
            <Row l="Valeur du bien après travaux" v={eur(bilan.marche.valeur_du_bien)} />
          </>}
        </div>
        <div>
          {typeProjet === 'residence_principale' && <>
            <Row l="Montant emprunté" v={eur(r.financement.capital)} />
            <Row l="Mensualité (assurance comprise)" v={eur(r.financement.mensualite)} />
            <Row l="Revenus retenus" v={eur(r.revenus)} />
            <Row l="Taux d'endettement (repère 35 %)" v={`${pct(r.endettement)} ${r.endettement == null ? '' : r.endettement_ok ? 'OK' : 'Dépassement'}`} cls={r.endettement_ok ? 'text-primary' : 'text-destructive'} />
            <Row l="Reste à vivre" v={eur(r.reste_a_vivre)} />
          </>}
          {typeProjet === 'locatif' && <>
            <Row l="Montant emprunté" v={eur(r.financement.capital)} />
            <Row l="Mensualité (assurance comprise)" v={eur(r.financement.mensualite)} />
            <Row l="Rendement brut" v={pct(r.rendement_brut)} />
            <Row l="Rendement net de charges" v={pct(r.rendement_net)} />
            {r.cash_flow_mensuel < 0
              ? <Row l="Effort d'épargne" v={`${eur(r.effort_epargne)}/mois`} cls="text-destructive" />
              : <Row l="Cash-flow mensuel avant impôt" v={eur(r.cash_flow_mensuel)} cls="text-primary" />}
          </>}
          {typeProjet === 'achat_revente' && <>
            <Row l="Prix de revente" v={eur(r.prix_revente)} />
            <Row l="Frais de détention" v={eur(r.frais_detention)} />
            <Row l="Frais de revente" v={eur(r.frais_revente)} />
            <Row l="Marge brute" v={eur(r.marge_brute)} cls={pos(r.marge_brute)} />
            <Row l={`Impôt plus-value (36,2 %${r.plus_value.forfait_retenu ? ', forfait 7,5 %' : ', frais réels'})`} v={eur(r.plus_value.impot)} />
            <Row l="Marge nette" v={eur(r.marge_nette)} cls={pos(r.marge_nette)} />
            <Row l="Rentabilité / annualisée" v={`${pct(r.rentabilite)} / ${pct(r.rentabilite_annualisee)}`} />
            {bilan.reventes?.map(v => <Row key={v.variation_pct} l={`Revente ${v.variation_pct > 0 ? '+' : ''}${v.variation_pct} %`} v={`Marge nette ${eur((v.resultat as any).marge_nette)}`} />)}
          </>}
        </div>
      </div>

      <div className="border-2 border-accent bg-accent/10 p-3 text-sm">
        <span className="font-semibold">Prix d'achat plafond : </span>{eur(bilan.prix_plafond)}
        <span className="text-xs text-muted-foreground"> — coût total égal à l'enveloppe</span>
      </div>

      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-xs text-muted-foreground"><th>Scénario</th><th>Prix d'achat</th><th>Notaire</th><th>Coût total</th><th>Écart</th><th>Résultat</th></tr></thead>
        <tbody>{bilan.scenarios.map(s => (
          <tr key={s.remise_pct} className="border-b border-border/60">
            <td>{s.remise_pct ? `−${s.remise_pct} %` : 'Prix retenu'}</td><td>{eur(s.prix_achat)}</td><td>{eur(s.notaire)}</td>
            <td>{eur(s.cout_total)}</td><td className={pos(s.ecart)}>{eur(s.ecart)}</td><td>{resumeScenario(s)}</td>
          </tr>))}
        </tbody>
      </table>

      {bilan.alertes.length > 0 && (
        <ul className="space-y-1">{bilan.alertes.map(a => (
          <li key={a} className="flex gap-2 text-xs"><AlertTriangle className="h-4 w-4 shrink-0 text-accent" />{a}</li>))}
        </ul>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Pourquoi ce bien — {criteres.score} / {criteres.total}</p>
        <div className="space-y-1">{criteres.lignes.map(l => (
          <div key={l.key} className="grid grid-cols-[110px_160px_1fr] items-center gap-2">
            <span className="text-sm">{l.label}</span>
            <Select value={crit[l.key]?.statut ?? '__auto__'} onValueChange={v => setCrit({ ...crit, [l.key]: { ...crit[l.key], statut: v === '__auto__' ? undefined : v as StatutCritere } })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto : {STATUTS[l.statut_auto]}</SelectItem>
                {(Object.keys(STATUTS) as StatutCritere[]).map(s => <SelectItem key={s} value={s}>{STATUTS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="h-8" placeholder="Commentaire" value={crit[l.key]?.commentaire ?? ''} onChange={e => setCrit({ ...crit, [l.key]: { ...crit[l.key], commentaire: e.target.value } })} />
          </div>))}
        </div>
      </div>
    </div>
  );
}
