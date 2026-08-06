// Harnais temporaire de QA visuelle des PDF (dev uniquement).
import { generateFacturePDF } from '@/hooks/use-factures';

const settings = {
  raison_sociale: 'HUNTERS Immobilier',
  forme_juridique: 'SAS',
  capital_social: '10 000 €',
  siret: '95012345600018',
  rcs: 'Tours B 950 123 456',
  numero_tva_intra: 'FR12950123456',
  adresse_siege: '45 rue Michel Colombe\n37000 Tours',
  telephone: '02 47 00 00 00',
  email_contact: 'contact@huntersimmobilier.fr',
  site_web: 'hunters-immobilier.fr',
  carte_t_numero: 'CPI 3701 2024 000 000 123',
  carte_t_organisme: 'CCI Touraine',
  assureur_rcp: 'MMA',
  assureur_police: '1234567',
  iban: 'FR76 3000 4000 0300 0000 0000 123',
  bic: 'BNPAFRPPXXX',
} as any;

const facture = {
  id: 'x',
  reference: 'FA-2026-0042',
  numero_facture: 'FA-2026-0042',
  type: 'honoraires',
  montant: 12000,
  tva_taux: 20,
  date_emission: new Date().toISOString(),
  date_echeance: new Date(Date.now() + 30 * 864e5).toISOString(),
  dossier_numero: 'D-2026-018',
  dossier_client_name: 'Didier GBENOU',
  client_name: 'Didier GBENOU',
  mandataire_name: 'Anais SAIZONOU',
  lignes: [
    { service_key: 'cle_en_main', label: 'Pack clé en main', tarif_base: 12000, remise_pct: 10, remise_montant: 1200, montant_ht: 10800, tva_taux: 20 },
    { service_key: 'conseil', label: 'Conseil en investissement (tarif plein)', tarif_base: 1500, remise_pct: 0, remise_montant: 0, montant_ht: 1500, tva_taux: 20 },
  ],
} as any;

(window as any).__qaFacture = () => generateFacturePDF(facture, settings);
