import { DossierClient, Mandataire, User } from '@/types/hunters';

export const currentUser: User = {
  id: 'admin-1',
  name: 'Alexandre Moreau',
  email: 'a.moreau@hunters-reseau.fr',
  role: 'super_admin',
};

export const mandataires: Mandataire[] = [
  { id: 'm1', name: 'Lucas Martin', email: 'l.martin@hunters.fr', role: 'mandataire', zone: 'Lyon', status: 'actif', caTotal: 47500, commissionsTotal: 4750, dossiersActifs: 6, abonnementStatus: 'actif', dateInscription: '2025-03-15', dernierPaiement: '2026-03-01' },
  { id: 'm2', name: 'Sophie Dubois', email: 's.dubois@hunters.fr', role: 'mandataire', zone: 'Paris', status: 'actif', caTotal: 62300, commissionsTotal: 6230, dossiersActifs: 8, abonnementStatus: 'actif', dateInscription: '2025-01-10', dernierPaiement: '2026-03-01' },
  { id: 'm3', name: 'Thomas Bernard', email: 't.bernard@hunters.fr', role: 'mandataire', zone: 'Bordeaux', status: 'actif', caTotal: 31200, commissionsTotal: 3120, dossiersActifs: 4, abonnementStatus: 'actif', dateInscription: '2025-06-20', dernierPaiement: '2026-03-01' },
  { id: 'm4', name: 'Emma Petit', email: 'e.petit@hunters.fr', role: 'mandataire', zone: 'Marseille', status: 'actif', caTotal: 28900, commissionsTotal: 2890, dossiersActifs: 3, abonnementStatus: 'actif', dateInscription: '2025-09-01', dernierPaiement: '2026-03-01' },
  { id: 'm5', name: 'Nicolas Roux', email: 'n.roux@hunters.fr', role: 'mandataire', zone: 'Toulouse', status: 'suspendu', caTotal: 15400, commissionsTotal: 1540, dossiersActifs: 2, abonnementStatus: 'impaye', dateInscription: '2025-11-05', dernierPaiement: '2026-01-01' },
  { id: 'm6', name: 'Julie Moreau', email: 'j.moreau@hunters.fr', role: 'mandataire', zone: 'Nantes', status: 'actif', caTotal: 39800, commissionsTotal: 3980, dossiersActifs: 5, abonnementStatus: 'actif', dateInscription: '2025-04-12', dernierPaiement: '2026-03-01' },
];

export const dossiers: DossierClient[] = [
  { id: 'd1', clientName: 'Pierre Lefèvre', email: 'p.lefevre@mail.com', phone: '06 12 34 56 78', mandataireId: 'm1', mandataireName: 'Lucas Martin', status: 'chasse', budget: 180000, ville: 'Lyon 3e', strategie: 'LMNP Réel', honoraires: 5500, dateCreation: '2026-01-15', dateMaj: '2026-03-28', etape: 3 },
  { id: 'd2', clientName: 'Marie Durand', email: 'm.durand@mail.com', phone: '06 23 45 67 89', mandataireId: 'm2', mandataireName: 'Sophie Dubois', status: 'offre', budget: 250000, ville: 'Paris 18e', strategie: 'Déficit foncier', honoraires: 8000, dateCreation: '2025-12-01', dateMaj: '2026-03-25', etape: 5 },
  { id: 'd3', clientName: 'Jean Dupont', email: 'j.dupont@mail.com', phone: '06 34 56 78 90', mandataireId: 'm1', mandataireName: 'Lucas Martin', status: 'compromis', budget: 150000, ville: 'Villeurbanne', strategie: 'LMNP micro-BIC', honoraires: 4500, dateCreation: '2025-11-20', dateMaj: '2026-03-20', etape: 5 },
  { id: 'd4', clientName: 'Claire Morel', email: 'c.morel@mail.com', phone: '06 45 67 89 01', mandataireId: 'm2', mandataireName: 'Sophie Dubois', status: 'nouveau', budget: 300000, ville: 'Boulogne', strategie: 'SCI IS', dateCreation: '2026-03-20', dateMaj: '2026-03-20', etape: 1 },
  { id: 'd5', clientName: 'François Garcia', email: 'f.garcia@mail.com', phone: '06 56 78 90 12', mandataireId: 'm3', mandataireName: 'Thomas Bernard', status: 'conseil', budget: 120000, ville: 'Bordeaux Centre', strategie: 'LMNP Réel', honoraires: 3500, dateCreation: '2026-02-10', dateMaj: '2026-03-18', etape: 2 },
  { id: 'd6', clientName: 'Isabelle Roche', email: 'i.roche@mail.com', phone: '06 67 89 01 23', mandataireId: 'm4', mandataireName: 'Emma Petit', status: 'visite', budget: 200000, ville: 'Marseille 8e', strategie: 'Déficit foncier', honoraires: 6000, dateCreation: '2026-01-05', dateMaj: '2026-03-27', etape: 4 },
  { id: 'd7', clientName: 'Antoine Lambert', email: 'a.lambert@mail.com', phone: '06 78 90 12 34', mandataireId: 'm6', mandataireName: 'Julie Moreau', status: 'signe', budget: 175000, ville: 'Nantes Sud', strategie: 'LMNP Réel', honoraires: 5000, dateCreation: '2025-10-15', dateMaj: '2026-03-10', etape: 5 },
  { id: 'd8', clientName: 'Nathalie Simon', email: 'n.simon@mail.com', phone: '06 89 01 23 45', mandataireId: 'm3', mandataireName: 'Thomas Bernard', status: 'chasse', budget: 160000, ville: 'Mérignac', strategie: 'LMNP micro-BIC', dateCreation: '2026-02-20', dateMaj: '2026-03-26', etape: 3 },
  { id: 'd9', clientName: 'Philippe Blanc', email: 'p.blanc@mail.com', phone: '06 90 12 34 56', mandataireId: 'm2', mandataireName: 'Sophie Dubois', status: 'signe', budget: 220000, ville: 'Paris 11e', strategie: 'SCI IS', honoraires: 7500, dateCreation: '2025-09-01', dateMaj: '2026-02-28', etape: 5 },
  { id: 'd10', clientName: 'Valérie Faure', email: 'v.faure@mail.com', phone: '06 01 23 45 67', mandataireId: 'm6', mandataireName: 'Julie Moreau', status: 'conseil', budget: 190000, ville: 'Saint-Herblain', strategie: 'Déficit foncier', dateCreation: '2026-03-15', dateMaj: '2026-03-29', etape: 2 },
];

export const statusLabels: Record<DossierClient['status'], string> = {
  nouveau: 'Nouveau',
  conseil: 'Conseil',
  chasse: 'Chasse',
  visite: 'Visites',
  offre: 'Offre',
  compromis: 'Compromis',
  signe: 'Signé',
  cloture: 'Clôturé',
};

export const statusColors: Record<DossierClient['status'], string> = {
  nouveau: 'bg-muted text-muted-foreground',
  conseil: 'bg-hunters-info/10 text-hunters-info',
  chasse: 'bg-hunters-warning/10 text-hunters-warning',
  visite: 'bg-accent/10 text-accent',
  offre: 'bg-accent/20 text-accent-foreground',
  compromis: 'bg-hunters-success/10 text-hunters-success',
  signe: 'bg-hunters-success/20 text-hunters-success',
  cloture: 'bg-muted text-muted-foreground',
};
