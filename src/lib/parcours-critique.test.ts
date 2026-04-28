import { describe, it, expect } from 'vitest';
import {
  shouldTriggerHonoraires,
  commissionRateForLevel,
  computeCommission,
  computeBonusParrainage,
  isValidPipelineStatus,
} from './pipeline-transitions';
import { fetchAllPaginated } from './supabase-pagination';

/**
 * Tests d'intégration sur le parcours critique :
 *   création dossier → progression pipeline → acte signé →
 *   déclenchement facture honoraires + commissions N1/N2 + bonus parrainage.
 *
 * On simule le passage par chaque étape pour garantir qu'aucune transition
 * ne déclenche la facturation prématurément, et que le calcul financier
 * final est rigoureusement correct quel que soit le niveau.
 */
describe('Parcours critique : Nouveau dossier → Acte signé', () => {
  const etapes = ['nouveau', 'conseil', 'recherche', 'visite', 'offre', 'compromis'] as const;

  it('aucune étape intermédiaire ne déclenche la facturation', () => {
    for (let i = 0; i < etapes.length - 1; i++) {
      expect(shouldTriggerHonoraires(etapes[i], etapes[i + 1])).toBe(false);
    }
  });

  it('le passage compromis → signe déclenche bien la facturation', () => {
    expect(shouldTriggerHonoraires('compromis', 'signe')).toBe(true);
  });

  it('toutes les étapes du parcours sont des statuts valides', () => {
    etapes.forEach((e) => expect(isValidPipelineStatus(e)).toBe(true));
    expect(isValidPipelineStatus('signe')).toBe(true);
  });
});

describe('Calcul financier complet à l\'acte signé', () => {
  const honoraires = 12000; // 12k€ d'honoraires sur un dossier type

  it('mandataire N1 sans parrain : commission 50%', () => {
    const taux = commissionRateForLevel('N1');
    const commission = computeCommission(honoraires, taux);
    expect(taux).toBe(50);
    expect(commission).toBe(6000);
  });

  it('mandataire N2 sans parrain : commission 60%', () => {
    const taux = commissionRateForLevel('N2');
    const commission = computeCommission(honoraires, taux);
    expect(taux).toBe(60);
    expect(commission).toBe(7200);
  });

  it('mandataire avec parrain : bonus 2% en plus pour le parrain', () => {
    const commissionFilleul = computeCommission(honoraires, commissionRateForLevel('N1'));
    const bonusParrain = computeBonusParrainage(honoraires);
    expect(commissionFilleul).toBe(6000);
    expect(bonusParrain).toBe(240);
    // Total versé par l'agence = commission filleul + bonus parrain
    expect(commissionFilleul + bonusParrain).toBe(6240);
  });

  it('honoraires nuls : aucune rémunération générée', () => {
    expect(computeCommission(0, 50)).toBe(0);
    expect(computeBonusParrainage(0)).toBe(0);
  });

  it('protection contre données corrompues (NaN, négatif)', () => {
    expect(computeCommission(NaN, 50)).toBe(0);
    expect(computeCommission(-5000, 50)).toBe(0);
    expect(computeCommission(10000, NaN)).toBe(0);
  });
});

describe('Pagination Supabase (>1000 lignes)', () => {
  it('récupère une seule page si moins de 1000 lignes', async () => {
    let calls = 0;
    const result = await fetchAllPaginated<number>(async (from, to) => {
      calls++;
      const rows = Array.from({ length: 500 }, (_, i) => from + i);
      return { data: rows, error: null };
    });
    expect(calls).toBe(1);
    expect(result.length).toBe(500);
  });

  it('agrège plusieurs pages quand la table dépasse 1000 lignes', async () => {
    let calls = 0;
    const TOTAL = 2500;
    const result = await fetchAllPaginated<number>(async (from, to) => {
      calls++;
      const upper = Math.min(to, TOTAL - 1);
      if (from > upper) return { data: [], error: null };
      const rows = Array.from({ length: upper - from + 1 }, (_, i) => from + i);
      return { data: rows, error: null };
    });
    expect(calls).toBe(3); // 0-999, 1000-1999, 2000-2499 (partiel → stop)
    expect(result.length).toBe(TOTAL);
    expect(result[0]).toBe(0);
    expect(result[TOTAL - 1]).toBe(TOTAL - 1);
  });

  it('propage les erreurs Supabase', async () => {
    await expect(
      fetchAllPaginated<number>(async () => ({
        data: null,
        error: new Error('PGRST: connection lost'),
      })),
    ).rejects.toThrow('connection lost');
  });
});
