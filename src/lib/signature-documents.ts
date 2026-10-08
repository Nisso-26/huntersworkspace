// Génération automatique des documents contractuels envoyés en signature.
// Le fond juridique reprend les documents Word HUNTERS livrés
// (Mandat de Recherche Exclusif, Convention de Mission Cadre,
//  Bon de Commande de Mission, Offre d'Achat) — seule la mise en forme change.

import type jsPDF from 'jspdf';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import type { CompanySettings } from '@/hooks/use-company-settings';
import type { BaremeHunters, BaremeService } from '@/hooks/use-baremes-hunters';
import { buildDocumentPdf } from '@/lib/document-pdf';
import { computeQualification, emptyQualification, type QualificationValues } from '@/components/QualificationClient';

export type SignatureDocType =
  | 'mandat_recherche'
  | 'convention_cadre'
  | 'bon_commande'
  | 'offre_achat'
  | 'conseil_patrimonial'
  | 'mission_amo'
  | 'mission_deco'
  | 'contrat_mandataire';

export interface SignatureFieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea';
  group: string;
}

export interface SignatureDocSpec {
  titre: string;
  /** Libellé affiché sur la page de couverture. */
  typeDocument: string;
  fields: SignatureFieldDef[];
  sections: (v: Record<string, string>) => ModeleSection[];
}

// ─── Helpers de formatage ────────────────────────────────────────────────────
export function fmtEur(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} EUR`
    .replace(/\u202f|\u00a0/g, ' ');
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function addMonths(d: Date, m: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + m);
  return out;
}

/** Valeur affichable ou pointillés à compléter à la main lors de la signature. */
function v(x: string | undefined | null, fallback = '.....................'): string {
  const s = (x ?? '').toString().trim();
  return s === '' ? fallback : s;
}

// ─── Barème : implémentation unique dans src/lib/baremes-hunters.ts ──────────
export { pickTranche, computeMontantBareme } from '@/lib/baremes-hunters';
import { pickTranche, computeMontantBareme } from '@/lib/baremes-hunters';

/** Taux de TVA applicable (%) issu des paramètres société, repli légal 20%. */
export function tvaRateFromSettings(company?: Partial<CompanySettings> | null): number {
  const raw = Number(company?.tva_taux_defaut);
  return Number.isFinite(raw) && raw >= 0 ? raw : 20;
}

/** Honoraires de chasse HT/TTC recalculés depuis les barèmes et le prix du bien. */
export function honorairesChasse(baremes: BaremeHunters[], prix: number, tvaRate = 20) {
  const ht = computeMontantBareme(pickTranche(baremes, 'chasse', prix), prix);
  return { ht, ttc: ht * (1 + tvaRate / 100) };
}

// ─── Spécifications par type de document ─────────────────────────────────────
const CLIENT_FIELDS: SignatureFieldDef[] = [
  { key: 'nom_client', label: 'Nom et prénom du client', group: 'Client' },
  { key: 'date_naissance', label: 'Date de naissance', group: 'Client' },
  { key: 'adresse_client', label: 'Adresse', group: 'Client' },
  { key: 'cp_ville_client', label: 'Code postal et ville', group: 'Client' },
  { key: 'telephone_client', label: 'Téléphone', group: 'Client' },
  { key: 'email_client', label: 'Email', group: 'Client' },
];

const CABINET_FIELDS: SignatureFieldDef[] = [
  { key: 'conseiller', label: 'Mandataire HUNTERS en charge', group: 'Cabinet' },
  { key: 'ref_dossier', label: 'Référence dossier', group: 'Cabinet' },
  { key: 'forme_juridique', label: 'Forme juridique', group: 'Cabinet' },
  { key: 'siret', label: 'SIRET', group: 'Cabinet' },
  { key: 'adresse_siege', label: 'Siège social', group: 'Cabinet' },
  { key: 'carte_t', label: 'Carte professionnelle T n°', group: 'Cabinet' },
  { key: 'assurance_rcp', label: 'Assurance RCP', group: 'Cabinet' },
  { key: 'date_document', label: 'Date du document', group: 'Cabinet' },
];

const MENTION_HOGUET =
  "Document etabli conformement aux dispositions de la Loi n° 70-9 du 2 janvier 1970 (Loi Hoguet) " +
  "et de son decret d'application n° 72-678 du 20 juillet 1972. HUNTERS Immobilier est titulaire de la " +
  "Carte Professionnelle T delivree par la CCI d'Indre-et-Loire.";

function partiesBlock(v2: Record<string, string>, roleClient: string, roleCabinet: string): string {
  return (
    `${roleClient}\n` +
    `Nom et prenom : ${v(v2.nom_client)}\n` +
    `Date de naissance : ${v(v2.date_naissance)}\n` +
    `Adresse : ${v(v2.adresse_client)}\n` +
    `Code postal et ville : ${v(v2.cp_ville_client)}\n` +
    `Telephone : ${v(v2.telephone_client)}   —   Email : ${v(v2.email_client)}\n\n` +
    `${roleCabinet}\n` +
    `HUNTERS Immobilier — Cabinet de conseil en investissement immobilier\n` +
    `Forme juridique : ${v(v2.forme_juridique)}   —   SIRET : ${v(v2.siret)}\n` +
    `Siege social : ${v(v2.adresse_siege)}\n` +
    `Carte Professionnelle T n° ${v(v2.carte_t)} delivree par la CCI d'Indre-et-Loire\n` +
    `Assurance responsabilite civile professionnelle : ${v(v2.assurance_rcp)}\n` +
    `Representee par : Anais SAIZONOU, Fondateur et Directeur\n` +
    `Mandataire HUNTERS en charge du dossier : ${v(v2.conseiller)}`
  );
}

function partiesBlockSansCarteT(f: Record<string, string>, roleClient: string, roleCabinet: string): string {
  return (
    `${roleClient}\n` +
    `Nom et prenom : ${v(f.nom_client)}\n` +
    `Date de naissance : ${v(f.date_naissance)}\n` +
    `Adresse : ${v(f.adresse_client)}\n` +
    `Code postal et ville : ${v(f.cp_ville_client)}\n` +
    `Telephone : ${v(f.telephone_client)}   —   Email : ${v(f.email_client)}\n\n` +
    `${roleCabinet}\n` +
    `HUNTERS Immobilier — Cabinet de conseil en investissement immobilier\n` +
    `Forme juridique : ${v(f.forme_juridique)}   —   SIRET : ${v(f.siret)}\n` +
    `Siege social : ${v(f.adresse_siege)}\n` +
    `Assurance responsabilite civile professionnelle : ${v(f.assurance_rcp)}\n` +
    `Representee par : Anais SAIZONOU, Fondateur et Directeur\n` +
    `Mandataire HUNTERS en charge du dossier : ${v(f.conseiller)}`
  );
}

const RETRACTATION = "Lorsque le contrat est conclu a distance ou hors etablissement, le Client dispose de 14 jours a compter de sa signature pour se retracter, sans motif ni frais (C. conso., art. L221-18), au moyen du formulaire annexe ou de toute declaration denuee d'ambiguite. [ ] Le Client demande expressement le demarrage de la mission avant la fin du delai de retractation. En cas de retractation apres ce demarrage, il regle un montant proportionnel au service fourni (art. L221-25). Une fois la mission entierement executee, le droit de retractation ne peut plus etre exerce (art. L221-28, 1°).";
const CONFIDENTIALITE = "Les informations echangees sont strictement confidentielles, pendant le contrat et 3 ans apres son terme. Les donnees personnelles sont traitees pour la seule execution de la mission, conformement au RGPD et a la loi Informatique et Libertes ; le Client exerce ses droits d'acces, de rectification, d'effacement et de portabilite par courrier au siege ou par email.";
const MEDIATION = (f: Record<string, string>) => `En cas de litige, les Parties recherchent d'abord une solution amiable. A defaut sous 30 jours, le Client peut saisir gratuitement le mediateur de la consommation : ${v(f.mediateur)} (C. conso., art. L612-1). Le contrat est soumis au droit francais.`;
const FORMULAIRE = (f: Record<string, string>, titre: string) => `A l'attention de HUNTERS Immobilier, ${v(f.adresse_siege)}. Je vous notifie par la presente ma retractation du contrat portant sur la prestation de services ci-dessous. Contrat : ${titre} — Reference : ${v(f.ref_dossier)} — Commande le : ${v(f.date_document)}. Nom du Client : ..................... Adresse : ..................... Date et signature (uniquement en cas de notification sur papier) : .....................`;
const PAIEMENT_COMMUN = 'par virement sous 8 jours a reception de facture';

export const SIGNATURE_DOC_SPECS: Record<SignatureDocType, SignatureDocSpec> = {
  // ───────────────────────── MANDAT DE RECHERCHE EXCLUSIF ────────────────────
  mandat_recherche: {
    titre: 'Mandat de Recherche Exclusif',
    typeDocument: 'Mission Chasse Immobiliere — P02',
    fields: [
      ...CLIENT_FIELDS,
      ...CABINET_FIELDS,
      { key: 'secteurs', label: 'Secteur(s) HUNTERS attribué(s)', group: 'Mission' },
      { key: 'duree_mois', label: 'Durée du mandat (mois)', group: 'Mission' },
      { key: 'date_echeance', label: "Date d'échéance", group: 'Mission' },
      { key: 'budget_max', label: 'Budget maximum', group: 'Cahier des charges' },
      { key: 'apport', label: 'Apport disponible', group: 'Cahier des charges' },
      { key: 'capacite_emprunt', label: "Capacité d'emprunt estimée", group: 'Cahier des charges' },
      { key: 'type_bien', label: 'Type de bien recherché', group: 'Cahier des charges' },
      { key: 'type_location', label: 'Type de location visé', group: 'Cahier des charges' },
      { key: 'criteres', label: 'Critères complémentaires', type: 'textarea', group: 'Cahier des charges' },
      { key: 'honoraires_ht', label: 'Honoraires estimés HT', group: 'Honoraires' },
      { key: 'honoraires_ttc', label: 'Honoraires estimés TTC', group: 'Honoraires' },
    ],
    sections: (f) => [
      {
        id: 'parties', type: 'text', titre: 'Entre les parties',
        contenu: partiesBlock(f, 'LE MANDANT (le Client)', 'LE MANDATAIRE (HUNTERS Immobilier)') +
          `\n\nLe Mandant confie par le present document un mandat exclusif de recherche immobiliere ` +
          `a HUNTERS Immobilier, qui accepte dans les conditions definies ci-apres.`,
      },
      {
        id: 'a1', type: 'text', titre: 'Article 1 — Objet du mandat',
        contenu:
          "Par le present mandat, le Mandant confie a HUNTERS Immobilier la mission de rechercher, identifier " +
          "et preselectionner des biens immobiliers correspondant au cahier des charges annexe au present mandat " +
          "(Annexe 1), en vue d'une acquisition a usage locatif par le Mandant.\n" +
          "HUNTERS Immobilier s'engage a mettre en oeuvre tous les moyens necessaires pour identifier des " +
          "opportunites d'acquisition correspondant au profil defini, a analyser ces opportunites selon la grille " +
          "d'analyse HUNTERS, et a accompagner le Mandant jusqu'a la signature de l'acte authentique de vente.",
      },
      {
        id: 'a2', type: 'text', titre: 'Article 2 — Caractere exclusif du mandat',
        contenu:
          "Le present mandat est consenti a titre EXCLUSIF. Pendant toute sa duree, le Mandant s'engage a ne pas " +
          "confier une mission similaire a un autre chasseur immobilier, agent immobilier ou intermediaire, ni a " +
          "negocier directement avec un vendeur presente par HUNTERS Immobilier.\n" +
          "En cas de violation de cette clause d'exclusivite, les honoraires definis a l'Article 5 seront " +
          "integralement dus a HUNTERS Immobilier, meme si l'acquisition a ete realisee sans son intervention directe.",
      },
      {
        id: 'a3', type: 'text', titre: 'Article 3 — Duree du mandat',
        contenu:
          `Le present mandat est conclu pour une duree de ${v(f.duree_mois, '3')} mois a compter de sa date de signature.\n` +
          `Date de signature : ${v(f.date_document)}   —   Date d'echeance : ${v(f.date_echeance)}\n` +
          "A l'expiration de la duree initiale, le mandat est renouvele par tacite reconduction pour des periodes " +
          "successives d'un mois, sauf denonciation par lettre recommandee avec accuse de reception adressee a " +
          "l'autre Partie avec un preavis minimum de 15 jours avant la date d'echeance.",
      },
      {
        id: 'a4', type: 'text', titre: 'Article 4 — Secteur geographique de recherche',
        contenu:
          "La recherche est effectuee dans le ou les secteurs geographiques definis dans le Cahier des Charges " +
          "annexe (Annexe 1). Tout elargissement ou modification du perimetre de recherche doit faire l'objet d'un " +
          "avenant ecrit signe par les deux Parties.\n" +
          `Secteur(s) HUNTERS attribue(s) : ${v(f.secteurs)}`,
      },
      {
        id: 'a5', type: 'text', titre: 'Article 5 — Honoraires',
        contenu:
          `Les honoraires de HUNTERS Immobilier sont calcules sur le prix d'acquisition du bien, hors frais de notaire, selon le bareme en vigueur : jusqu'a 250 000 EUR, forfait de 6 500 EUR HT (7 800 EUR TTC) ; de 250 001 a 1 000 000 EUR, 3,5 % HT ; de 1 000 001 a 1 200 000 EUR, 2,75 % HT ; au-dela de 1 200 000 EUR, 2 % HT. TVA au taux de 20 % en sus. Estimation pour le budget retenu (${v(f.budget_max)}) : ${v(f.honoraires_ht)} HT — ${v(f.honoraires_ttc)} TTC.\n` +
          "SUCCES ONLY — Les honoraires ne sont dus qu'en cas d'acquisition effective d'un bien immobilier.\n" +
          "EXIGIBILITE — Les honoraires sont exigibles le jour de la signature de l'acte authentique chez le notaire.\n" +
          "BASE DE CALCUL — Le prix retenu est le prix acte chez le notaire, hors frais de notaire et frais d'agence.\n" +
          "NON-PAIEMENT — Une penalite de retard egale a 3 fois le taux d'interet legal est applicable de plein droit.",
      },
      {
        id: 'a6', type: 'text', titre: 'Article 6 — Obligations de HUNTERS Immobilier',
        contenu:
          "· Mettre en oeuvre une recherche active et reguliere selon le cahier des charges annexe.\n" +
          "· Informer le Mandant de l'avancement par un point hebdomadaire (chaque jeudi).\n" +
          "· Ne presenter que des biens analyses selon la grille HUNTERS a 5 niveaux.\n" +
          "· Remettre un rapport de visite ecrit dans les 24h suivant chaque visite realisee.\n" +
          "· Accompagner le Mandant dans la redaction et la transmission de l'offre d'achat.\n" +
          "· Assurer le suivi du dossier du compromis jusqu'a l'acte authentique.\n" +
          "· Agir exclusivement dans l'interet du Mandant, sans conflit d'interets.",
      },
      {
        id: 'a7', type: 'text', titre: 'Article 7 — Obligations du Mandant',
        contenu:
          "· Fournir toutes les informations necessaires a la recherche (situation financiere, capacite d'emprunt, objectifs).\n" +
          "· Informer HUNTERS sans delai de toute modification de sa situation ou de ses criteres.\n" +
          "· Respecter l'exclusivite conferee — ne pas contacter directement les vendeurs ou agences presentes.\n" +
          "· Se rendre disponible pour les visites dans un delai raisonnable.\n" +
          "· Informer HUNTERS immediatement en cas de decouverte d'un bien par ses propres moyens.\n" +
          "· Regler les honoraires dus a la date d'exigibilite definie a l'Article 5.",
      },
      {
        id: 'a8', type: 'text', titre: 'Article 8 — Biens decouverts par le Mandant',
        contenu:
          "Si le Mandant identifie, pendant la duree du present mandat, un bien repondant a son cahier des charges " +
          "sans l'intervention de HUNTERS Immobilier, il est tenu d'en informer HUNTERS par ecrit dans les 48 heures. " +
          "HUNTERS disposera d'un delai de 72 heures pour analyser le bien et remettre son avis. Si le Mandant procede " +
          "a l'acquisition de ce bien, les honoraires definis a l'Article 5 seront dus, sauf accord ecrit contraire.",
      },
      {
        id: 'a9', type: 'text', titre: 'Article 9 — Resiliation anticipee',
        contenu:
          "Par le Mandant : par lettre recommandee avec AR, avec un preavis de 15 jours, sous reserve du reglement " +
          "des honoraires dus pour tout bien presente par HUNTERS ayant abouti a une promesse de vente en cours.\n" +
          "Par HUNTERS : par lettre recommandee avec AR, avec un preavis de 15 jours, notamment en cas de modification " +
          "substantielle du cahier des charges rendant la mission impossible, ou de manquement du Mandant a ses obligations.",
      },
      {
        id: 'a10', type: 'text', titre: 'Article 10 — Confidentialite et donnees personnelles',
        contenu:
          "Les informations echangees sont strictement confidentielles. Les donnees personnelles du Mandant sont " +
          "traitees conformement au RGPD et a la Loi Informatique et Libertes. Le Mandant dispose d'un droit d'acces, " +
          "de rectification et d'effacement, exercable par courrier au siege de HUNTERS Immobilier.",
      },
      {
        id: 'a11', type: 'text', titre: 'Article 11 — Litiges',
        contenu:
          "En cas de litige, les Parties s'engagent a rechercher une solution amiable. A defaut d'accord dans un delai " +
          "de 30 jours, le litige sera soumis au mediateur de la consommation competent. En cas de persistance du " +
          "differend, les tribunaux du ressort de Tours seront seuls competents. Le present mandat est soumis au droit francais.",
      },
      {
        id: 'annexe', type: 'text', titre: 'Annexe 1 — Resume du cahier des charges',
        contenu:
          `Budget maximum : ${v(f.budget_max)}\n` +
          `Apport disponible : ${v(f.apport)}\n` +
          `Capacite d'emprunt estimee : ${v(f.capacite_emprunt)}\n` +
          `Secteur(s) de recherche : ${v(f.secteurs)}\n` +
          `Type de bien : ${v(f.type_bien)}\n` +
          `Type de location vise : ${v(f.type_location)}\n` +
          `Criteres complementaires : ${v(f.criteres)}`,
      },
      { id: 'mention', type: 'text', titre: 'Mention legale', contenu: MENTION_HOGUET +
        " Tout mandat de recherche doit etre enregistre au registre des mandats dans les 24h suivant sa signature." },
      { id: 'sign', type: 'signatures', titre: 'Signatures',
        contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── CONVENTION DE MISSION CADRE ─────────────────────
  convention_cadre: {
    titre: 'Convention de Mission Cadre',
    typeDocument: 'Accompagnement en investissement locatif',
    fields: [
      ...CLIENT_FIELDS,
      { key: 'situation_pro', label: 'Situation professionnelle', group: 'Client' },
      ...CABINET_FIELDS,
      { key: 'ref_convention', label: 'Référence de la convention', group: 'Cabinet' },
      { key: 'missions', label: 'Missions envisagées', type: 'textarea', group: 'Mission' },
      { key: 'tarif_conseil', label: 'Honoraires conseil (M01) retenus', group: 'Mission' },
    ],
    sections: (f) => [
      {
        id: 'parties', type: 'text', titre: 'Entre les parties',
        contenu:
          `Reference de la convention : ${v(f.ref_convention)}   —   Date : ${v(f.date_document)}\n\n` +
          partiesBlock(f, 'LE CLIENT', 'LE PRESTATAIRE') +
          `\nSituation professionnelle du Client : ${v(f.situation_pro)}\n\n` +
          "Le Client et le Prestataire sont ci-apres designes collectivement « les Parties ». " +
          "Il a ete convenu et arrete ce qui suit.",
      },
      {
        id: 'a1', type: 'text', titre: 'Article 1 — Objet de la convention',
        contenu:
          "La presente convention cadre definit les conditions generales dans lesquelles HUNTERS Immobilier " +
          "accompagne le Client dans son projet d'investissement immobilier locatif. Elle constitue le cadre " +
          "contractuel unique de la relation entre les Parties, au sein duquel chaque mission specifique est activee " +
          "par un Bon de Commande de Mission signe separement.\n" +
          "M01 — Conseil strategique : 1 500, 2 500 ou 3 500 EUR HT selon le score de la grille de qualification HUNTERS (BC-M01).\n" +
          "M02 — Chasse immobiliere : forfait de 6 500 EUR HT jusqu'a 250 000 EUR ; 3,5 % HT jusqu'a 1 000 000 EUR ; 2,75 % HT jusqu'a 1 200 000 EUR ; 2 % HT au-dela, sur le prix d'acquisition (BC-M02).\n" +
          "M03 — Assistance a maitrise d'ouvrage : 1 000 EUR + 9 % HT jusqu'a 150 000 EUR de travaux ; 1 500 EUR + 7,5 % HT jusqu'a 250 000 EUR ; 2 000 EUR + 6 % HT au-dela, sur le montant HT des travaux (BC-M03).\n" +
          "M04 — Decoration et ameublement : 1 500 EUR HT + 10 % jusqu'a 20 000 EUR d'achats ; 2 000 EUR HT + 8 % de 20 001 a 50 000 EUR ; 3 000 EUR HT + 6 % au-dela. Le pourcentage s'applique sur la totalite du montant HT des achats de mobilier et de decoration, hors travaux (BC-M04).\n" +
          "Pack cle en main : somme des missions souscrites, remise de 10 % sur M02, M03 et M04 ; le conseil n'est jamais remise.\n" +
          `Missions envisagees a ce jour pour le Client : ${v(f.missions)}.\n` +
          `Honoraires de conseil (M01) retenus selon scoring : ${v(f.tarif_conseil)}.\n` +
          "Le Client n'est pas tenu de souscrire a l'ensemble des missions. Chaque mission est independante.",
      },
      {
        id: 'a2', type: 'text', titre: 'Article 2 — Duree de la convention',
        contenu:
          "La presente convention est conclue pour une duree indeterminee a compter de sa signature. Elle peut etre " +
          "resiliee par l'une ou l'autre des Parties par lettre recommandee avec accuse de reception, moyennant un " +
          "preavis de 30 jours, sous reserve de l'achevement des missions en cours.",
      },
      {
        id: 'a3', type: 'text', titre: 'Article 3 — Obligations de HUNTERS Immobilier',
        contenu:
          "· Affecter au Client un mandataire HUNTERS qualifie et certifie, dedie a son accompagnement.\n" +
          "· Executer chaque mission activee avec diligence, rigueur et dans le respect des delais convenus.\n" +
          "· Informer le Client de l'avancement de chaque mission par des points de suivi reguliers.\n" +
          "· Preserver la confidentialite de toutes les informations communiquees par le Client.\n" +
          "· Agir exclusivement dans l'interet du Client, sans conflit d'interets avec des tiers.\n" +
          "· Respecter les obligations legales decoulant de la Loi Hoguet et de ses decrets d'application.\n" +
          "· Souscrire et maintenir une assurance responsabilite civile professionnelle adequate.",
      },
      {
        id: 'a4', type: 'text', titre: 'Article 4 — Obligations du Client',
        contenu:
          "· Fournir des informations completes, exactes et a jour sur sa situation financiere et patrimoniale.\n" +
          "· Informer HUNTERS sans delai de tout changement de situation susceptible d'affecter son projet.\n" +
          "· Respecter les conditions de paiement definies dans chaque Bon de Commande de Mission.\n" +
          "· Ne pas mandater un prestataire concurrent sur une mission couverte par un Bon de Commande signe.\n" +
          "· Prendre seul les decisions d'investissement — HUNTERS est un conseiller, non un decisionnaire.",
      },
      {
        id: 'a5', type: 'text', titre: 'Article 5 — Honoraires et facturation',
        contenu:
          "TVA — Les honoraires sont exprimes HT. La TVA au taux de 20 % est applicable sur l'ensemble des prestations.\n" +
          "FACTURATION — Une facture est emise a chaque echeance de paiement prevue dans le Bon de Commande.\n" +
          "PAIEMENT — Les factures sont payables par virement bancaire dans un delai de 8 jours.\n" +
          "RETARD — Tout retard entraine de plein droit une penalite egale a 3 fois le taux d'interet legal.\n" +
          "SUSPENSION — En cas de non-paiement, HUNTERS peut suspendre toute mission en cours apres mise en demeure " +
          "restee sans effet 8 jours.",
      },
      {
        id: 'a6', type: 'text', titre: 'Article 6 — Confidentialite',
        contenu:
          "Les Parties s'engagent mutuellement a preserver la confidentialite de toutes les informations echangees. " +
          "Cette obligation s'etend a l'existence meme de la relation contractuelle, aux informations financieres et " +
          "patrimoniales du Client, aux strategies d'investissement definies et aux donnees relatives aux biens " +
          "identifies ou acquis. Elle est valable pendant toute la duree de la convention et durant 3 ans apres son terme.",
      },
      {
        id: 'a7', type: 'text', titre: 'Article 7 — Protection des donnees personnelles',
        contenu:
          "Les donnees personnelles du Client sont collectees et traitees aux fins exclusives de l'execution des " +
          "missions prevues. Conformement au RGPD et a la loi Informatique et Libertes, le Client dispose d'un droit " +
          "d'acces, de rectification, d'effacement et de portabilite de ses donnees, exercable par courrier au siege " +
          "ou par email aupres du mandataire en charge du dossier.",
      },
      {
        id: 'a8', type: 'text', titre: 'Article 8 — Responsabilite',
        contenu:
          "HUNTERS Immobilier est tenu a une obligation de moyens. Sa responsabilite ne saurait etre engagee en cas de " +
          "decision d'investissement prise a l'encontre des recommandations formulees, de fluctuation du marche " +
          "posterieure a la mission de conseil, ou de refus de financement bancaire non imputable a une erreur de " +
          "HUNTERS. La responsabilite est limitee au montant des honoraires HT percus au titre de la mission concernee.",
      },
      {
        id: 'a9', type: 'text', titre: 'Article 9 — Mediation et droit applicable',
        contenu:
          "En cas de litige, les Parties rechercheront une solution amiable. A defaut d'accord dans un delai de " +
          "30 jours, le litige sera soumis au mediateur de la consommation competent (articles L.616-1 et R.616-1 du " +
          "Code de la consommation). La convention est soumise au droit francais ; les tribunaux du ressort de Tours " +
          "sont seuls competents.",
      },
      {
        id: 'a10', type: 'text', titre: 'Article 10 — Dispositions generales',
        contenu:
          "La nullite d'une clause n'entraine pas la nullite de l'ensemble du document. La convention constitue " +
          "l'integralite de l'accord entre les Parties et annule tout accord anterieur. Toute modification doit faire " +
          "l'objet d'un avenant ecrit signe par les deux Parties.",
      },
      { id: 'mention', type: 'text', titre: 'Mention legale', contenu: MENTION_HOGUET },
      { id: 'sign', type: 'signatures', titre: 'Signatures',
        contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── BON DE COMMANDE DE MISSION ──────────────────────
  bon_commande: {
    titre: 'Bon de Commande de Mission',
    typeDocument: 'Annexe a la Convention Cadre',
    fields: [
      ...CLIENT_FIELDS,
      ...CABINET_FIELDS,
      { key: 'num_bc', label: 'N° de bon de commande', group: 'Mission' },
      { key: 'ref_convention', label: 'Réf. Convention Cadre', group: 'Mission' },
      { key: 'mission', label: 'Mission activée', group: 'Mission' },
      { key: 'perimetre', label: 'Périmètre géographique', group: 'Mission' },
      { key: 'secteur', label: 'Secteur HUNTERS attribué', group: 'Mission' },
      { key: 'objectif', label: 'Objectif de la mission', type: 'textarea', group: 'Mission' },
      { key: 'delai', label: "Délai d'exécution convenu", group: 'Mission' },
      { key: 'livrables', label: 'Livrables inclus', type: 'textarea', group: 'Mission' },
      { key: 'montant_ht', label: 'Montant HT', group: 'Honoraires' },
      { key: 'montant_tva', label: 'TVA', group: 'Honoraires' },
      { key: 'montant_ttc', label: 'Montant TTC', group: 'Honoraires' },
      { key: 'echeancier', label: 'Échéancier de paiement', group: 'Honoraires' },
      { key: 'conditions', label: 'Conditions particulières', type: 'textarea', group: 'Honoraires' },
    ],
    sections: (f) => [
      {
        id: 'entete', type: 'text', titre: 'Identification',
        contenu:
          `N° Bon de Commande : ${v(f.num_bc)}\n` +
          `Ref. Convention Cadre : ${v(f.ref_convention)}\n` +
          `Date de signature : ${v(f.date_document)}\n` +
          `Mandataire en charge : ${v(f.conseiller)}\n\n` +
          partiesBlock(f, 'LE CLIENT', 'LE PRESTATAIRE'),
      },
      {
        id: 'mission', type: 'text', titre: 'Mission activee',
        contenu:
          `Mission : ${v(f.mission)}\n` +
          `Perimetre geographique : ${v(f.perimetre)}\n` +
          `Secteur HUNTERS attribue : ${v(f.secteur)}\n` +
          `Objectif de la mission : ${v(f.objectif)}\n` +
          `Delai d'execution convenu : ${v(f.delai)}\n` +
          `Livrables inclus : ${v(f.livrables)}\n\n` +
          "Rappel des missions du catalogue : voir la Convention Cadre, article 1 (baremes M01 a M04 en vigueur).",
      },
      {
        id: 'honoraires', type: 'text', titre: 'Honoraires et conditions de paiement',
        contenu:
          `Montant HT : ${v(f.montant_ht)}\n` +
          `TVA : ${v(f.montant_tva)}\n` +
          `Montant TTC : ${v(f.montant_ttc)}\n` +
          `Echeancier : ${v(f.echeancier)}\n\n` +
          "Echeanciers de reference : M01 — 50 % a la signature / 50 % a la remise · M02 — 100 % a l'acte " +
          "authentique · M03 — 30 % signature / 40 % mi-chantier / 30 % reception · M04 — 50 % signature / " +
          "50 % livraison. Les factures sont payables par virement sous 8 jours.",
      },
      {
        id: 'conditions', type: 'text', titre: 'Conditions specifiques a la mission',
        contenu:
          `${v(f.conditions, 'Aucune condition particuliere — les conditions generales de la Convention Cadre s\'appliquent integralement.')}`,
      },
      {
        id: 'retractation', type: 'text', titre: 'Droit de retractation',
        contenu:
          "Conformement aux articles L.221-18 et suivants du Code de la consommation, le Client particulier dispose " +
          "d'un delai de retractation de 14 jours calendaires a compter de la signature du present bon de commande. " +
          "La retractation doit etre notifiee par lettre recommandee avec accuse de reception adressee au siege de " +
          "HUNTERS Immobilier. En cas de retractation exercee dans ce delai, aucun honoraire ne sera du.\n" +
          "Le Client reconnait avoir ete informe de ce droit. Le demarrage immediat de la mission, s'il est demande " +
          "par le Client, vaut renonciation expresse a ce delai de 14 jours.",
      },
      { id: 'sign', type: 'signatures', titre: 'Signatures',
        contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── OFFRE D'ACHAT ───────────────────────────────────
  offre_achat: {
    titre: "Offre d'Achat",
    typeDocument: "Proposition d'acquisition — Mission M02",
    fields: [
      ...CLIENT_FIELDS,
      ...CABINET_FIELDS,
      { key: 'num_offre', label: "N° de l'offre", group: 'Offre' },
      { key: 'ref_mandat', label: 'Réf. mandat de recherche', group: 'Offre' },
      { key: 'vendeur', label: 'Vendeur (nom / raison sociale)', group: 'Offre' },
      { key: 'vendeur_coord', label: 'Coordonnées du vendeur', group: 'Offre' },
      { key: 'bien_adresse', label: 'Adresse complète du bien', group: 'Bien' },
      { key: 'bien_type', label: 'Type de bien', group: 'Bien' },
      { key: 'bien_surface', label: 'Surface habitable (loi Carrez)', group: 'Bien' },
      { key: 'bien_lot', label: 'Lot / référence cadastrale', group: 'Bien' },
      { key: 'prix_propose', label: 'Prix proposé', group: 'Prix' },
      { key: 'prix_affiche', label: 'Prix affiché (FAI)', group: 'Prix' },
      { key: 'montant_pret', label: 'Montant du prêt sollicité', group: 'Financement' },
      { key: 'taux_max', label: 'Taux maximum accepté', group: 'Financement' },
      { key: 'duree_pret', label: 'Durée maximale du prêt', group: 'Financement' },
      { key: 'notaire', label: "Notaire de l'acquéreur", group: 'Financement' },
      { key: 'honoraires_ht', label: 'Honoraires HUNTERS HT', group: 'Honoraires' },
      { key: 'honoraires_ttc', label: 'Honoraires HUNTERS TTC', group: 'Honoraires' },
    ],
    sections: (f) => [
      {
        id: 'preambule', type: 'text', titre: 'Preambule',
        contenu:
          "Cette offre d'achat est etablie conformement aux dispositions du Code civil et de la loi Hoguet. Elle " +
          "engage l'acquereur des lors qu'elle est acceptee par le vendeur. Elle doit etre transmise par ecrit " +
          "(email avec accuse de reception ou lettre RAR). HUNTERS Immobilier agit en qualite de mandataire de " +
          "l'acquereur — carte T detenue par la structure.\n" +
          `N° offre : ${v(f.num_offre)}   —   Ref. mandat : ${v(f.ref_mandat)}\n` +
          `Date de l'offre : ${v(f.date_document)}   —   Validite : 72 heures`,
      },
      {
        id: 'a1', type: 'text', titre: 'Article 1 — Identification des parties',
        contenu:
          `L'ACQUEREUR (Mandant HUNTERS)\n` +
          `Nom et prenom : ${v(f.nom_client)}\n` +
          `Date de naissance : ${v(f.date_naissance)}\n` +
          `Adresse : ${v(f.adresse_client)} — ${v(f.cp_ville_client)}\n` +
          `Telephone : ${v(f.telephone_client)}   —   Email : ${v(f.email_client)}\n\n` +
          `LE VENDEUR\n` +
          `Nom / raison sociale : ${v(f.vendeur)}\n` +
          `Coordonnees : ${v(f.vendeur_coord)}\n\n` +
          `HUNTERS Immobilier, mandataire de l'acquereur, agissant en vertu du Mandat de Recherche Exclusif ` +
          `n° ${v(f.ref_mandat)}, titulaire de la Carte Professionnelle T n° ${v(f.carte_t)} delivree par la ` +
          `CCI d'Indre-et-Loire. Mandataire en charge : ${v(f.conseiller)}.`,
      },
      {
        id: 'a2', type: 'text', titre: 'Article 2 — Designation du bien',
        contenu:
          `Adresse complete : ${v(f.bien_adresse)}\n` +
          `Type de bien : ${v(f.bien_type)}\n` +
          `Surface habitable (loi Carrez) : ${v(f.bien_surface)}\n` +
          `Lot / reference cadastrale : ${v(f.bien_lot)}`,
      },
      {
        id: 'a3', type: 'text', titre: "Article 3 — Prix d'acquisition propose",
        contenu:
          `Prix propose par l'acquereur : ${v(f.prix_propose)}\n` +
          `Prix affiche (FAI) : ${v(f.prix_affiche)}\n` +
          "Le prix ci-dessus s'entend net vendeur, hors frais de notaire a la charge de l'acquereur et hors " +
          "honoraires HUNTERS Immobilier definis au Mandat de Recherche. Les honoraires HUNTERS sont acquittes par " +
          "l'acquereur conformement au bareme en vigueur.",
      },
      {
        id: 'a4', type: 'text', titre: 'Article 4 — Conditions de financement',
        contenu:
          `Acquisition sous condition suspensive d'obtention de pret immobilier (art. L.313-40 et s. du Code de la consommation).\n` +
          `Montant du pret sollicite : ${v(f.montant_pret)}\n` +
          `Taux maximum accepte : ${v(f.taux_max)}\n` +
          `Duree maximale : ${v(f.duree_pret)}\n` +
          "En cas d'acquisition sans condition suspensive de pret, l'acquereur renonce explicitement a la protection " +
          "legale de l'article L.313-40 du Code de la consommation.",
      },
      {
        id: 'a5', type: 'text', titre: 'Article 5 — Conditions suspensives',
        contenu:
          "· Obtention du pret immobilier dans les conditions definies a l'article 4.\n" +
          "· Obtention de l'accord de la collectivite (droit de preemption urbain — DPU).\n" +
          "· Resultats satisfaisants des diagnostics techniques obligatoires (amiante, plomb, termites, etc.).\n" +
          "· Absence de servitude ou d'hypotheque redhibitoire revelee avant la signature du compromis.",
      },
      {
        id: 'a6', type: 'text', titre: 'Article 6 — Modalites et calendrier',
        contenu:
          "Reponse du vendeur : sous 72 h a compter de la reception de la presente offre.\n" +
          "Signature du compromis : sous 15 a 21 jours, chez le notaire de l'acquereur ou un notaire commun.\n" +
          "Delai SRU (retractation) : 10 jours a compter de la notification du compromis — obligatoire.\n" +
          "Obtention du pret : sous 45 jours a compter de la signature du compromis.\n" +
          "Signature de l'acte authentique : sous 3 a 4 mois.\n" +
          "Sequestre (depot de garantie) : 5 a 10 % du prix, verse a la signature du compromis.\n" +
          `Notaire de l'acquereur : ${v(f.notaire)}`,
      },
      {
        id: 'a7', type: 'text', titre: 'Article 7 — Honoraires HUNTERS Immobilier',
        contenu:
          "Les honoraires de HUNTERS Immobilier sont calcules sur le prix d'acquisition du bien, hors frais de notaire, selon le bareme en vigueur : jusqu'a 250 000 EUR, forfait de 6 500 EUR HT (7 800 EUR TTC) ; de 250 001 a 1 000 000 EUR, 3,5 % HT ; de 1 000 001 a 1 200 000 EUR, 2,75 % HT ; au-dela de 1 200 000 EUR, 2 % HT. TVA au taux de 20 % en sus.\n" +
          `Honoraires applicables a cette offre : ${v(f.honoraires_ttc)} TTC — ${v(f.honoraires_ht)} HT.\n` +
          "Les honoraires sont exigibles exclusivement a la signature de l'acte authentique de vente devant notaire. " +
          "Aucun honoraire n'est du en cas de non-realisation de la vente, quelle qu'en soit la cause.",
      },
      {
        id: 'a8', type: 'text', titre: "Article 8 — Declarations de l'acquereur",
        contenu:
          "· Avoir visite le bien ou en avoir pris connaissance via le rapport de visite HUNTERS Immobilier.\n" +
          "· Avoir pris connaissance des diagnostics techniques disponibles.\n" +
          "· Ne pas etre frappe d'une interdiction d'acquerir ou d'une incapacite juridique.\n" +
          "· Acquerir le bien pour son propre compte ou pour la structure indiquee a l'article 1.\n" +
          "· Disposer des fonds ou de la capacite de financement necessaire a la realisation de l'acquisition.",
      },
      {
        id: 'a9', type: 'text', titre: "Article 9 — Validite de l'offre",
        contenu:
          "La presente offre est valable 72 heures a compter de sa transmission au vendeur ou a son mandataire. " +
          "En l'absence de reponse ecrite dans ce delai, l'offre sera consideree comme caduque.\n" +
          "L'acceptation de l'offre par le vendeur ne vaut pas avant-contrat : elle ouvre une periode de negociation " +
          "en vue de la signature d'un compromis de vente devant notaire.\n" +
          "L'acquereur beneficie d'un delai de retractation de 10 jours a compter de la notification du compromis " +
          "(art. L.271-1 CCH). Ce delai est d'ordre public.",
      },
      { id: 'sign', type: 'signatures', titre: 'Signatures',
        contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── CONSEIL PATRIMONIAL ──────────────────────────────
  conseil_patrimonial: {
    titre: 'Contrat de Conseil en Investissement Immobilier',
    typeDocument: 'Mission Conseil strategique — M01',
    fields: [
      ...CLIENT_FIELDS, ...CABINET_FIELDS,
      { key: 'mediateur', label: 'Mediateur de la consommation', group: 'Cabinet' },
      { key: 'objectif', label: 'Objectif declare par le Client', type: 'textarea', group: 'Mission' },
      { key: 'score', label: 'Score de qualification', group: 'Mission' },
      { key: 'profil', label: 'Profil retenu', group: 'Mission' },
      { key: 'montant_ht', label: 'Honoraires HT', group: 'Honoraires' },
      { key: 'montant_ttc', label: 'Honoraires TTC', group: 'Honoraires' },
    ],
    sections: (f) => [
      { id: 'parties', type: 'text', titre: 'Entre les parties', contenu: partiesBlockSansCarteT(f, 'LE CLIENT', 'LE PRESTATAIRE') + '\n\nIl a ete convenu ce qui suit.' },
      { id: 'a1', type: 'text', titre: 'Article 1 — Objet', contenu: `Le Client confie a HUNTERS Immobilier une mission de conseil strategique en investissement immobilier. La mission consiste a analyser la situation du Client, a definir une strategie d'investissement immobilier adaptee a ses objectifs et a la lui remettre sous la forme d'un rapport ecrit. Objectif declare par le Client : ${v(f.objectif)}.` },
      { id: 'a2', type: 'text', titre: 'Article 2 — Profil du dossier et honoraires', contenu: `Le profil du dossier resulte de la grille de qualification HUNTERS : detient deja un bien ou plus (2 pts) ; SCI existante ou a creer, holding (2) ; statut fiscal LMP, LMNP, IS ou deficit foncier actif (2) ; expatrie ou non-resident fiscal francais (2) ; budget projet superieur a 500 000 EUR (2) ; dirigeant d'entreprise, marchand de biens ou profession liberale (1) ; projet d'acquisition de deux biens ou plus (1) ; montage de credit complexe (1). Score de 0 a 2 : Standard — 1 500 EUR HT ; de 3 a 5 : Complexe — 2 500 EUR HT ; 6 et plus : Expert — 3 500 EUR HT. Score obtenu : ${v(f.score)} — profil retenu : ${v(f.profil)}. Honoraires : ${v(f.montant_ht)} HT, soit ${v(f.montant_ttc)} TTC. Paiement : 50 % a la signature, 50 % a la remise du rapport, ${PAIEMENT_COMMUN}. Les honoraires de conseil ne font l'objet d'aucune remise, y compris dans le cadre d'un pack de missions.` },
      { id: 'a3', type: 'text', titre: 'Article 3 — Contenu de la mission', contenu: "1. Entretien de decouverte : situation familiale, professionnelle, patrimoniale et fiscale ; objectifs, horizon et tolerance au risque. 2. Analyse : capacite d'investissement, apport mobilisable, capacite d'emprunt estimee, effort d'epargne acceptable. 3. Strategie : type de bien, secteur geographique, mode d'exploitation (location nue, meublee, colocation, courte duree), orientations generales sur le mode de detention (nom propre, SCI), plan de financement previsionnel. 4. Simulations : rentabilite brute et nette, cash-flow, effort d'epargne, sur la base de la legislation en vigueur a la date du rapport. 5. Remise du rapport et entretien de restitution, puis reponses aux questions du Client pendant 30 jours." },
      { id: 'a4', type: 'text', titre: 'Article 4 — Delai', contenu: "Le rapport est remis dans un delai maximum de 15 jours a compter de la reception de l'acompte et de l'ensemble des pieces demandees : deux derniers avis d'imposition, trois derniers bulletins de salaire ou bilans, justificatifs d'epargne, tableaux d'amortissement des credits en cours." },
      { id: 'a5', type: 'text', titre: 'Article 5 — Limites de la mission', contenu: "HUNTERS Immobilier n'exerce pas l'activite de conseiller en investissements financiers (CMF, art. L541-1) : aucun conseil n'est donne sur des instruments financiers, parts de SCPI ou contrats d'assurance-vie. HUNTERS Immobilier n'est pas intermediaire en operations de banque (CMF, art. L519-1) : le plan de financement est indicatif et le Client peut etre oriente vers un courtier ou un etablissement bancaire. Les orientations juridiques et fiscales sont donnees a titre accessoire a la mission de conseil immobilier (loi n° 71-1130 du 31 decembre 1971, art. 54 et 60) ; tout montage (creation de societe, option fiscale, demembrement) est valide par un notaire, un avocat ou un expert-comptable avant mise en oeuvre. HUNTERS Immobilier n'etablit aucune declaration fiscale pour le compte du Client." },
      { id: 'a6', type: 'text', titre: 'Article 6 — Obligations de HUNTERS Immobilier', contenu: "HUNTERS Immobilier execute la mission avec diligence, agit dans le seul interet du Client, l'informe de tout conflit d'interets eventuel et respecte la confidentialite des informations recues." },
      { id: 'a7', type: 'text', titre: 'Article 7 — Obligations du Client', contenu: "Le Client fournit des informations exactes, completes et a jour, et signale sans delai tout changement de situation. Les recommandations reposent sur ces informations : HUNTERS Immobilier ne repond pas des consequences d'informations inexactes ou incompletes." },
      { id: 'a8', type: 'text', titre: 'Article 8 — Responsabilite', contenu: "HUNTERS Immobilier est tenu d'une obligation de moyens. Le Client prend seul ses decisions d'investissement. Aucun rendement, aucune plus-value et aucun accord de financement ne sont garantis ; les simulations sont indicatives et dependent de l'evolution du marche, des taux et de la legislation." },
      { id: 'a9', type: 'text', titre: 'Article 9 — Droit de retractation', contenu: RETRACTATION },
      { id: 'a10', type: 'text', titre: 'Article 10 — Resiliation', contenu: "Le Client peut mettre fin a la mission avant la remise du rapport par lettre recommandee avec accuse de reception ; les prestations deja realisees restent dues au prorata. HUNTERS Immobilier peut resilier en cas de non-paiement ou de non-transmission des pieces, apres mise en demeure restee sans effet pendant 8 jours." },
      { id: 'a11', type: 'text', titre: 'Article 11 — Confidentialite et donnees personnelles', contenu: CONFIDENTIALITE },
      { id: 'a12', type: 'text', titre: 'Article 12 — Mediation et droit applicable', contenu: MEDIATION(f) },
      { id: 'formulaire', type: 'text', titre: 'Annexe — Formulaire de retractation', contenu: FORMULAIRE(f, 'Contrat de Conseil en Investissement Immobilier') },
      { id: 'sign', type: 'signatures', titre: 'Signatures', contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── MISSION AMO ──────────────────────────────────────
  mission_amo: {
    titre: 'Contrat de Mission AMO',
    typeDocument: "Mission Assistance a maitrise d'ouvrage — M03",
    fields: [
      ...CLIENT_FIELDS, ...CABINET_FIELDS,
      { key: 'mediateur', label: 'Mediateur de la consommation', group: 'Cabinet' },
      { key: 'bien_adresse', label: 'Adresse du bien', group: 'Mission' },
      { key: 'nature_travaux', label: 'Nature des travaux', type: 'textarea', group: 'Mission' },
      { key: 'budget_travaux', label: 'Budget travaux HT', group: 'Mission' },
      { key: 'date_debut', label: 'Demarrage previsionnel', group: 'Mission' },
      { key: 'duree_chantier', label: 'Duree previsionnelle du chantier', group: 'Mission' },
      { key: 'frequence_visites', label: 'Frequence des visites', group: 'Mission' },
      { key: 'montant_ht', label: 'Honoraires HT', group: 'Honoraires' },
      { key: 'montant_ttc', label: 'Honoraires TTC', group: 'Honoraires' },
    ],
    sections: (f) => [
      { id: 'parties', type: 'text', titre: 'Entre les parties', contenu: partiesBlockSansCarteT(f, "LE MAITRE D'OUVRAGE (le Client)", "L'ASSISTANT A MAITRISE D'OUVRAGE (HUNTERS Immobilier)") + '\n\nIl a ete convenu ce qui suit.' },
      { id: 'a1', type: 'text', titre: 'Article 1 — Objet', contenu: `Le Client confie a HUNTERS Immobilier une mission d'assistance a maitrise d'ouvrage pour la preparation, la consultation des entreprises, le suivi et la reception des travaux realises sur le bien suivant. Adresse : ${v(f.bien_adresse)}. Nature des travaux : ${v(f.nature_travaux)}. Budget previsionnel des travaux : ${v(f.budget_travaux)} HT. Demarrage previsionnel : ${v(f.date_debut)} — Duree previsionnelle du chantier : ${v(f.duree_chantier)}.` },
      { id: 'a2', type: 'text', titre: 'Article 2 — Nature de la mission', contenu: "Le Client est et reste maitre d'ouvrage : il choisit les entreprises, signe directement les devis et marches et paie directement les entreprises. HUNTERS Immobilier l'assiste et le conseille ; il ne recoit aucune delegation de maitrise d'ouvrage. HUNTERS Immobilier n'est ni maitre d'oeuvre, ni architecte, ni entrepreneur, ni contractant general. Il n'assure ni la conception, ni la direction de l'execution des travaux, ni la coordination securite et protection de la sante, et n'execute aucun travail. Lorsque le projet exige un maitre d'oeuvre ou un architecte, notamment au-dela de 150 m² de surface de plancher soumis a permis de construire (C. urb., art. R431-2), le Client le missionne directement." },
      { id: 'a3', type: 'text', titre: 'Article 3 — Contenu de la mission', contenu: `1. Programme et budget : visite technique, definition des besoins, enveloppe previsionnelle, reperage des autorisations d'urbanisme et des diagnostics necessaires. 2. Consultation des entreprises : recherche d'entreprises, au moins deux devis comparables par lot principal, controle des attestations d'assurance decennale et de responsabilite civile et de l'immatriculation, tableau comparatif et recommandation ecrite. 3. Suivi du chantier : planning, visite de chantier ${v(f.frequence_visites)}, compte rendu ecrit apres chaque visite, controle de l'avancement par rapport aux devis, avis sur chaque situation de travaux avant paiement, alerte sur toute derive de cout ou de delai ; tout travail supplementaire fait l'objet d'un devis signe par le Client. 4. Reception : preparation et assistance aux operations de reception (C. civ., art. 1792-6), redaction des reserves au proces-verbal, suivi de leur levee, conseil sur la retenue de garantie de 5 % (loi n° 71-584 du 16 juillet 1971). 5. Dossier de fin de chantier : devis, factures, attestations d'assurance, proces-verbal de reception et notices remis au Client, avec rappel des garanties de parfait achevement (1 an), biennale (2 ans) et decennale (10 ans).` },
      { id: 'a4', type: 'text', titre: 'Article 4 — Honoraires', contenu: `Les honoraires sont calcules sur le montant HT des travaux selon le bareme HUNTERS en vigueur : jusqu'a 150 000 EUR, 1 000 EUR + 9 % HT ; de 150 001 a 250 000 EUR, 1 500 EUR + 7,5 % HT ; au-dela, 2 000 EUR + 6 % HT. Honoraires previsionnels sur le budget de ${v(f.budget_travaux)} HT : ${v(f.montant_ht)} HT, soit ${v(f.montant_ttc)} TTC. Ils sont regularises sur le montant HT definitif des devis acceptes et des avenants ou, s'il est different, sur le montant HT de la facturation definitive des entreprises. Paiement : 30 % a la signature, 40 % a mi-chantier, 30 % a la reception, ${PAIEMENT_COMMUN}.` },
      { id: 'a5', type: 'text', titre: 'Article 5 — Fonds et independance', contenu: "HUNTERS Immobilier ne recoit ni ne detient aucun fonds destine aux entreprises. Il ne percoit aucune commission, remuneration ou avantage de leur part. S'il propose une entreprise liee au groupe HUNTERS, il en informe le Client par ecrit avant toute consultation, et le choix final revient au Client." },
      { id: 'a6', type: 'text', titre: 'Article 6 — Assurances', contenu: "Le Client est informe de son obligation de souscrire une assurance dommages-ouvrage avant l'ouverture du chantier lorsque les travaux relevent de la garantie decennale (C. assur., art. L242-1). HUNTERS Immobilier verifie que chaque entreprise retenue justifie d'une assurance decennale en cours de validite (art. L241-1) et justifie lui-meme d'une assurance de responsabilite civile professionnelle couvrant l'activite d'assistance a maitrise d'ouvrage." },
      { id: 'a7', type: 'text', titre: 'Article 7 — Obligations du Client', contenu: "Le Client donne acces au bien, se prononce sur les choix qui lui sont soumis dans un delai de 5 jours ouvres, obtient les autorisations d'urbanisme necessaires, paie les entreprises a bonne date et ne donne aucune instruction directe aux entreprises contraire aux recommandations sans en informer HUNTERS Immobilier." },
      { id: 'a8', type: 'text', titre: 'Article 8 — Responsabilite', contenu: "HUNTERS Immobilier est tenu d'une obligation de moyens. Il repond de ses propres fautes dans l'execution de sa mission. Il ne repond ni des defauts d'execution, retards ou defaillances des entreprises, qui en restent seules responsables envers le Client, ni des decisions prises par le Client contre ses recommandations ecrites." },
      { id: 'a9', type: 'text', titre: 'Article 9 — Duree', contenu: "La mission court de la signature jusqu'a la levee des reserves, et au plus tard 3 mois apres la reception. Si la duree du chantier depasse de plus de 50 % la duree previsionnelle pour une cause non imputable a HUNTERS Immobilier, la poursuite de la mission fait l'objet d'un avenant." },
      { id: 'a10', type: 'text', titre: 'Article 10 — Resiliation', contenu: "Le Client peut resilier a tout moment par lettre recommandee avec accuse de reception ; les honoraires des phases realisees restent dus, la phase en cours au prorata. HUNTERS Immobilier peut resilier en cas de manquement grave du Client, apres mise en demeure restee sans effet pendant 8 jours." },
      { id: 'a11', type: 'text', titre: 'Article 11 — Droit de retractation', contenu: RETRACTATION },
      { id: 'a12', type: 'text', titre: 'Article 12 — Confidentialite et donnees personnelles', contenu: CONFIDENTIALITE },
      { id: 'a13', type: 'text', titre: 'Article 13 — Mediation et droit applicable', contenu: MEDIATION(f) },
      { id: 'formulaire', type: 'text', titre: 'Annexe — Formulaire de retractation', contenu: FORMULAIRE(f, 'Contrat de Mission AMO') },
      { id: 'sign', type: 'signatures', titre: 'Signatures', contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── MISSION DECORATION ───────────────────────────────
  mission_deco: {
    titre: 'Contrat de Mission Decoration et Ameublement',
    typeDocument: 'Mission Decoration et ameublement — M04',
    fields: [
      ...CLIENT_FIELDS, ...CABINET_FIELDS,
      { key: 'mediateur', label: 'Mediateur de la consommation', group: 'Cabinet' },
      { key: 'bien_adresse', label: 'Adresse du bien', group: 'Mission' },
      { key: 'pieces', label: 'Pieces concernees', group: 'Mission' },
      { key: 'usage', label: 'Usage du bien', group: 'Mission' },
      { key: 'budget_deco', label: 'Budget decoration et ameublement HT', group: 'Mission' },
      { key: 'style', label: 'Style et orientations', type: 'textarea', group: 'Mission' },
      { key: 'montant_ht', label: 'Honoraires HT', group: 'Honoraires' },
      { key: 'montant_ttc', label: 'Honoraires TTC', group: 'Honoraires' },
    ],
    sections: (f) => [
      { id: 'parties', type: 'text', titre: 'Entre les parties', contenu: partiesBlockSansCarteT(f, 'LE CLIENT', 'LE PRESTATAIRE') + '\n\nIl a ete convenu ce qui suit.' },
      { id: 'a1', type: 'text', titre: 'Article 1 — Objet', contenu: `Le Client confie a HUNTERS Immobilier la conception et la mise en oeuvre d'un projet de decoration et d'ameublement pour le bien suivant. Adresse : ${v(f.bien_adresse)}. Pieces concernees : ${v(f.pieces)}. Usage du bien : ${v(f.usage)}. Budget decoration et ameublement : ${v(f.budget_deco)} HT. Style et orientations : ${v(f.style)}.` },
      { id: 'a2', type: 'text', titre: 'Article 2 — Contenu de la mission', contenu: "1. Brief : visite, prise de mesures, recueil des gouts, contraintes et usages. 2. Conception : planche d'ambiance, plan d'amenagement, palette de couleurs et de matieres, liste d'achats chiffree (mobilier, luminaires, textiles, decoration) ; deux series de modifications sont incluses, au-dela sur devis. 3. Achats et logistique : apres validation ecrite de la liste d'achats, les commandes sont passees au nom du Client, qui paie directement les fournisseurs ; HUNTERS Immobilier suit les commandes et les livraisons. 4. Installation et mise en scene : reception des livraisons, coordination du montage, mise en place et stylisme final, photographies de fin de mission remises au Client. Pour une location meublee, la liste d'achats couvre au minimum les elements exiges par le decret n° 2015-981 du 31 juillet 2015." },
      { id: 'a3', type: 'text', titre: 'Article 3 — Exclusions', contenu: "Les travaux (peinture, electricite, plomberie, menuiserie, sols) ne sont pas compris : ils relevent d'une mission AMO ou d'entreprises choisies par le Client. Les frais de livraison, de montage et d'enlevement factures par les fournisseurs restent a la charge du Client." },
      { id: 'a4', type: 'text', titre: 'Article 4 — Honoraires', contenu: `Les honoraires se composent d'une part fixe et d'une part variable calculee sur la totalite du montant HT des achats de mobilier, de decoration et de fournitures, hors travaux : jusqu'a 20 000 EUR, 1 500 EUR HT + 10 % ; de 20 001 a 50 000 EUR, 2 000 EUR HT + 8 % ; au-dela de 50 000 EUR, 3 000 EUR HT + 6 %. Honoraires previsionnels sur le budget de ${v(f.budget_deco)} HT : ${v(f.montant_ht)} HT, soit ${v(f.montant_ttc)} TTC. Ils sont regularises sur le montant HT des achats reellement factures. Paiement : 50 % a la signature, solde a l'installation, ${PAIEMENT_COMMUN}.` },
      { id: 'a5', type: 'text', titre: 'Article 5 — Transparence des achats', contenu: "Les fournisseurs facturent directement le Client, sans majoration de prix. Les remises professionnelles obtenues par HUNTERS Immobilier beneficient integralement au Client. HUNTERS Immobilier ne percoit aucune commission des fournisseurs et n'avance ni ne detient aucun fonds pour le compte du Client." },
      { id: 'a6', type: 'text', titre: 'Article 6 — Delais', contenu: "Le calendrier remis apres validation de la conception est indicatif. Les delais de fabrication et de livraison dependent des fournisseurs ; HUNTERS Immobilier informe le Client de tout retard et propose, si possible, une alternative." },
      { id: 'a7', type: 'text', titre: 'Article 7 — Garanties des produits', contenu: "Les garanties legales de conformite (C. conso., art. L217-3 et suivants) et des vices caches (C. civ., art. 1641 et suivants) s'exercent contre les fournisseurs. HUNTERS Immobilier assiste le Client dans ses reclamations." },
      { id: 'a8', type: 'text', titre: 'Article 8 — Propriete intellectuelle', contenu: "Les planches, plans et selections realises restent la creation de HUNTERS Immobilier (CPI, art. L111-1). Le Client dispose d'un droit d'usage pour le seul bien concerne, sans reproduction a des fins commerciales." },
      { id: 'a9', type: 'text', titre: 'Article 9 — Photographies et communication', contenu: "Le Client autorise HUNTERS Immobilier a utiliser les photographies du bien amenage pour sa communication (site internet, reseaux sociaux, supports commerciaux), sans mention de son nom ni de l'adresse du bien : [ ] J'accepte   [ ] Je refuse. Cette autorisation peut etre retiree a tout moment pour l'avenir, par ecrit." },
      { id: 'a10', type: 'text', titre: 'Article 10 — Responsabilite', contenu: "HUNTERS Immobilier est tenu d'une obligation de moyens et repond de ses propres fautes. Il ne repond pas des defauts, retards ou defaillances des fournisseurs et transporteurs, ni des consequences d'un choix maintenu par le Client contre ses recommandations ecrites." },
      { id: 'a11', type: 'text', titre: 'Article 11 — Resiliation', contenu: "Le Client peut resilier par lettre recommandee avec accuse de reception : le forfait de conception est du si la conception a ete remise, et la part variable au prorata des achats deja engages. HUNTERS Immobilier peut resilier en cas de manquement grave du Client, apres mise en demeure restee sans effet pendant 8 jours." },
      { id: 'a12', type: 'text', titre: 'Article 12 — Droit de retractation', contenu: RETRACTATION },
      { id: 'a13', type: 'text', titre: 'Article 13 — Confidentialite et donnees personnelles', contenu: CONFIDENTIALITE },
      { id: 'a14', type: 'text', titre: 'Article 14 — Mediation et droit applicable', contenu: MEDIATION(f) },
      { id: 'formulaire', type: 'text', titre: 'Annexe — Formulaire de retractation', contenu: FORMULAIRE(f, 'Contrat de Mission Decoration et Ameublement') },
      { id: 'sign', type: 'signatures', titre: 'Signatures', contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },

  // ───────────────────────── CONTRAT DE MANDATAIRE ───────────────────────────
  contrat_mandataire: {
    titre: 'Contrat de Mandataire',
    typeDocument: 'Collaboration mandataire HUNTERS',
    fields: [
      { key: 'nom_client', label: 'Nom et prénom du mandataire', group: 'Mandataire' },
      { key: 'adresse_client', label: 'Adresse', group: 'Mandataire' },
      { key: 'cp_ville_client', label: 'Code postal et ville', group: 'Mandataire' },
      { key: 'telephone_client', label: 'Téléphone', group: 'Mandataire' },
      { key: 'email_client', label: 'Email', group: 'Mandataire' },
      { key: 'date_naissance', label: 'Date de naissance', group: 'Mandataire' },
      ...CABINET_FIELDS,
      { key: 'secteurs', label: 'Zone prioritaire attribuée', group: 'Collaboration' },
      { key: 'pack', label: 'Pack mensuel', group: 'Collaboration' },
    ],
    sections: (f) => [
      {
        id: 'parties', type: 'text', titre: 'Entre les parties',
        contenu: partiesBlock(f, 'LE MANDATAIRE INDEPENDANT', 'LE MANDANT (HUNTERS Immobilier)'),
      },
      {
        id: 'a1', type: 'text', titre: 'Article 1 — Objet',
        contenu:
          "HUNTERS Immobilier confie au Mandataire independant, qui accepte, une mission de prospection, de conseil " +
          "et d'accompagnement de clients investisseurs sous l'enseigne HUNTERS, dans le respect de la Loi Hoguet et " +
          "sous couvert de la Carte Professionnelle T detenue par le cabinet.",
      },
      {
        id: 'a2', type: 'text', titre: 'Article 2 — Zone et niveau',
        contenu:
          `Zone prioritaire attribuee : ${v(f.secteurs)}\n` +
          "Niveau de commissionnement : N1 sur tous les services, passage en N2 par service selon les seuils annuels du cabinet\n" +
          `Pack mensuel : ${v(f.pack)}`,
      },
      {
        id: 'a3', type: 'text', titre: 'Article 3 — Obligations et conformite',
        contenu:
          "Le Mandataire s'engage a respecter les procedures HUNTERS, a suivre 14 heures de formation annuelle " +
          "(Loi ALUR), a maintenir une attestation de collaborateur valide et une immatriculation RSAC a jour.",
      },
      { id: 'mention', type: 'text', titre: 'Mention legale', contenu: MENTION_HOGUET },
      { id: 'sign', type: 'signatures', titre: 'Signatures',
        contenu: `Fait a Tours, le ${v(f.date_document)} — en deux exemplaires originaux` },
    ],
  },
};

// ─── Pré-remplissage depuis les données du dossier ───────────────────────────
export interface PrefillSources {
  dossier?: Record<string, any> | null;
  company?: Partial<CompanySettings> | null;
  conseiller?: string | null;
  zones?: string[];
  baremes?: BaremeHunters[];
  bien?: Record<string, any> | null;
  chantier?: Record<string, any> | null;
  signataireNom?: string | null;
  signataireEmail?: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  conseil: 'M01 Conseil strategique',
  chasse: 'M02 Chasse immobiliere',
  amo: 'M03 Assistance a maitrise d\'ouvrage',
  deco: 'M04 Decoration et ameublement',
};

export function prefillSignatureDoc(
  type: SignatureDocType,
  src: PrefillSources,
): Record<string, string> {
  const d = src.dossier || {};
  const c = src.company || {};
  const today = new Date();
  const budget = Number(d.budget) || 0;
  const tvaRate = tvaRateFromSettings(c);
  const { ht, ttc } = honorairesChasse(src.baremes || [], budget, tvaRate);
  const services = (d.services_souscrits as Record<string, boolean>) || {};
  const missions = Object.keys(services)
    .filter((k) => services[k])
    .map((k) => SERVICE_LABELS[k] || k)
    .join(', ');
  const zone = (src.zones || []).join(', ');
  const ref = d.numero_dossier || '';

  const base: Record<string, string> = {
    nom_client: src.signataireNom || d.client_name || '',
    date_naissance: d.date_naissance
      ? new Date(d.date_naissance).toLocaleDateString('fr-FR')
      : '',
    // `residence_principale` est un statut (proprietaire/locataire), pas une adresse postale :
    // l'adresse reste a completer manuellement dans l'apercu.
    adresse_client: '',
    cp_ville_client: d.ville || '',

    telephone_client: d.phone || '',
    email_client: src.signataireEmail || d.email || '',
    situation_pro: [d.statut_professionnel, d.profession].filter(Boolean).join(' — '),

    conseiller: src.conseiller || '',
    ref_dossier: ref,
    forme_juridique: c.forme_juridique || '',
    siret: c.siret || '',
    adresse_siege: c.adresse_siege || '45 rue Michel Colombe, 37000 Tours',
    carte_t: c.carte_t_numero || '',
    assurance_rcp: [c.assureur_rcp, c.assureur_police].filter(Boolean).join(' — '),
    date_document: fmtDate(today),
  };

  if (type === 'mandat_recherche') {
    return {
      ...base,
      secteurs: zone || d.contraintes_geographiques || d.ville || '',
      duree_mois: '3',
      date_echeance: fmtDate(addMonths(today, 3)),
      budget_max: budget ? fmtEur(budget) : '',
      apport: d.apport_disponible ? fmtEur(d.apport_disponible) : '',
      capacite_emprunt: d.capacite_emprunt_estimee ? fmtEur(d.capacite_emprunt_estimee) : '',
      type_bien: d.type_bien_souhaite || '',
      type_location: d.type_location_souhaite || '',
      criteres: d.contraintes_particulieres || d.objectif_principal || '',
      honoraires_ht: ht ? fmtEur(ht) : '',
      honoraires_ttc: ttc ? fmtEur(ttc) : '',
    };
  }

  if (type === 'convention_cadre') {
    return {
      ...base,
      ref_convention: ref ? `CC-${ref}` : '',
      missions: missions || 'M01 Conseil strategique',
      tarif_conseil: d.tarif_conseil_ht ? `${fmtEur(d.tarif_conseil_ht)} HT` : '',
    };
  }

  if (type === 'bon_commande') {
    const mHt = Number(d.tarif_conseil_ht) || 0;
    return {
      ...base,
      num_bc: ref ? `BC-M01-${ref}` : '',
      ref_convention: ref ? `CC-${ref}` : '',
      mission: missions || 'M01 — Conseil strategique en investissement locatif',
      perimetre: d.contraintes_geographiques || d.ville || '',
      secteur: zone,
      objectif: d.objectif_principal || '',
      delai: d.delai_concretisation || '',
      livrables: 'Rapport de conseil strategique, plan de financement, strategie fiscale',
      montant_ht: mHt ? fmtEur(mHt) : '',
      montant_tva: mHt ? fmtEur(mHt * tvaRate / 100) : '',
      montant_ttc: mHt ? fmtEur(mHt * (1 + tvaRate / 100)) : '',
      echeancier: '50 % a la signature / 50 % a la remise du livrable',
      conditions: '',
    };
  }

  if (type === 'offre_achat') {
    return {
      ...base,
      num_offre: ref ? `OA-${ref}` : '',
      ref_mandat: ref ? `MR-${ref}` : '',
      vendeur: '',
      vendeur_coord: '',
      bien_adresse: '',
      bien_type: d.type_bien_souhaite || '',
      bien_surface: '',
      bien_lot: '',
      prix_propose: budget ? fmtEur(budget) : '',
      prix_affiche: '',
      montant_pret: d.capacite_emprunt_estimee ? fmtEur(d.capacite_emprunt_estimee) : '',
      taux_max: '',
      duree_pret: d.duree_credit_souhaitee ? `${d.duree_credit_souhaitee} ans` : '',
      notaire: '',
      honoraires_ht: ht ? fmtEur(ht) : '',
      honoraires_ttc: ttc ? fmtEur(ttc) : '',
    };
  }

  const mediateur = c.mediateur || '';
  const bien = src.bien || {};
  const chantier = src.chantier || {};
  const adresseBien = [bien.adresse, [bien.code_postal, bien.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const honor = (service: BaremeService, b: number) => {
    if (!b) return { montant_ht: '', montant_ttc: '' };
    const m = computeMontantBareme(pickTranche(src.baremes || [], service, b), b);
    return m ? { montant_ht: fmtEur(m), montant_ttc: fmtEur(m * (1 + tvaRate / 100)) } : { montant_ht: '', montant_ttc: '' };
  };

  if (type === 'conseil_patrimonial') {
    const q = computeQualification({ ...emptyQualification(), ...((d.criteres_qualification as Partial<QualificationValues>) || {}) } as QualificationValues);
    const mHt = Number(d.tarif_conseil_ht) || 0;
    return {
      ...base, mediateur,
      objectif: d.objectif_principal || '',
      score: d.criteres_qualification ? String(q.score) : '',
      profil: d.criteres_qualification ? q.niveau : '',
      montant_ht: mHt ? fmtEur(mHt) : '',
      montant_ttc: mHt ? fmtEur(mHt * (1 + tvaRate / 100)) : '',
    };
  }

  if (type === 'mission_amo') {
    const bt = Number(chantier.budget_alloue) || Number(bien.budget_travaux) || 0;
    let duree = '';
    if (chantier.date_debut_prevue && chantier.date_fin_prevue) {
      const a = new Date(chantier.date_debut_prevue), b = new Date(chantier.date_fin_prevue);
      const mois = Math.max(1, Math.round((b.getTime() - a.getTime()) / (30.44 * 86400000)));
      duree = `${mois} mois`;
    }
    return {
      ...base, mediateur,
      bien_adresse: adresseBien,
      nature_travaux: '',
      budget_travaux: bt ? fmtEur(bt) : '',
      date_debut: chantier.date_debut_prevue ? new Date(chantier.date_debut_prevue).toLocaleDateString('fr-FR') : '',
      duree_chantier: duree,
      frequence_visites: 'hebdomadaire',
      ...honor('amo', bt),
    };
  }

  if (type === 'mission_deco') {
    return {
      ...base, mediateur,
      bien_adresse: adresseBien,
      pieces: '', usage: '', budget_deco: '', style: '',
      montant_ht: '', montant_ttc: '',
    };
  }

  return {
    ...base,
    secteurs: zone,
    niveau: d.niveau || '',
    pack: '',
  };
}

/** Construit le PDF du document contractuel à partir des champs (éventuellement corrigés). */
export async function buildSignatureDocumentPdf(
  type: SignatureDocType,
  fields: Record<string, string>,
  opts: { company?: Partial<CompanySettings> | null } = {},
): Promise<jsPDF> {
  const spec = SIGNATURE_DOC_SPECS[type];
  return buildDocumentPdf({
    titre: spec.titre,
    sections: spec.sections(fields),
    variables: { ...fields },
    financierValues: {},
    textOverrides: {},
    numeroDossier: fields.ref_dossier || null,
    conseiller: fields.conseiller || null,
    client: fields.nom_client || null,
    company: opts.company ?? null,
    avecCouverture: true,
    typeDocument: spec.typeDocument,

  });
}

export function signatureDocFileName(type: SignatureDocType, fields: Record<string, string>) {
  const spec = SIGNATURE_DOC_SPECS[type];
  const slug = spec.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const ref = fields.ref_dossier ? `-${fields.ref_dossier}` : '';
  return `${slug}${ref}.pdf`;
}
