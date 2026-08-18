import { describe, it, expect } from 'vitest';
import {
  shouldTriggerHonoraires,
  commissionRateForService,
  computeCommission,
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

describe('commissionRateForService', () => {
  it('applique le barème réel par service en N2', () => {
    expect(commissionRateForService(null, 'conseil', 'N2')).toBe(40);
    expect(commissionRateForService(null, 'chasse', 'n2')).toBe(60);
    expect(commissionRateForService(null, 'amo', 'N2')).toBe(25);
    expect(commissionRateForService(null, 'deco', 'N2')).toBe(20);
  });

  it('applique le barème réel par service en N1 ou inconnu (fallback)', () => {
    expect(commissionRateForService(null, 'conseil', 'N1')).toBe(30);
    expect(commissionRateForService(null, 'chasse', null)).toBe(55);
    expect(commissionRateForService(null, 'amo', undefined)).toBe(20);
    expect(commissionRateForService(null, 'deco', '')).toBe(15);
  });

  it('privilégie les taux de company_settings', () => {
    expect(commissionRateForService({ commission_chasse_n1: 45 }, 'chasse', 'N1')).toBe(45);
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
