import type { Dossier } from '@/hooks/use-dossiers';

export type ServiceKey = 'conseil' | 'chasse' | 'financement' | 'amo' | 'deco' | 'gestion_locative';

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  conseil: 'Conseil en investissement',
  chasse: 'Chasse immobilière',
  financement: 'Accompagnement financement',
  amo: 'AMO (Assistance à Maîtrise d\'Ouvrage)',
  deco: 'Déco / Ameublement',
  gestion_locative: 'Gestion locative',
};

export const ALL_SERVICES_TRUE: Record<ServiceKey, boolean> = {
  conseil: true, chasse: true, financement: true, amo: true, deco: true, gestion_locative: true,
};

export function getServices(d: Pick<Dossier, 'type_accompagnement' | 'services_souscrits'>): Record<ServiceKey, boolean> {
  if (d.type_accompagnement === 'cle_en_main') {
    return { conseil: true, chasse: true, financement: true, amo: true, deco: true, gestion_locative: false };
  }
  const s = (d.services_souscrits || {}) as Partial<Record<ServiceKey, boolean>>;
  return {
    conseil: !!s.conseil, chasse: !!s.chasse, financement: !!s.financement,
    amo: !!s.amo, deco: !!s.deco, gestion_locative: !!s.gestion_locative,
  };
}

export interface WorkflowStep {
  id: number;
  label: string;
  short: string;
  checklist: string[];
  service?: ServiceKey;
}

export const ALL_STEPS: WorkflowStep[] = [
  { id: 1, label: 'Qualification', short: 'Qualif.', checklist: ['Coordonnées client renseignées', 'Budget et zone définis', 'Notes de qualification ajoutées'] },
  { id: 2, label: 'Contractualisation', short: 'Contrat', checklist: ['Mandat de recherche envoyé', 'Mandat signé via Signature électronique', 'Contrat de service signé'] },
  { id: 3, label: 'Analyse patrimoniale', short: 'Analyse', checklist: ['Données financières saisies', 'Stratégie patrimoniale générée', 'Rapport de conseil produit', 'Rapport validé et envoyé au client'] },
  { id: 4, label: 'Présentation client', short: 'Portail', checklist: ['Portail client créé', 'Lien envoyé au client', 'Portail consulté par le client'] },
  { id: 5, label: 'Chasse active', short: 'Chasse', service: 'chasse', checklist: ['Biens identifiés et qualifiés', 'Visites planifiées', 'Compte-rendus de visites partagés'] },
  { id: 6, label: 'Offre et négociation', short: 'Offre', service: 'chasse', checklist: ['Offre d\'achat rédigée', 'Offre acceptée', 'Compromis signé'] },
  { id: 7, label: 'AMO / Suivi chantier', short: 'Chantier', service: 'amo', checklist: ['Sélection des artisans', 'Suivi des travaux', 'Réception du chantier'] },
  { id: 8, label: 'Déco / Ameublement', short: 'Déco', service: 'deco', checklist: ['Brief déco validé', 'Sélection mobilier', 'Livraison et installation'] },
  { id: 9, label: 'Closing et facturation', short: 'Closing', checklist: ['Acte authentique signé', 'Facture(s) émise(s)', 'Commission(s) versée(s)'] },
];

export function getWorkflowSteps(d: Pick<Dossier, 'type_accompagnement' | 'services_souscrits'>): WorkflowStep[] {
  const services = getServices(d);
  return ALL_STEPS.filter(s => !s.service || services[s.service]);
}

// Map status → step id — fallback purely from dossier.status when no completion data
const STATUS_TO_STEP: Record<string, number> = {
  nouveau: 1,
  conseil: 3,
  chasse: 5,
  visite: 5,
  offre: 6,
  compromis: 6,
  signe: 9,
  cloture: 9,
};

export function progressFromStatus(d: Pick<Dossier, 'type_accompagnement' | 'services_souscrits' | 'status'>): { current: number; total: number } {
  const steps = getWorkflowSteps(d);
  const total = steps.length;
  const targetId = STATUS_TO_STEP[d.status] ?? 1;
  // Find the highest step id present that is ≤ targetId
  let idx = 0;
  steps.forEach((s, i) => { if (s.id <= targetId) idx = i; });
  return { current: idx + 1, total };
}
