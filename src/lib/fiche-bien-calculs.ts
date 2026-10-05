// Calculs financiers de la fiche de présentation du bien — fonctions pures uniquement.
import type { BaremeHunters } from '@/hooks/use-baremes-hunters';
import { computeMontant, pickTranche } from '@/lib/baremes-hunters';

export type TypeProjetCalc = 'residence_principale' | 'locatif' | 'achat_revente';

/** Mensualité constante (hors assurance). tauxAnnuel en décimal (0.035). */
export function pmt(tauxAnnuel: number, nbMois: number, capital: number): number {
  if (capital <= 0 || nbMois <= 0) return 0;
  if (tauxAnnuel === 0) return capital / nbMois;
  const r = tauxAnnuel / 12;
  return (capital * r * Math.pow(1 + r, nbMois)) / (Math.pow(1 + r, nbMois) - 1);
}

export interface Hypotheses {
  deduction_travaux: number;
  etat: 'ancien' | 'neuf';
  notaire_pct: number;
  notaire_montant: number | null; // surcharge du montant au prix retenu
  hono: { conseil: boolean; chasse: boolean; amo: boolean; deco: boolean };
  budget_deco: number;
  pack: boolean;
  frais_divers: number;
  enveloppe: number;
  apport: number;
  remises: [number, number, number];
  prix_marche_m2: number;
  source_marche: string;
  marche_min: number;
  marche_max: number;
  // financement
  taux: number;
  duree: number;
  assurance_pct: number;
  mensualites_existantes: number;
  // locatif
  loyer: number;
  location: 'nue' | 'meublee';
  vacance_mois: number;
  charges_non_recup: number;
  pno: number;
  gestion_pct: number;
  regime_fiscal: 'micro_foncier' | 'reel' | 'lmnp_micro_bic' | 'lmnp_reel' | '';
  // achat-revente
  revente_variations: [number, number, number];
  interets_detention: number;
  diagnostics_revente: number;
  commission_agence_pct: number;
  frais_reels_acquisition: number | null;
}

export interface FicheCalc {
  type_projet: TypeProjetCalc;
  prix_affiche: number | null;
  surface_habitable: number | null;
  travaux: { montant_max: number | null }[];
  taxe_fonciere: number | null;
  charges_copro_annuelles: number | null;
  duree_detention_mois: number | null;
  prix_revente_vise: number | null;
  dpe_classe: string | null;
  ville?: string | null; titre?: string | null; exterieur?: string | null;
}

export interface Ctx { baremes: BaremeHunters[]; tva: number; tarifConseilHt: number }

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export function sommeCredits(credits: any): number | null {
  if (!Array.isArray(credits) || !credits.length) return null;
  let ok = false;
  const t = credits.reduce((s: number, c: any) => {
    const m = Number(c?.mensualite ?? c?.mensualite_mensuelle ?? c?.montant_mensuel);
    if (Number.isFinite(m)) { ok = true; return s + m; }
    return s;
  }, 0);
  return ok ? t : null;
}

export function hypothesesParDefaut(dossier: any, fiche: FicheCalc, loyerBien?: number | null): Hypotheses {
  const s = (dossier?.services_souscrits || {}) as Record<string, boolean>;
  return {
    deduction_travaux: 0, etat: 'ancien', notaire_pct: 7.5, notaire_montant: null,
    hono: { conseil: !!s.conseil, chasse: !!s.chasse, amo: !!s.amo, deco: !!s.deco },
    budget_deco: 0, pack: dossier?.type_accompagnement === 'cle_en_main', frais_divers: 0,
    enveloppe: n(dossier?.budget), apport: n(dossier?.apport_disponible),
    remises: [0, 5, 10], prix_marche_m2: 0, source_marche: '', marche_min: 0, marche_max: 0,
    taux: 3.5, duree: n(dossier?.duree_credit_souhaitee) || 25, assurance_pct: 0.3,
    mensualites_existantes: sommeCredits(dossier?.credits_en_cours) ?? 0,
    loyer: n(loyerBien), location: dossier?.type_location_souhaite === 'meublee' ? 'meublee' : 'nue',
    vacance_mois: 1, charges_non_recup: 0, pno: 150, gestion_pct: 0, regime_fiscal: '',
    revente_variations: [-5, 0, 5], interets_detention: 0, diagnostics_revente: 500,
    commission_agence_pct: 4, frais_reels_acquisition: null,
  };
}

export function totalTravaux(f: FicheCalc) {
  return (f.travaux || []).reduce((s, t) => s + n(t.montant_max), 0);
}

export interface Honoraires { lignes: { service: string; ht: number; detail: string }[]; remise_ht: number; total_ht: number; total_ttc: number }

export function honoraires(prixAchat: number, travaux: number, h: Hypotheses, ctx: Ctx): Honoraires {
  const lignes: Honoraires['lignes'] = [];
  if (h.hono.conseil && ctx.tarifConseilHt > 0) lignes.push({ service: 'conseil', ht: ctx.tarifConseilHt, detail: 'Tarif conseil' });
  const bar = (service: 'chasse' | 'amo' | 'deco', base: number) => {
    const r = computeMontant(pickTranche(ctx.baremes, service, base), base);
    lignes.push({ service, ht: r.montant, detail: r.detail });
  };
  if (h.hono.chasse) bar('chasse', prixAchat);
  if (h.hono.amo && travaux > 0) bar('amo', travaux);
  if (h.hono.deco && h.budget_deco > 0) bar('deco', h.budget_deco);
  const sous = lignes.reduce((s, l) => s + l.ht, 0);
  // Remise pack : jamais sur le conseil
  const remise_ht = h.pack ? lignes.filter(l => l.service !== 'conseil').reduce((s, l) => s + l.ht, 0) * 0.1 : 0;
  const total_ht = sous - remise_ht;
  return { lignes, remise_ht, total_ht, total_ttc: total_ht * (1 + ctx.tva / 100) };
}

export function coutTotal(prixAchat: number, f: FicheCalc, h: Hypotheses, ctx: Ctx, notaireMontant?: number) {
  const travaux = totalTravaux(f);
  const notaire = notaireMontant ?? prixAchat * h.notaire_pct / 100;
  const hono = honoraires(prixAchat, travaux, h, ctx);
  return { prixAchat, notaire, travaux, hono, frais_divers: h.frais_divers, total: prixAchat + notaire + travaux + hono.total_ttc + h.frais_divers };
}

/** Prix d'achat maximal tel que coût total = enveloppe (dichotomie à l'euro). */
export function prixPlafond(f: FicheCalc, h: Hypotheses, ctx: Ctx): number | null {
  if (h.enveloppe <= 0) return null;
  let lo = 0, hi = h.enveloppe;
  if (coutTotal(0, f, h, ctx).total > h.enveloppe) return 0;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (coutTotal(mid, f, h, ctx).total <= h.enveloppe) lo = mid; else hi = mid;
  }
  return Math.floor(lo);
}

export function financement(capital: number, h: Hypotheses) {
  const mois = h.duree * 12;
  const credit = pmt(h.taux / 100, mois, capital);
  const assurance = capital * h.assurance_pct / 100 / 12;
  return { capital, credit, assurance, mensualite: credit + assurance };
}

export function alerteDpe(classe: string | null | undefined, type: TypeProjetCalc): string | null {
  if (type !== 'locatif' || !classe) return null;
  const c = classe.toUpperCase();
  const ref = '(loi n° 2021-1104 Climat et résilience)';
  if (c === 'G') return `DPE G : location interdite depuis le 1er janvier 2025 ${ref}.`;
  if (c === 'F') return `DPE F : location interdite à partir de 2028 ${ref}.`;
  if (c === 'E') return `DPE E : location interdite à partir de 2034 ${ref}.`;
  return null;
}

export const TAUX_PV = 36.2;
export const MENTION_EXO_RP = 'Exonération possible si le bien devient la résidence principale effective du vendeur — à valider avec le notaire';
export const ALERTE_MDB = 'Des opérations répétées exposent à une requalification en marchand de biens (CGI, art. 35) — à valider avec le notaire ou l\'expert-comptable.';

/** Impôt sur la plus-value des particuliers (détention < 6 ans, sans abattement). */
export function plusValue(prixAchat: number, prixRevente: number, travaux: number, fraisReels: number) {
  const forfait = prixAchat * 0.075;
  const frais_retenus = Math.max(fraisReels, forfait);
  const base = Math.max(0, prixRevente - (prixAchat + frais_retenus + travaux));
  return { base, frais_retenus, forfait_retenu: forfait >= fraisReels, impot: base * TAUX_PV / 100, surtaxe: base > 50000 };
}

function resultatType(prixAchat: number, ct: ReturnType<typeof coutTotal>, f: FicheCalc, h: Hypotheses, dossier: any, revente?: number) {
  const type = f.type_projet;
  if (type === 'achat_revente') {
    const pr = revente ?? n(f.prix_revente_vise);
    const mois = n(f.duree_detention_mois);
    const detention = (n(f.taxe_fonciere) + n(f.charges_copro_annuelles)) / 12 * mois + h.interets_detention;
    const frais_revente = h.diagnostics_revente + pr * h.commission_agence_pct / 100;
    const marge_brute = pr - ct.total - detention - frais_revente;
    const pv = plusValue(prixAchat, pr, ct.travaux, h.frais_reels_acquisition ?? ct.notaire);
    const marge_nette = marge_brute - pv.impot;
    const renta = ct.total > 0 ? marge_nette / ct.total * 100 : 0;
    const renta_annuelle = mois > 0 ? (Math.pow(1 + renta / 100, 12 / mois) - 1) * 100 : null;
    return { prix_revente: pr, frais_detention: detention, frais_revente, marge_brute, plus_value: pv, marge_nette, rentabilite: renta, rentabilite_annualisee: renta_annuelle };
  }
  const fin = financement(Math.max(0, ct.total - h.apport), h);
  if (type === 'residence_principale') {
    const revenus = n(dossier?.revenus_nets_mensuels) + n(dossier?.revenus_conjoint) + 0.7 * n(dossier?.revenus_locatifs_existants);
    const toutes = h.mensualites_existantes + fin.mensualite;
    const endettement = revenus > 0 ? toutes / revenus * 100 : null;
    return { financement: fin, revenus, endettement, endettement_ok: endettement != null && endettement <= 35, reste_a_vivre: revenus - n(dossier?.charges_mensuelles_fixes) - toutes };
  }
  const loyers = h.loyer * 12;
  const encaisses = loyers * (1 - h.vacance_mois / 12);
  const charges = h.charges_non_recup + n(f.taxe_fonciere) + h.pno + loyers * h.gestion_pct / 100;
  const cash = (encaisses - charges) / 12 - fin.mensualite;
  return {
    financement: fin, loyers_annuels: loyers, charges_annuelles: charges,
    rendement_brut: ct.total > 0 ? loyers / ct.total * 100 : 0,
    rendement_net: ct.total > 0 ? (encaisses - charges) / ct.total * 100 : 0,
    cash_flow_mensuel: cash, effort_epargne: cash < 0 ? -cash : 0,
  };
}

export function calculerBilan(f: FicheCalc, h: Hypotheses, dossier: any, ctx: Ctx) {
  const prixAchat = Math.max(0, n(f.prix_affiche) - h.deduction_travaux);
  const ct = coutTotal(prixAchat, f, h, ctx, h.notaire_montant ?? undefined);
  const ecart = h.enveloppe - ct.total;
  const surface = n(f.surface_habitable);
  const prix_m2 = surface > 0 ? prixAchat / surface : null;
  const marche = h.prix_marche_m2 > 0 ? {
    prix_m2_bien: prix_m2, prix_marche_m2: h.prix_marche_m2, source: h.source_marche,
    fourchette: h.marche_min || h.marche_max ? [h.marche_min || null, h.marche_max || null] : null,
    ecart_pct: prix_m2 != null ? (prix_m2 / h.prix_marche_m2 - 1) * 100 : null,
    valeur_du_bien: surface > 0 ? h.prix_marche_m2 * surface : null,
  } : null;
  const scenarios = h.remises.map(r => {
    const p = prixAchat * (1 - r / 100);
    const c = coutTotal(p, f, h, ctx);
    return { remise_pct: r, prix_achat: p, notaire: c.notaire, cout_total: c.total, ecart: h.enveloppe - c.total, resultat: resultatType(p, c, f, h, dossier) };
  });
  const resultat = resultatType(prixAchat, ct, f, h, dossier);
  const reventes = f.type_projet === 'achat_revente'
    ? h.revente_variations.map(v => ({ variation_pct: v, resultat: resultatType(prixAchat, ct, f, h, dossier, n(f.prix_revente_vise) * (1 + v / 100)) }))
    : null;
  const alertes: string[] = [];
  const dpe = alerteDpe(f.dpe_classe, f.type_projet); if (dpe) alertes.push(dpe);
  if (ecart < 0) alertes.push('Le coût total dépasse l\'enveloppe du client.');
  if (f.type_projet === 'residence_principale' && (resultat as any).endettement > 35) alertes.push('Taux d\'endettement supérieur à 35 % assurance comprise (recommandation HCSF).');
  if (f.type_projet === 'achat_revente') {
    if ((resultat as any).plus_value.surtaxe) alertes.push('Plus-value supérieure à 50 000 € : surtaxe applicable (CGI, art. 1609 nonies G), non calculée.');
    alertes.push(MENTION_EXO_RP, ALERTE_MDB);
  }
  return {
    type_projet: f.type_projet, prix_achat: prixAchat, notaire: ct.notaire, travaux: ct.travaux,
    honoraires: ct.hono, frais_divers: ct.frais_divers, cout_total: ct.total,
    enveloppe: h.enveloppe, apport: h.apport, ecart, prix_plafond: prixPlafond(f, h, ctx),
    marche, scenarios, resultat, reventes, alertes, calcule_le: new Date().toISOString(),
  };
}
export type Bilan = ReturnType<typeof calculerBilan>;

// ---------- Pourquoi ce bien ----------
export type StatutCritere = 'respecte' | 'sous_condition' | 'non_respecte' | 'non_renseigne';
export type CriteresEval = Record<string, { statut?: StatutCritere; commentaire?: string }>;
const norm = (s: any) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function evaluerCriteres(f: FicheCalc, dossier: any, bilan: Bilan | null, forces: CriteresEval = {}) {
  const auto: { key: string; label: string; statut: StatutCritere }[] = [];
  const env = bilan?.enveloppe ?? 0;
  auto.push({ key: 'budget', label: 'Budget', statut: !bilan || env <= 0 ? 'non_renseigne' : bilan.cout_total <= env ? 'respecte' : (bilan.scenarios[2]?.cout_total ?? Infinity) <= env ? 'sous_condition' : 'non_respecte' });
  const zones = norm(dossier?.contraintes_geographiques);
  auto.push({ key: 'ville', label: 'Ville', statut: !zones || !f.ville ? 'non_renseigne' : zones.includes(norm(f.ville)) ? 'respecte' : 'non_respecte' });
  const tb = norm(dossier?.type_bien_souhaite);
  auto.push({ key: 'type_bien', label: 'Type de bien', statut: !tb ? 'non_renseigne' : f.titre && norm(f.titre).includes(tb) ? 'respecte' : 'non_renseigne' });
  const smin = n(dossier?.surface_min);
  auto.push({ key: 'surface', label: 'Surface', statut: !smin || !f.surface_habitable ? 'non_renseigne' : n(f.surface_habitable) >= smin ? 'respecte' : 'non_respecte' });
  const dmin = String(dossier?.dpe_min || '').toUpperCase();
  const dc = String(f.dpe_classe || '').toUpperCase();
  auto.push({ key: 'dpe', label: 'DPE', statut: !dmin || !dc ? 'non_renseigne' : dc <= dmin ? 'respecte' : 'non_respecte' });
  auto.push({ key: 'exterieur', label: 'Extérieur', statut: !String(dossier?.exterieur_souhaite || '').trim() ? 'non_renseigne' : String(f.exterieur || '').trim() ? 'respecte' : 'non_respecte' });
  const lignes = auto.map(a => ({ ...a, statut_auto: a.statut, statut: forces[a.key]?.statut ?? a.statut, commentaire: forces[a.key]?.commentaire ?? '' }));
  const renseignes = lignes.filter(l => l.statut !== 'non_renseigne');
  return { lignes, score: renseignes.filter(l => l.statut === 'respecte').length, total: renseignes.length };
}
