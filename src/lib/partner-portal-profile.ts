export type PartnerProfile =
  | 'cgp'
  | 'courtier'
  | 'avocat'
  | 'notaire'
  | 'juriste'
  | 'expert_comptable';

export interface PartnerPortalProfile {
  profile: PartnerProfile;
  famille: 'montage' | 'financement';
  scope_lecture: string[];
  scope_decision: string[];
  peutProposer: 'strategie' | 'montage_financier' | null;
  natureValidation: string;
  labelQuitus: string;
  labelInvalidation: string;
}

const LEGAL_SCOPE = ['patrimoine', 'projet', 'montage'];

const PROFILES: Record<PartnerProfile, Omit<PartnerPortalProfile, 'profile'>> = {
  cgp: {
    famille: 'montage',
    scope_lecture: ['situation_financiere', 'patrimoine', 'projet', 'montage'],
    scope_decision: ['montage'],
    peutProposer: 'strategie',
    natureValidation: 'Validation stratégie patrimoniale',
    labelQuitus: 'Stratégie validée',
    labelInvalidation: 'Révision recommandée',
  },
  courtier: {
    famille: 'financement',
    scope_lecture: ['situation_financiere', 'projet', 'financement_resume'],
    scope_decision: ['financement_resume'],
    peutProposer: 'montage_financier',
    natureValidation: 'Validation financement',
    labelQuitus: 'Financement finançable',
    labelInvalidation: 'Non finançable en l’état',
  },
  avocat: {
    famille: 'montage',
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['montage'],
    peutProposer: null,
    natureValidation: 'Validation juridique',
    labelQuitus: 'Validation juridique',
    labelInvalidation: 'Révision juridique recommandée',
  },
  notaire: {
    famille: 'montage',
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['montage'],
    peutProposer: null,
    natureValidation: 'Confirmation notariale',
    labelQuitus: 'Confirmation notariale',
    labelInvalidation: 'Révision recommandée',
  },
  juriste: {
    famille: 'montage',
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['montage'],
    peutProposer: null,
    natureValidation: 'Validation juridique',
    labelQuitus: 'Validation juridique',
    labelInvalidation: 'Révision juridique recommandée',
  },
  expert_comptable: {
    famille: 'montage',
    scope_lecture: LEGAL_SCOPE,
    scope_decision: ['montage'],
    peutProposer: null,
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
  if (/(fiscal|expert.?comptable)/i.test(value)) return 'expert_comptable';
  return 'courtier';
}

export function partnerPortalProfile(specialite?: string | null): PartnerPortalProfile {
  const profile = partnerProfileFromSpecialite(specialite);
  return { profile, ...PROFILES[profile] };
}