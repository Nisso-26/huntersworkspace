import { describe, it, expect } from 'vitest';
import { alerteDpe, calculerBilan, coutTotal, hypothesesParDefaut, plusValue, pmt, prixPlafond, type FicheCalc } from './fiche-bien-calculs';
import type { BaremeHunters } from '@/hooks/use-baremes-hunters';

const baremes: BaremeHunters[] = [
  { id: '1', service: 'chasse', tranche_min: 0, tranche_max: 150000, type: 'forfait', valeur: 6000, valeur_fixe: 0, ordre: 1 },
  { id: '2', service: 'chasse', tranche_min: 150000.01, tranche_max: null, type: 'pourcentage', valeur: 3, valeur_fixe: 1500, ordre: 2 },
];
const ctx = { baremes, tva: 20, tarifConseilHt: 0 };
const fiche: FicheCalc = {
  type_projet: 'locatif', prix_affiche: 200000, surface_habitable: 60, travaux: [{ montant_max: 66000 }],
  taxe_fonciere: 0, charges_copro_annuelles: 0, duree_detention_mois: 12, prix_revente_vise: 0, dpe_classe: 'G',
};

describe('fiche-bien-calculs', () => {
  it('prix plafond : coût total = enveloppe à 1 € près', () => {
    const h = { ...hypothesesParDefaut({ services_souscrits: { chasse: true } }, fiche), enveloppe: 250000, notaire_pct: 7.5 };
    const p = prixPlafond(fiche, h, ctx)!;
    expect(Math.abs(coutTotal(p, fiche, h, ctx).total - 250000)).toBeLessThanOrEqual(1);
  });

  it('mensualité 200 000 € / 3,5 % / 25 ans ≈ 1 001,25 €', () => {
    expect(pmt(0.035, 300, 200000)).toBeCloseTo(1001.25, 1);
  });

  it('plus-value : retient le plus favorable entre frais réels et forfait 7,5 %', () => {
    const faibles = plusValue(150000, 295000, 66000, 3750); // frais réels 2,5 %
    expect(faibles.forfait_retenu).toBe(true);
    expect(faibles.base).toBe(295000 - 150000 - 11250 - 66000);
    expect(faibles.impot).toBeCloseTo(faibles.base * 0.362, 2);
    const eleves = plusValue(150000, 295000, 66000, 15000);
    expect(eleves.forfait_retenu).toBe(false);
    expect(eleves.base).toBe(295000 - 150000 - 15000 - 66000);
  });

  it('DPE G sur un projet locatif déclenche une alerte', () => {
    expect(alerteDpe('G', 'locatif')).toMatch(/interdite depuis le 1er janvier 2025/);
    const b = calculerBilan(fiche, hypothesesParDefaut({}, fiche), {}, ctx);
    expect(b.alertes.some(a => a.startsWith('DPE G'))).toBe(true);
  });
});
