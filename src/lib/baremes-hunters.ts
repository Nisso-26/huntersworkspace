// Moteur de calcul du barème HUNTERS à paliers — implémentation UNIQUE.
// Toute évolution du calcul (tranches, forfait, pourcentage, part fixe) se fait
// ici : devis, facturation, documents contractuels et commissions y pointent.

import type { BaremeHunters, BaremeService } from '@/hooks/use-baremes-hunters';
import { fmtPdfEur } from '@/lib/pdf-utils';

/** Tranche applicable pour un service et une base donnée (bornes incluses). */
export function pickTranche(
  rows: BaremeHunters[],
  service: BaremeService,
  base: number,
): BaremeHunters | undefined {
  return rows.find(
    (r) =>
      r.service === service &&
      base >= Number(r.tranche_min) &&
      (r.tranche_max === null || base <= Number(r.tranche_max)),
  );
}

/** Montant HT d'une tranche : forfait sec, ou part fixe + pourcentage de la base. */
export function computeMontantBareme(t: BaremeHunters | undefined, base: number): number {
  if (!t) return 0;
  const fixe = Number(t.valeur_fixe) || 0;
  if (t.type === 'forfait') return Number(t.valeur) || fixe || 0;
  return fixe + (base * (Number(t.valeur) || 0)) / 100;
}

/** Montant HT + libellé de détail lisible (utilisé dans devis / factures). */
export function computeMontant(
  t: BaremeHunters | undefined,
  base: number,
): { montant: number; detail: string } {
  if (!t) return { montant: 0, detail: 'Tranche non définie' };
  const fixe = Number(t.valeur_fixe) || 0;
  if (t.type === 'forfait') {
    const m = Number(t.valeur) || fixe || 0;
    return { montant: m, detail: `Forfait ${fmtPdfEur(m)}` };
  }
  const pct = Number(t.valeur) || 0;
  const m = fixe + (base * pct) / 100;
  return {
    montant: m,
    detail: fixe > 0
      ? `${fmtPdfEur(fixe)} + ${pct}% × ${fmtPdfEur(base)} = ${fmtPdfEur(m)}`
      : `${pct}% × ${fmtPdfEur(base)} = ${fmtPdfEur(m)}`,
  };
}

/** Raccourci : montant HT d'un service directement depuis les barèmes. */
export function montantBareme(
  baremes: BaremeHunters[],
  service: BaremeService,
  base: number,
): number {
  return computeMontantBareme(pickTranche(baremes, service, base), base);
}
