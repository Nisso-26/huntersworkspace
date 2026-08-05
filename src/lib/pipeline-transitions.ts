import { pipelineStatuses } from '@/data/status-config';

export type PipelineStatus = typeof pipelineStatuses[number];

/**
 * Détermine si le passage du statut `from` vers `to` doit déclencher
 * la création automatique de la facture d'honoraires + commission(s).
 */
export function shouldTriggerHonoraires(from: string, to: string): boolean {
  return to === 'signe' && from !== 'signe';
}

/**
 * Calcule le taux de commission selon le niveau du mandataire.
 * - N2 : 60%
 * - N1 (par défaut, fallback) : 50%
 * @deprecated Utiliser commissionRateForService() (taux réels par service depuis company_settings).
 */
export function commissionRateForLevel(niveau: string | null | undefined): number {
  return (niveau || '').toUpperCase() === 'N2' ? 60 : 50;
}

export type CommissionService = 'conseil' | 'chasse' | 'amo' | 'deco';

const DEFAULT_RATES: Record<CommissionService, { n1: number; n2: number }> = {
  conseil: { n1: 50, n2: 60 },
  chasse: { n1: 50, n2: 60 },
  amo: { n1: 50, n2: 60 },
  deco: { n1: 50, n2: 60 },
};

/**
 * Taux réel de commission pour un service donné, lu depuis company_settings
 * (commission_<service>_n1 / _n2), avec fallback sur le barème historique.
 */
export function commissionRateForService(
  settings: Record<string, any> | null | undefined,
  service: CommissionService,
  niveau: string | null | undefined
): number {
  const isN2 = (niveau || '').toUpperCase() === 'N2';
  const key = `commission_${service}_${isN2 ? 'n2' : 'n1'}`;
  const raw = Number(settings?.[key]);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return isN2 ? DEFAULT_RATES[service].n2 : DEFAULT_RATES[service].n1;
}

export interface ServiceMontant {
  service: CommissionService;
  montant_ht: number;
}

export interface CommissionLine extends ServiceMontant {
  taux: number;
  montant: number;
}

/**
 * Calcule la commission service par service (cas pack multi-services).
 * Chaque ligne applique le taux réel du service concerné, selon le niveau.
 */
export function computeCommissionsParService(
  lignes: ServiceMontant[],
  settings: Record<string, any> | null | undefined,
  niveau: string | null | undefined
): CommissionLine[] {
  return lignes
    .filter((l) => Number(l.montant_ht) > 0)
    .map((l) => {
      const taux = commissionRateForService(settings, l.service, niveau);
      return { ...l, taux, montant: computeCommission(Number(l.montant_ht), taux) };
    });
}


/**
 * Calcule le montant d'une commission à partir du chiffre d'honoraires
 * et d'un taux exprimé en pourcentage. Toujours >= 0, arrondi à 2 décimales.
 */
export function computeCommission(honoraires: number, taux: number): number {
  const safeHon = Number.isFinite(honoraires) && honoraires > 0 ? honoraires : 0;
  const safeTaux = Number.isFinite(taux) && taux >= 0 ? taux : 0;
  return Math.round((safeHon * safeTaux) / 100 * 100) / 100;
}

/**
 * Bonus parrainage : 2% des honoraires pour le parrain.
 */
export function computeBonusParrainage(honoraires: number): number {
  return computeCommission(honoraires, 2);
}

/**
 * Vérifie qu'un statut cible est bien dans la liste connue du pipeline.
 * Utile en garde pour le drop : si la cible est invalide on ignore.
 */
export function isValidPipelineStatus(s: string): s is PipelineStatus {
  return (pipelineStatuses as readonly string[]).includes(s);
}
