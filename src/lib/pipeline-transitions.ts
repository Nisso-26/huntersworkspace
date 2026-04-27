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
 */
export function commissionRateForLevel(niveau: string | null | undefined): number {
  return (niveau || '').toUpperCase() === 'N2' ? 60 : 50;
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
