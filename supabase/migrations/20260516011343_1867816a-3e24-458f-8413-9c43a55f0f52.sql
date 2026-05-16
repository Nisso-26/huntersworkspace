-- Fonction utilitaire pour timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Grille tarifaire des services
CREATE TABLE public.tarifs_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key text NOT NULL UNIQUE,
  label text NOT NULL,
  tarif_base numeric NOT NULL DEFAULT 0,
  unite text NOT NULL DEFAULT 'forfait',
  tva_taux numeric NOT NULL DEFAULT 20,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarifs_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read tarifs_services"
  ON public.tarifs_services FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admins manage tarifs_services"
  ON public.tarifs_services FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_tarifs_services_updated_at
  BEFORE UPDATE ON public.tarifs_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.tarifs_services (service_key, label, tarif_base, unite, tva_taux, ordre) VALUES
  ('conseil', 'Conseil en investissement', 1500, 'forfait', 20, 1),
  ('chasse', 'Chasse immobilière', 4, 'pourcentage_achat', 20, 2),
  ('financement', 'Accompagnement financement', 990, 'forfait', 20, 3),
  ('amo', 'AMO (Maîtrise d''ouvrage)', 8, 'pourcentage_travaux', 20, 4),
  ('deco', 'Déco / Ameublement', 2500, 'forfait', 20, 5),
  ('gestion_locative', 'Gestion locative', 7, 'pourcentage_loyer', 20, 6),
  ('cle_en_main', 'Pack Clé en main', 12000, 'forfait', 20, 7);

-- 2. Jalons de facturation
CREATE TABLE public.jalons_facturation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  libelle text NOT NULL,
  pourcentage numeric NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'a_facturer',
  facture_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jalons_dossier ON public.jalons_facturation(dossier_id);

ALTER TABLE public.jalons_facturation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mandataires manage own jalons"
  ON public.jalons_facturation FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = jalons_facturation.dossier_id AND d.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = jalons_facturation.dossier_id AND d.mandataire_id = auth.uid()));

CREATE POLICY "Super admins all jalons"
  ON public.jalons_facturation FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_jalons_facturation_updated_at
  BEFORE UPDATE ON public.jalons_facturation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Documents génériques (archive exports PDF)
CREATE TABLE public.documents_generiques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  type_export text NOT NULL,
  numero_dossier text,
  date_generation timestamptz NOT NULL DEFAULT now(),
  genere_par uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_docs_generiques_dossier ON public.documents_generiques(dossier_id);

ALTER TABLE public.documents_generiques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mandataires manage own documents_generiques"
  ON public.documents_generiques FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = documents_generiques.dossier_id AND d.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = documents_generiques.dossier_id AND d.mandataire_id = auth.uid()));

CREATE POLICY "Super admins all documents_generiques"
  ON public.documents_generiques FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 4. Colonnes facturation
ALTER TABLE public.factures
  ADD COLUMN IF NOT EXISTS remise_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remise_montant numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lignes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS jalon_id uuid,
  ADD COLUMN IF NOT EXISTS mode_facturation text;