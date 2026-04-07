
-- Company settings (single-row config)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Section 1: Identité société
  raison_sociale text DEFAULT '',
  forme_juridique text DEFAULT 'SAS',
  siret text DEFAULT '',
  carte_t_numero text DEFAULT '',
  carte_t_organisme text DEFAULT '',
  carte_t_expiration date,
  assureur_rcp text DEFAULT '',
  assureur_police text DEFAULT '',
  adresse_siege text DEFAULT '',
  telephone text DEFAULT '',
  email_contact text DEFAULT '',
  site_web text DEFAULT '',
  -- Section 3: Modèle économique
  taux_commission_siege numeric DEFAULT 40,
  tarif_abonnement_defaut numeric DEFAULT 125,
  periode_essai_jours integer DEFAULT 30,
  delai_suspension_jours integer DEFAULT 5,
  -- Section 4: Documents
  logo_url text,
  couleur_primaire text DEFAULT '#1A4D2E',
  couleur_secondaire text DEFAULT '#D4A017',
  clause_mediation text DEFAULT '',
  clause_rgpd text DEFAULT '',
  clause_retractation text DEFAULT '',
  mentions_legales text DEFAULT '',
  entete_document text DEFAULT '',
  pied_page_document text DEFAULT '',
  -- Section 5: Notifications
  email_alertes_dirigeant text DEFAULT '',
  frequence_rapport text DEFAULT 'hebdomadaire',
  tva_taux_defaut numeric DEFAULT 20,
  -- Meta
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on company_settings"
  ON public.company_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Fee schedule tranches
CREATE TABLE public.honoraires_tranches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prix_min numeric NOT NULL DEFAULT 0,
  prix_max numeric,
  taux numeric NOT NULL DEFAULT 4,
  montant_minimum numeric DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.honoraires_tranches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on honoraires_tranches"
  ON public.honoraires_tranches FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow all authenticated users to read honoraires (needed for dossier calculations)
CREATE POLICY "Authenticated can read honoraires_tranches"
  ON public.honoraires_tranches FOR SELECT TO authenticated
  USING (true);

-- Audit log
CREATE TABLE public.settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text,
  section text NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on settings_audit_log"
  ON public.settings_audit_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default settings row
INSERT INTO public.company_settings (raison_sociale, forme_juridique) VALUES ('HUNTERS IMMOBILIER', 'SAS');

-- Insert default honoraires tranches
INSERT INTO public.honoraires_tranches (prix_min, prix_max, taux, montant_minimum, ordre) VALUES
  (0, 100000, 4, 3000, 1),
  (100000, 200000, 3.5, 0, 2),
  (200000, 300000, 3, 0, 3),
  (300000, null, 2.5, 0, 4);
