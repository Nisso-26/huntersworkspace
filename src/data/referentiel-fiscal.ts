export type TypeSection =
  | 'info'
  | 'avantage'
  | 'danger'
  | 'profil'
  | 'exemple'
  | 'formule';

export interface SectionFiche {
  titre: string;
  contenu: string;
  type: TypeSection;
}

export interface FicheDispositif {
  id: string;
  nom: string;
  sections: SectionFiche[];
}

export interface QuestionArbre {
  id: string;
  question: string;
  reponses: {
    label: string;
    orientation: string;
    color: 'green' | 'blue' | 'orange' | 'red' | 'gray';
    final: boolean;
  }[];
}

export interface LigneComparatif {
  critere: string;
  lmnp: string;
  sci_ir: string;
  sci_is: string;
  nu_propriete: string;
  deficit_foncier: string;
  highlight?: boolean;
}

export const COMPARATIF: LigneComparatif[] = [
  { critere: "TMI idéal", lmnp: "Tous (30%+)", sci_ir: "≤ 30 %", sci_is: "41–45 %", nu_propriete: "Tous", deficit_foncier: "30–45 %" },
  { critere: "Horizon min.", lmnp: "3 ans", sci_ir: "5 ans", sci_is: "8 ans+", nu_propriete: "10–15 ans", deficit_foncier: "3 ans" },
  { critere: "Fiscalité revenus", lmnp: "BIC — amort. déductibles", sci_ir: "Revenus fonciers IR", sci_is: "IS 15% puis 25%", nu_propriete: "Aucune (démembrement)", deficit_foncier: "Déficit imputable IR" },
  { critere: "Encadrement loyers", lmnp: "Non ✅", sci_ir: "Non ✅", sci_is: "Non ✅", nu_propriete: "Pas de loyer", deficit_foncier: "Non ✅" },
  { critere: "Transmission patrimoine", lmnp: "Limitée ❌", sci_ir: "Possible ✅", sci_is: "Possible ✅", nu_propriete: "Optimale ✅", deficit_foncier: "Limitée ❌" },
  { critere: "Plus-value revente", lmnp: "PV perso (abatt. durée)", sci_ir: "PV perso (abatt. durée)", sci_is: "IS sur PV ⚠", nu_propriete: "PV démembrée ✅", deficit_foncier: "PV perso (abatt. durée)" },
  { critere: "Complexité admin.", lmnp: "Faible ✅", sci_ir: "Moyenne ⚠", sci_is: "Élevée ❌", nu_propriete: "Faible ✅", deficit_foncier: "Faible–Moyenne ⚠" },
  { critere: "Ticket d'entrée", lmnp: "< 200k€ possible ✅", sci_ir: "Tous budgets ✅", sci_is: "Plutôt > 200k€ ⚠", nu_propriete: "Décote 20–40% ✅", deficit_foncier: "Travaux > 30% prix ⚠" },
  { critere: "Profil idéal Hunters", lmnp: "Francilien 1er invest.", sci_ir: "Famille / succession", sci_is: "Cadre 41–45% TMI", nu_propriete: "Préparation retraite", deficit_foncier: "Investisseur avec travaux", highlight: true },
];

export const ARBRE: QuestionArbre[] = [
  {
    id: "Q1",
    question: "Le client veut-il percevoir des revenus locatifs immédiatement ?",
    reponses: [
      { label: "OUI", orientation: "→ Passer à Q2", color: "green", final: false },
      { label: "NON", orientation: "Nu-propriété — aucun loyer, aucune gestion, récupération pleine propriété à terme", color: "blue", final: true },
    ],
  },
  {
    id: "Q2",
    question: "Le client a-t-il un TMI ≥ 41 % ?",
    reponses: [
      { label: "OUI", orientation: "→ Passer à Q3", color: "green", final: false },
      { label: "NON (TMI 0–30%)", orientation: "LMNP en priorité si meublé possible. SCI IR si transmission patrimoniale visée.", color: "blue", final: true },
    ],
  },
  {
    id: "Q3",
    question: "Le bien sera-t-il loué meublé ?",
    reponses: [
      { label: "OUI", orientation: "LMNP au réel — amortissements déductibles, revenus quasi non imposés 10–15 ans", color: "green", final: true },
      { label: "NON (nu)", orientation: "Déficit foncier si travaux > 30% du prix. SCI IS si capitalisation sans distribution.", color: "orange", final: true },
    ],
  },
  {
    id: "Q4",
    question: "Le client prévoit-il d'associer famille ou partenaires ?",
    reponses: [
      { label: "OUI", orientation: "SCI IR ou SCI IS selon TMI. Détention multi-associés et transmission progressive.", color: "green", final: true },
      { label: "NON", orientation: "Détention en direct. LMNP si meublé, revenus fonciers si nu.", color: "gray", final: true },
    ],
  },
  {
    id: "Q5",
    question: "Le client a-t-il des travaux importants (> 30% du prix d'achat) ?",
    reponses: [
      { label: "OUI", orientation: "Déficit foncier en priorité — travaux déductibles, économie fiscale immédiate.", color: "green", final: true },
      { label: "NON", orientation: "Pas d'intérêt pour le déficit foncier. Revenir à LMNP ou SCI IS.", color: "gray", final: true },
    ],
  },
  {
    id: "Q6",
    question: "L'horizon d'investissement est-il > 10 ans ?",
    reponses: [
      { label: "OUI", orientation: "Tous dispositifs envisageables. SCI IS et nu-propriété particulièrement adaptés.", color: "green", final: true },
      { label: "NON (< 5 ans)", orientation: "LMNP ou revenus fonciers. Éviter SCI IS (PV défavorable) et nu-propriété.", color: "red", final: true },
    ],
  },
];

export const FICHES: FicheDispositif[] = [
  {
    id: "lmnp",
    nom: "LMNP — Location Meublée Non Professionnelle",
    sections: [
      { titre: "Régime fiscal", contenu: "BIC (Bénéfices Industriels et Commerciaux) — régime réel recommandé systématiquement.", type: "info" },
      { titre: "Mécanisme clé", contenu: "Amortissement comptable du bien (hors terrain) sur 25–40 ans + mobilier sur 5–10 ans. Ces charges déductibles effacent fiscalement les loyers perçus.", type: "info" },
      { titre: "Avantages", contenu: "Revenus quasi non imposés les 10–15 premières années. Pas de plafond de loyer. Micro-BIC possible si loyers < 77 700€/an (abattement 50%). PV personnelle à la revente avec abattements durée.", type: "avantage" },
      { titre: "Points de vigilance", contenu: "Amortissements réintégrés dans la PV si statut LMP. Comptabilité BIC obligatoire (400–800€/an). Le bien doit être loué meublé (liste mobilier obligatoire — décret 31/07/2015).", type: "danger" },
      { titre: "Profil idéal", contenu: "TMI 30% ou plus. Premier investisseur cherchant cash-flow positif ou neutre. Studio, T2 en zones tendues (Tours, Angers, Le Mans). Budget < 200 000€.", type: "profil" },
      { titre: "Exemple chiffré", contenu: "Bien 150 000€ (terrain 15 000€). Amortissement bien : 135 000 ÷ 30 ans = 4 500€/an. Mobilier 8 000€ ÷ 7 ans = 1 143€/an. Loyers : 7 200€/an. BIC imposable : 1 557€ → fiscalité quasi nulle. Économie vs régime nu : ~1 500–2 000€/an.", type: "exemple" },
      { titre: "Ce que vous dites au client", contenu: "« En LMNP au réel, vous percevez des loyers mais vous ne payez quasiment pas d'impôts dessus grâce aux amortissements. C'est comme si votre bien se dépréciait comptablement chaque année pour effacer le revenu — alors qu'en réalité il prend de la valeur. »", type: "formule" },
    ],
  },
  {
    id: "sci_ir",
    nom: "SCI IR — Société Civile Immobilière à l'IR",
    sections: [
      { titre: "Régime fiscal", contenu: "Revenus fonciers à l'IR — transparence fiscale : les loyers remontent dans la déclaration personnelle de chaque associé.", type: "info" },
      { titre: "Mécanisme clé", contenu: "La SCI n'est pas imposée. Charges déductibles : intérêts d'emprunt, travaux d'entretien, taxe foncière, assurances, frais de gestion.", type: "info" },
      { titre: "Avantages", contenu: "Meilleur outil de transmission patrimoniale : donation de parts tous les 15 ans dans l'abattement (100 000€ par enfant par parent). Décote de valorisation des parts (10–15%). Multi-associés dès la création.", type: "avantage" },
      { titre: "Points de vigilance", contenu: "Revenus fonciers s'ajoutent à l'IR personnel → peu adapté aux TMI 41–45%. Location nue uniquement. Frais de constitution : 1 500–2 500€. Comptabilité + liasse fiscale annuelle.", type: "danger" },
      { titre: "Profil idéal", contenu: "TMI ≤ 30%. Client avec enfants voulant transmettre son patrimoine. Investisseur souhaitant associer conjoint ou enfants dès l'achat.", type: "profil" },
      { titre: "Exemple chiffré", contenu: "SCI 2 associés 50/50. Loyers 12 000€/an. Charges 4 000€. Revenu net : 8 000€. Quote-part : 4 000€/associé. TMI 30% : IS 1 200€ + PS 688€ = 1 888€/associé. Total fiscalité : 3 776€ sur 12 000€ de loyers.", type: "exemple" },
      { titre: "Ce que vous dites au client", contenu: "« La SCI à l'IR, c'est le meilleur outil pour investir en famille. Vous créez une société avec vos proches, vous gérez le bien ensemble, et vous pouvez donner des parts à vos enfants tous les 15 ans sans payer de droits de succession. »", type: "formule" },
    ],
  },
  {
    id: "sci_is",
    nom: "SCI IS — Société Civile Immobilière à l'IS",
    sections: [
      { titre: "Régime fiscal", contenu: "IS : 15% jusqu'à 42 500€ de bénéfice, puis 25% au-delà. Le bénéfice reste dans la SCI tant qu'il n'est pas distribué.", type: "info" },
      { titre: "Mécanisme clé", contenu: "La SCI paie l'IS sur ses bénéfices. Les amortissements sont déductibles. Si le bénéfice reste dans la SCI, il peut financer l'achat d'un 2e bien sans fiscalité personnelle.", type: "info" },
      { titre: "Avantages", contenu: "Fiscalité à 15% si revenus restent dans la SCI (vs 41–45% à l'IR). Amortissements déductibles. Capitalisation et réinvestissement facilités. Transmission de parts avec décote.", type: "avantage" },
      { titre: "Points de vigilance", contenu: "PV à la revente soumise à l'IS — très défavorable si revente < 15 ans. Distribution des bénéfices = flat tax 30% supplémentaire (double imposition). Option IS irrévocable après 5 ans. Comptabilité obligatoire.", type: "danger" },
      { titre: "Profil idéal", contenu: "TMI 41–45%. Client sans besoin de revenus locatifs à court terme. Investisseur multi-biens voulant capitaliser. Horizon > 8 ans impératif.", type: "profil" },
      { titre: "Exemple chiffré", contenu: "Loyers 18 000€/an. Amortissements 6 000€. Charges 3 000€. Bénéfice : 9 000€. IS 15% = 1 350€. Si gardé dans la SCI : 1 350€ de fiscalité. Vs IR à 41% : 7 380€. Économie : 6 030€/an.", type: "exemple" },
      { titre: "Ce que vous dites au client", contenu: "« La SCI à l'IS, c'est pour les clients qui ont beaucoup de revenus et qui ne veulent pas ajouter des loyers à leur tranche à 41%. Tant que l'argent reste dans la société, il est imposé à seulement 15%. Mais si on revend le bien, il faut calculer soigneusement — c'est le seul piège. »", type: "formule" },
    ],
  },
  {
    id: "nu_propriete",
    nom: "Nu-propriété — Démembrement temporaire",
    sections: [
      { titre: "Mécanisme", contenu: "Le bien est démembré : l'usufruitier perçoit les loyers. Le nu-propriétaire achète avec une décote de 20–40% selon la durée (10–20 ans). À terme, il récupère la pleine propriété sans frais.", type: "info" },
      { titre: "Qui est l'usufruitier ?", contenu: "Bailleur institutionnel (bailleur social, office HLM) ou promoteur. Durée typique : 15–20 ans.", type: "info" },
      { titre: "Avantages", contenu: "Achat à prix décoté (ex : bien 200 000€ acheté 130 000€). Zéro gestion locative. Zéro fiscalité sur les loyers. Hors base IFI pendant le démembrement. PV calculée sur valeur pleine propriété à terme.", type: "avantage" },
      { titre: "Points de vigilance", contenu: "Aucun revenu locatif pendant toute la durée. Capital immobilisé 10–20 ans. Dépend de la qualité de l'usufruitier. Marché secondaire limité avant le terme.", type: "danger" },
      { titre: "Profil idéal", contenu: "Tout TMI. Client avec épargne disponible, pas besoin de revenus immédiats. Préparation retraite à 10–15 ans. Client assujetti à l'IFI voulant sortir un actif de la base taxable.", type: "profil" },
      { titre: "Exemple chiffré", contenu: "Valeur pleine propriété : 200 000€. Démembrement 15 ans. Décote 35% → achat : 130 000€. À terme : récupération probable 250 000€. PV brute : ~120 000€ sur 15 ans. Rendement équivalent : ~4–5%/an sans charge ni fiscalité annuelle.", type: "exemple" },
      { titre: "Ce que vous dites au client", contenu: "« La nu-propriété, c'est pour le client qui dit je n'ai pas besoin d'argent maintenant mais je veux préparer ma retraite. Il achète moins cher, ne gère rien, ne paie aucun impôt, et dans 15 ans récupère un bien qui vaut bien plus que ce qu'il a payé. »", type: "formule" },
    ],
  },
  {
    id: "deficit_foncier",
    nom: "Déficit foncier — Travaux déductibles en location nue",
    sections: [
      { titre: "Mécanisme", contenu: "En location nue au régime réel, si les charges déductibles (travaux, intérêts, frais) dépassent les loyers, le déficit est imputable sur le revenu global à hauteur de 10 700€/an.", type: "info" },
      { titre: "Travaux déductibles", contenu: "Réparation, entretien, amélioration. EXCLUS : construction, reconstruction, agrandissement. Cas typiques : ravalement, toiture, chauffage, remise aux normes DPE.", type: "info" },
      { titre: "Avantages", contenu: "Réduction immédiate de l'IR l'année des travaux. Plafond 10 700€/an sur revenu global (excédent reportable 10 ans). Depuis 2023 : plafond doublé à 21 400€ pour sortir une passoire thermique (DPE F/G → D ou mieux). Valorisation du bien après travaux.", type: "avantage" },
      { titre: "Points de vigilance", contenu: "Bien à conserver en location nue 3 ans après imputation (sinon reprise fiscale). Intérêts d'emprunt déductibles uniquement des revenus fonciers. Travaux sur enveloppe existante uniquement.", type: "danger" },
      { titre: "Profil idéal", contenu: "TMI 30–45%. Client avec budget travaux > 30% du prix d'achat. Bien ancien nécessitant rénovation. Investisseur voulant économie fiscale immédiate.", type: "profil" },
      { titre: "Exemple chiffré", contenu: "Achat : 120 000€. Travaux : 45 000€. Loyers an 1 : 6 000€. Déficit : 40 500€. Imputation an 1 : 10 700€ → économie TMI 41% = 4 387€. Solde reporté : 29 800€ sur 10 ans de revenus fonciers futurs.", type: "exemple" },
      { titre: "Ce que vous dites au client", contenu: "« Le déficit foncier, c'est quand les travaux coûtent plus que les loyers. L'État vous laisse déduire jusqu'à 10 700€ par an directement de votre revenu imposable. Et si vous rénovez une passoire thermique, le plafond double à 21 400€. »", type: "formule" },
    ],
  },
];
