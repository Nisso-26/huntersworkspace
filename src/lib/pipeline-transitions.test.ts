import { describe, it, expect } from 'vitest';
import {
  shouldTriggerHonoraires,
  commissionRateForLevel,
  computeCommission,
  computeBonusParrainage,
  isValidPipelineStatus,
} from './pipeline-transitions';

describe('shouldTriggerHonoraires', () => {
  it('déclenche quand on passe à "signe" depuis un autre statut', () => {
    expect(shouldTriggerHonoraires('compromis', 'signe')).toBe(true);
    expect(shouldTriggerHonoraires('nouveau', 'signe')).toBe(true);
  });

  it('ne déclenche pas si déjà signé', () => {
    expect(shouldTriggerHonoraires('signe', 'signe')).toBe(false);
  });

  it('ne déclenche pas pour les autres transitions', () => {
    expect(shouldTriggerHonoraires('nouveau', 'conseil')).toBe(false);
    expect(shouldTriggerHonoraires('compromis', 'cloture')).toBe(false);
  });
});

describe('commissionRateForLevel', () => {
  it('renvoie 60 pour N2', () => {
    expect(commissionRateForLevel('N2')).toBe(60);
    expect(commissionRateForLevel('n2')).toBe(60);
  });

  it('renvoie 50 pour N1 ou inconnu (fallback)', () => {
    expect(commissionRateForLevel('N1')).toBe(50);
    expect(commissionRateForLevel(null)).toBe(50);
    expect(commissionRateForLevel(undefined)).toBe(50);
    expect(commissionRateForLevel('')).toBe(50);
  });
});

describe('computeCommission', () => {
  it('calcule correctement avec arrondi à 2 décimales', () => {
    expect(computeCommission(10000, 50)).toBe(5000);
    expect(computeCommission(7333, 60)).toBe(4399.8);
  });

  it('gère les valeurs invalides', () => {
    expect(computeCommission(NaN, 50)).toBe(0);
    expect(computeCommission(-100, 50)).toBe(0);
    expect(computeCommission(1000, NaN)).toBe(0);
    expect(computeCommission(1000, -10)).toBe(0);
  });
});

describe('computeBonusParrainage', () => {
  it('représente 2% des honoraires', () => {
    expect(computeBonusParrainage(10000)).toBe(200);
    expect(computeBonusParrainage(0)).toBe(0);
  });
});

describe('isValidPipelineStatus', () => {
  it('reconnait les statuts du pipeline', () => {
    expect(isValidPipelineStatus('signe')).toBe(true);
    expect(isValidPipelineStatus('nouveau')).toBe(true);
  });

  it('rejette les statuts inconnus', () => {
    expect(isValidPipelineStatus('inconnu')).toBe(false);
    expect(isValidPipelineStatus('')).toBe(false);
  });
});
