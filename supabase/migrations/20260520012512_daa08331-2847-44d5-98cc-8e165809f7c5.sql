
-- Table des modèles de documents
CREATE TABLE IF NOT EXISTS public.modeles_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  categorie text NOT NULL,
  contenu_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modeles_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read active modeles"
  ON public.modeles_documents FOR SELECT
  TO authenticated
  USING (actif = true OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can manage modeles_documents"
  ON public.modeles_documents FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_modeles_documents_updated_at
  BEFORE UPDATE ON public.modeles_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrichissement de documents_generiques pour le suivi d'envoi et stockage du contenu
ALTER TABLE public.documents_generiques
  ADD COLUMN IF NOT EXISTS titre text,
  ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'genere',
  ADD COLUMN IF NOT EXISTS email_destinataire text,
  ADD COLUMN IF NOT EXISTS date_envoi timestamptz,
  ADD COLUMN IF NOT EXISTS contenu jsonb,
  ADD COLUMN IF NOT EXISTS modele_id uuid REFERENCES public.modeles_documents(id) ON DELETE SET NULL;

-- Seed modèle A : Proposition Commerciale
INSERT INTO public.modeles_documents (titre, categorie, contenu_template)
SELECT 'Proposition commerciale', 'proposition_commerciale', '{
  "sections": [
    { "id": "entete", "type": "header", "titre": "En-tête", "auto": true },
    { "id": "contexte", "type": "text", "titre": "Contexte et objectifs",
      "contenu": "Suite à nos échanges, nous avons le plaisir de vous présenter notre proposition d''accompagnement pour la concrétisation de votre projet d''investissement immobilier à {{ville}}.\n\nObjectif principal : décrire ici les objectifs patrimoniaux du client." },
    { "id": "services", "type": "services_conditionnels", "titre": "Services proposés" },
    { "id": "planning", "type": "text", "titre": "Planning prévisionnel",
      "contenu": "Phase 1 — Analyse patrimoniale et stratégie (semaines 1 à 2)\nPhase 2 — Chasse immobilière et visites (semaines 2 à 8)\nPhase 3 — Négociation et compromis (semaines 8 à 10)\nPhase 4 — Suivi acte authentique et travaux (mois 3 à 6)" },
    { "id": "tarification", "type": "financier", "titre": "Tarification",
      "champs": [
        { "key": "honoraires_ht", "label": "Honoraires HT", "type": "number", "auto_from": "honoraires" },
        { "key": "remise_pct", "label": "Remise (%)", "type": "number", "defaut": 0 },
        { "key": "tva_taux", "label": "TVA (%)", "type": "number", "defaut": 20 },
        { "key": "honoraires_net_ht", "label": "Honoraires nets HT", "type": "calc", "formule": "honoraires_ht * (1 - remise_pct/100)" },
        { "key": "tva_montant", "label": "TVA", "type": "calc", "formule": "honoraires_net_ht * tva_taux/100" },
        { "key": "total_ttc", "label": "Total TTC", "type": "calc", "formule": "honoraires_net_ht + tva_montant" }
      ] },
    { "id": "conditions", "type": "text", "titre": "Conditions générales",
      "contenu": "La présente proposition est valable 30 jours à compter de sa date d''émission. Les honoraires sont dus selon l''échéancier convenu entre les parties. Le client dispose d''un droit de rétractation de 14 jours à compter de la signature." },
    { "id": "signatures", "type": "signatures", "titre": "Signatures" }
  ]
}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.modeles_documents WHERE categorie = 'proposition_commerciale'
);

-- Seed modèle B : Fiche synthétique de rentabilité
INSERT INTO public.modeles_documents (titre, categorie, contenu_template)
SELECT 'Fiche synthétique de rentabilité', 'fiche_rentabilite', '{
  "sections": [
    { "id": "entete", "type": "header", "titre": "En-tête", "auto": true },
    { "id": "profil", "type": "text", "titre": "Profil et objectifs",
      "contenu": "Profil de l''investisseur : à compléter\nHorizon d''investissement : à compléter\nObjectifs patrimoniaux : à compléter" },
    { "id": "bien", "type": "text", "titre": "Informations sur le bien",
      "contenu": "Type de bien : à compléter\nLocalisation : {{ville}}\nSurface : à compléter\nÉtat : à compléter" },
    { "id": "budget", "type": "financier", "titre": "Budget global",
      "champs": [
        { "key": "prix_achat", "label": "Prix d''achat", "type": "number", "auto_from": "budget" },
        { "key": "frais_notaire", "label": "Frais de notaire (8%)", "type": "calc", "formule": "prix_achat * 0.08" },
        { "key": "travaux", "label": "Travaux estimés", "type": "number", "defaut": 0 },
        { "key": "commission_hunters", "label": "Commission Hunters", "type": "number", "auto_from": "honoraires" },
        { "key": "budget_global", "label": "Budget global", "type": "calc", "formule": "prix_achat + frais_notaire + travaux + commission_hunters" }
      ] },
    { "id": "financier", "type": "financier", "titre": "Données financières",
      "champs": [
        { "key": "loyer_mensuel", "label": "Loyer mensuel", "type": "number", "defaut": 0 },
        { "key": "vacance_pct", "label": "Vacance locative (%)", "type": "number", "defaut": 7 },
        { "key": "charges_annuelles", "label": "Charges annuelles", "type": "number", "defaut": 0 },
        { "key": "revenu_brut_annuel", "label": "Revenu brut annuel", "type": "calc", "formule": "loyer_mensuel * 12 * (1 - vacance_pct/100)" },
        { "key": "revenu_net_annuel", "label": "Revenu net annuel", "type": "calc", "formule": "revenu_brut_annuel - charges_annuelles" }
      ] },
    { "id": "rentabilite", "type": "financier", "titre": "Calcul de rentabilité",
      "champs": [
        { "key": "rentabilite_brute", "label": "Rentabilité brute (%)", "type": "calc", "formule": "(loyer_mensuel * 12) / budget_global * 100" },
        { "key": "rentabilite_nette", "label": "Rentabilité nette (%)", "type": "calc", "formule": "revenu_net_annuel / budget_global * 100" },
        { "key": "mensualite_credit", "label": "Mensualité crédit estimée", "type": "number", "defaut": 0 },
        { "key": "cashflow_net", "label": "Cash-flow mensuel", "type": "calc", "formule": "(revenu_net_annuel / 12) - mensualite_credit" }
      ] },
    { "id": "analyse", "type": "text", "titre": "Analyse complémentaire",
      "contenu": "Points forts : à compléter\nPoints d''attention : à compléter\nRecommandations : à compléter" },
    { "id": "disclaimer", "type": "text", "titre": "Mentions",
      "contenu": "Document non contractuel. Les estimations présentées sont fondées sur les éléments transmis par le client à la date de rédaction et peuvent évoluer en fonction des conditions de marché." }
  ]
}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.modeles_documents WHERE categorie = 'fiche_rentabilite'
);
