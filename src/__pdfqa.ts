// Harnais temporaire de QA visuelle des PDF (dev uniquement).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { generateFacturePDF } from '@/hooks/use-factures';
import SimulateurTab from '@/components/SimulateurTab';
import RapportConseilButton from '@/components/RapportConseilButton';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient();

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

const FAKE_RAPPORT = `
1. PROFIL CLIENT
Client primo-investisseur, 38 ans, cadre du secteur privé, résidant à Tours.
- Revenus nets mensuels : 4 200 €
- Apport disponible : 45 000 €
- Objectif : constitution d'un patrimoine locatif à horizon 10 ans

2. CAPACITÉ DE FINANCEMENT
La capacité d'endettement résiduelle est estimée à 1 250 € par mois.

| Poste | Montant |
| --- | --- |
| Revenus nets | 4 200 € |
| Charges de crédit | 0 € |
| Capacité d'emprunt | 260 000 € |

3. MONTAGES ET SCÉNARIOS DE FINANCEMENT
Trois montages ont été étudiés : crédit amortissable 20 ans, crédit 25 ans et in fine.

4. STRATÉGIE D'INVESTISSEMENT
Acquisition d'un immeuble de rapport à rénover, secteur Tours-Nord.

5. SCÉNARIO COMPARATIF
Comparaison des trois options retenues.

6. RENTABILITÉ ET CASH-FLOW CIBLES
Objectif de rendement brut supérieur à 7 %.

7. RECOMMANDATIONS
- Privilégier un bien avec travaux déductibles
- Sécuriser le financement avant la recherche

8. PLAN D'INVESTISSEMENT PROGRESSIF
Déploiement en cinq phases sur 24 mois.

9. ORIENTATION FISCALE
Régime réel recommandé.

10. CONCLUSION
Le projet est cohérent avec la capacité financière du client.
`;

(supabase as any).functions.invoke = async (...a: any[]) => { console.log('QA invoke stub called', a[0]); return { data: { ok: true, rapport: FAKE_RAPPORT }, error: null }; };

const dossier = {
  id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  numero_dossier: 'D-2026-018',
  client_name: 'Didier GBENOU',
  email: 'didier@example.com',
  ville: 'Tours',
  budget: 300000,
  honoraires: 12000,
  status: 'recherche',
  notes: '',
  strategie: null,
} as any;

function App() {
  return React.createElement(QueryClientProvider, { client: qc },
   React.createElement(AuthProvider, null,
    React.createElement(
    'div',
    { style: { padding: 24 } },
    React.createElement(SimulateurTab, {
      prixRevient: 300000,
      loyerMensuel: 1450,
      reference: 'BIEN-2026-07',
      adresse: '12 rue Nationale, 37000 Tours',
      dossierClient: 'Didier GBENOU',
    }),
    React.createElement(RapportConseilButton, { dossier }),
  )));
}

const el = document.getElementById('root')!;
createRoot(el).render(React.createElement(App));
