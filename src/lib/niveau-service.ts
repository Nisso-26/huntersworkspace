// Niveau de commissionnement N1/N2 PAR SERVICE — implémentation unique.
// Compteur = honoraires HT encaissés par HUNTERS (factures payées, rattachées à
// l'année de leur encaissement) sur l'année civile. Le seuil atteint AVANT le
// dossier fait passer ce service en N2 ; le dossier franchisseur reste en N1.
// Remise à zéro au 1er janvier. Le taux est figé à la création de la commission.
import type { BaremeHunters } from '@/hooks/use-baremes-hunters';
import type { CommissionService } from '@/lib/pipeline-transitions';
import { repartitionHonoraires, type DossierRepartition } from '@/lib/commission-repartition';

export const SERVICES: CommissionService[] = ['conseil', 'chasse', 'amo', 'deco'];
export const SERVICE_LABEL: Record<CommissionService, string> = { conseil: 'Conseil', chasse: 'Chasse', amo: 'AMO', deco: 'Déco' };
export const SEUILS_N2_DEFAUT: Record<CommissionService, number> = { conseil: 10000, chasse: 40000, amo: 20000, deco: 12000 };

export type Niveaux = Record<CommissionService, 'N1' | 'N2'>;
export type Compteurs = Record<CommissionService, number>;

export function seuilsN2(settings: Record<string, any> | null | undefined): Compteurs {
  const out = { ...SEUILS_N2_DEFAUT };
  for (const s of SERVICES) {
    const v = Number(settings?.[`seuil_n2_${s}`]);
    if (Number.isFinite(v) && v > 0) out[s] = v;
  }
  return out;
}

export interface FactureCompteur {
  mandataire_id: string | null;
  dossier_id: string | null;
  montant: number | null;
  statut: string;
  type?: string | null;
  date_paiement: string | null;
  lignes?: { service_key?: string; montant_ht: number }[] | null;
}

const PAYEE = ['paye', 'payee', 'payée'];
const zero = (): Compteurs => ({ conseil: 0, chasse: 0, amo: 0, deco: 0 });

/** Honoraires HT encaissés par service pour un mandataire sur une année civile. */
export function compteursParService(
  mandataireId: string,
  annee: number,
  factures: FactureCompteur[],
  dossiers: Map<string, DossierRepartition>,
  baremes: BaremeHunters[],
  opts: { avant?: Date; exclureDossierId?: string } = {},
): Compteurs {
  const c = zero();
  for (const f of factures) {
    if (f.mandataire_id !== mandataireId || !PAYEE.includes(f.statut) || !f.date_paiement) continue;
    if (f.type && ['abonnement', 'pack'].includes(f.type)) continue;
    const dp = new Date(f.date_paiement);
    if (dp.getFullYear() !== annee) continue;
    if (opts.avant && dp >= opts.avant) continue;
    if (opts.exclureDossierId && f.dossier_id === opts.exclureDossierId) continue;
    const lignes = (f.lignes || []).filter(l => SERVICES.includes(l.service_key as CommissionService));
    if (lignes.length) {
      for (const l of lignes) c[l.service_key as CommissionService] += Number(l.montant_ht) || 0;
    } else {
      const d = (f.dossier_id && dossiers.get(f.dossier_id)) || {};
      for (const l of repartitionHonoraires({ ...d, honoraires: Number(f.montant) || 0 }, baremes)) c[l.service] += l.montant_ht;
    }
  }
  return c;
}

/** Niveau de chaque service : N2 si le compteur (avant le dossier) atteint le seuil. */
export function niveauParService(compteurs: Compteurs, seuils: Compteurs): Niveaux {
  const out = {} as Niveaux;
  for (const s of SERVICES) out[s] = compteurs[s] >= seuils[s] ? 'N2' : 'N1';
  return out;
}
