// Génération automatique des documents contractuels envoyés en signature.
// Le fond juridique reprend les documents Word HUNTERS livrés
// (Mandat de Recherche Exclusif, Convention de Mission Cadre,
//  Bon de Commande de Mission, Offre d'Achat) — seule la mise en forme change.

import type jsPDF from 'jspdf';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import type { CompanySettings } from '@/hooks/use-company-settings';
import type { BaremeHunters, BaremeService } from '@/hooks/use-baremes-hunters';
import { buildDocumentPdf } from '@/lib/document-pdf';

export type SignatureDocType =
  | 'mandat_recherche'
  | 'convention_cadre'
  | 'bon_commande'
  | 'offre_achat'
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

// ─── Barème chasse (identique à DevisGenerator) ──────────────────────────────
export function pickTranche(rows: BaremeHunters[], service: BaremeService, base: number) {
  return rows.find(
    (r) =>
      r.service === service &&
      base >= Number(r.tranche_min) &&
      (r.tranche_max === null || base <= Number(r.tranche_max)),
  );
}

export function computeMontantBareme(t: BaremeHunters | undefined, base: number): number {
  if (!t) return 0;
  const fixe = Number(t.valeur_fixe) || 0;
  if (t.type === 'forfait') return Number(t.valeur) || fixe || 0;
  return fixe + (base * (Number(t.valeur) || 0)) / 100;
}

/** Honoraires de chasse HT/TTC recalculés depuis les barèmes et le prix du bien. */
export function honorairesChasse(baremes: BaremeHunters[], prix: number) {
  const ht = computeMontantBareme(pickTranche(baremes, 'chasse', prix), prix);
  return { ht, ttc: ht * 1.2 };
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
          "Les honoraires de HUNTERS Immobilier au titre du present mandat sont calcules selon le bareme progressif " +
          "officiel : forfait 7 800 EUR TTC jusqu'a 200 000 EUR ; 4 % TTC de 200 001 a 500 000 EUR ; 3 % TTC de " +
          "500 001 a 1 000 000 EUR ; 2 % TTC au-dela. TVA au taux de 20 % incluse.\n" +
          `Estimation pour le budget retenu (${v(f.budget_max)}) : ${v(f.honoraires_ht)} HT — ${v(f.honoraires_ttc)} TTC.\n` +
          "SUCCES ONLY — Les honoraires ne sont dus qu'en cas d'acquisition effective d'un bien immobilier.\n" +
          "EXIGIBILITE — Les honoraires sont exigibles le jour de la signature de l'acte authentique chez le notaire.\n" +
          "BASE DE CALCUL — Le prix retenu est le prix acte chez le notaire, hors frais de notaire et frais d'agence.\n" +
          "CLAUSE DE LISSAGE — Aux seuils de 200 000 EUR et 500 000 EUR, les honoraires sont plafonnes selon les " +
          "zones tampon du bareme.\n" +
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
          "M01 — Conseil strategique en investissement locatif : 1 500 a 3 500 EUR HT selon scoring (BC-M01).\n" +
          "M02 — Chasse immobiliere : bareme progressif TTC (BC-M02).\n" +
          "M03 — Conseil et suivi de chantier : sur devis, a partir de 1 800 EUR HT (BC-M03).\n" +
          "M04 — Decoration et ameublement : sur devis, a partir de 490 EUR HT (BC-M04).\n" +
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
      { key: 'montant_tva', label: 'TVA 20 %', group: 'Honoraires' },
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
          "Rappel des missions du catalogue : M01 Conseil strategique (1 500 / 2 500 / 3 500 EUR HT selon scoring) · " +
          "M02 Chasse immobiliere (bareme progressif) · M03 Conseil et suivi de chantier (sur devis) · " +
          "M04 Decoration et ameublement (sur devis).",
      },
      {
        id: 'honoraires', type: 'text', titre: 'Honoraires et conditions de paiement',
        contenu:
          `Montant HT : ${v(f.montant_ht)}\n` +
          `TVA 20 % : ${v(f.montant_tva)}\n` +
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
          "Bareme officiel : prix <= 200 000 EUR forfait 7 800 EUR TTC · 200 001 a 500 000 EUR : 4 % TTC · " +
          "500 001 a 1 000 000 EUR : 3 % TTC · au-dela de 1 000 000 EUR : 2 % TTC.\n" +
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
      { key: 'niveau', label: 'Niveau (N1 / N2)', group: 'Collaboration' },
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
          `Niveau de commissionnement : ${v(f.niveau)}\n` +
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
  signataireNom?: string | null;
  signataireEmail?: string | null;
}

const SERVICE_LABELS: Record<string, string> = {
  conseil: 'M01 Conseil strategique',
  chasse: 'M02 Chasse immobiliere',
  amo: 'M03 Conseil et suivi de chantier',
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
  const { ht, ttc } = honorairesChasse(src.baremes || [], budget);
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
      montant_tva: mHt ? fmtEur(mHt * 0.2) : '',
      montant_ttc: mHt ? fmtEur(mHt * 1.2) : '',
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
  });
}

export function signatureDocFileName(type: SignatureDocType, fields: Record<string, string>) {
  const spec = SIGNATURE_DOC_SPECS[type];
  const slug = spec.titre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const ref = fields.ref_dossier ? `-${fields.ref_dossier}` : '';
  return `${slug}${ref}.pdf`;
}
