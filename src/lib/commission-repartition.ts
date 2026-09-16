import type { BaremeHunters } from '@/hooks/use-baremes-hunters';
import type { CommissionService, ServiceMontant } from '@/lib/pipeline-transitions';

// Le calcul du barème vit dans src/lib/baremes-hunters.ts (implémentation unique).
export { montantBareme } from '@/lib/baremes-hunters';
import { montantBareme } from '@/lib/baremes-hunters';

export interface DossierRepartition {
  budget?: number | null;
  honoraires?: number | null;
  tarif_conseil_ht?: number | null;
  services_souscrits?: Record<string, boolean> | null | any;
}

/**
 * Décomposition des montants HT par service souscrit sur un dossier.
 * Base commune au pipeline (génération des commissions) et au reporting.
 */
export function servicesMontants(
  dossier: DossierRepartition,
  baremes: BaremeHunters[]
): ServiceMontant[] {
  const services = (dossier.services_souscrits as Record<string, boolean>) || {};
  const budget = Number(dossier.budget) || 0;
  const out: ServiceMontant[] = [];

  if (services.conseil !== false) {
    out.push({ service: 'conseil', montant_ht: Number(dossier.tarif_conseil_ht) || 0 });
  }
  if (services.chasse) {
    out.push({ service: 'chasse', montant_ht: montantBareme(baremes, 'chasse', budget) });
  }
  if (services.amo) {
    out.push({ service: 'amo', montant_ht: montantBareme(baremes, 'amo', 0) });
  }
  if (services.deco) {
    out.push({ service: 'deco', montant_ht: montantBareme(baremes, 'deco', 0) });
  }
  return out.filter((l) => l.montant_ht > 0);
}

/**
 * Répartition des honoraires réellement facturés d'un dossier par service.
 * On utilise la structure des services souscrits (barème) comme clé de
 * répartition, puis on met à l'échelle sur les honoraires du dossier afin
 * que la somme des lignes corresponde exactement au CA constaté.
 * Si aucune répartition n'est possible, tout est imputé au conseil.
 */
export function repartitionHonoraires(
  dossier: DossierRepartition,
  baremes: BaremeHunters[]
): ServiceMontant[] {
  const honoraires = Number(dossier.honoraires) || 0;
  if (honoraires <= 0) return [];

  const lignes = servicesMontants(dossier, baremes);
  const total = lignes.reduce((s, l) => s + l.montant_ht, 0);
  if (lignes.length === 0 || total <= 0) {
    return [{ service: 'conseil', montant_ht: honoraires }];
  }
  return lignes.map((l) => ({
    service: l.service,
    montant_ht: (l.montant_ht / total) * honoraires,
  }));
}
