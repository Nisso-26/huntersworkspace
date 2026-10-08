import { describe, it, expect } from 'vitest';
import { compteursParService, niveauParService, seuilsN2, type FactureCompteur } from './niveau-service';
import { computeCommissionsParService } from './pipeline-transitions';

const M = 'm1';
const fact = (montant: number, date: string, dossier = 'd0', service = 'chasse'): FactureCompteur => ({
  mandataire_id: M, dossier_id: dossier, montant, statut: 'payee', type: 'honoraires', date_paiement: date,
  lignes: [{ service_key: service, montant_ht: montant }],
});
const seuils = seuilsN2(null);
const niv = (factures: FactureCompteur[], annee: number, dossierId?: string) =>
  niveauParService(compteursParService(M, annee, factures, new Map(), [], { exclureDossierId: dossierId }), seuils);

describe('Niveau N2 par service', () => {
  it('passe en N2 le service dont le seuil est atteint, les autres restent N1', () => {
    const n = niv([fact(25000, '2026-03-01', 'a'), fact(15000, '2026-05-01', 'b')], 2026, 'c');
    expect(n.chasse).toBe('N2');
    expect(n.conseil).toBe('N1');
    expect(computeCommissionsParService([{ service: 'chasse', montant_ht: 1000 }, { service: 'conseil', montant_ht: 1000 }], null, n)
      .map(c => c.taux)).toEqual([60, 30]);
  });

  it('le dossier qui fait franchir le seuil reste en N1', () => {
    // 30 000 encaissés avant ; le dossier franchisseur (12 000) ne compte pas pour lui-même
    const factures = [fact(30000, '2026-02-01', 'a'), fact(12000, '2026-06-01', 'franchisseur')];
    expect(niv(factures, 2026, 'franchisseur').chasse).toBe('N1');
    expect(niv(factures, 2026, 'suivant').chasse).toBe('N2');
  });

  it('remise à zéro au 1er janvier', () => {
    const factures = [fact(50000, '2025-11-15', 'a')];
    expect(niv(factures, 2025, 'x').chasse).toBe('N2');
    expect(niv(factures, 2026, 'x').chasse).toBe('N1');
  });
});
