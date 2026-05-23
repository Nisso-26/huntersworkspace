export type UserRole = 'super_admin' | 'mandataire' | 'decoratrice' | 'analyste';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  zone?: string;
  status?: 'actif' | 'suspendu' | 'résilie';
  caTotal?: number;
  commissionsTotal?: number;
  dossiersActifs?: number;
}

export interface DossierClient {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  mandataireId: string;
  mandataireName: string;
  status: 'nouveau' | 'conseil' | 'chasse' | 'visite' | 'offre' | 'compromis' | 'signe' | 'cloture';
  budget: number;
  ville: string;
  strategie: string;
  honoraires?: number;
  dateCreation: string;
  dateMaj: string;
  etape: number;
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  icon?: string;
}

export interface Mandataire extends User {
  role: 'mandataire';
  abonnementStatus: 'actif' | 'suspendu' | 'impaye';
  dateInscription: string;
  dernierPaiement: string;
}
