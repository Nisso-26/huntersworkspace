export type PartnerProfile =
  | 'cgp'
  | 'courtier'
  | 'avocat'
  | 'notaire'
  | 'juriste'
  | 'expert_comptable';

export interface PartnerPortalProfile {
  profile: PartnerProfile;
  scope_lecture: string[];
  scope_decision: string[];
  natureValidation: string;
  labelQuitus: string;
  labelInvalidation: string;
}

const LEGAL_SCOPE = ['structure_juridique_fiscale', 'projet'];

const PROFILES: Record<PartnerProfile, Omit<PartnerPortalProfile, 'profile'>> = {
  cgp: {
    scope_lecture: ['situation_financiere', 'patrimoine', 'projet', 'montage'],
    scope_decision: ['montage'],
    natureValidation: 'Validation stratégie patrimoniale',
    labelQuitus: 'Stratégie validée',
    labelInvalidation: 'Révision recommandée',
  },
  courtier: {
    scope_lecture: ['situation_financiere', 'projet', 'financement_resume'],
    scope_decision: ['financement_resume'],
    natureValidation: 'Validation financement',
    labelQuitus: 'Financement finançable',
    labelInvalidation: 'Non finançable en l’état',
  },
  avocat: {
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['structure_juridique_fiscale'],
    natureValidation: 'Validation juridique',
    labelQuitus: 'Validation juridique',
    labelInvalidation: 'Révision juridique recommandée',
  },
  notaire: {
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['structure_juridique_fiscale'],
    natureValidation: 'Confirmation notariale',
    labelQuitus: 'Confirmation notariale',
    labelInvalidation: 'Révision recommandée',
  },
  juriste: {
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['structure_juridique_fiscale'],
    natureValidation: 'Validation juridique',
    labelQuitus: 'Validation juridique',
    labelInvalidation: 'Révision juridique recommandée',
  },
  expert_comptable: {
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['structure_juridique_fiscale'],
    natureValidation: 'Validation fiscale',
    labelQuitus: 'Validation fiscale',
    labelInvalidation: 'Révision fiscale recommandée',
  },
};

export function partnerProfileFromSpecialite(specialite?: string | null): PartnerProfile {
  const value = specialite || '';
  if (/cgp/i.test(value)) return 'cgp';
  if (/avocat/i.test(value)) return 'avocat';
  if (/notaire/i.test(value)) return 'notaire';
  if (/juriste/i.test(value)) return 'juriste';
  if (/expert.?comptable/i.test(value)) return 'expert_comptable';
  return 'courtier';
}

export function partnerPortalProfile(specialite?: string | null): PartnerPortalProfile {
  const profile = partnerProfileFromSpecialite(specialite);
  return { profile, ...PROFILES[profile] };
}