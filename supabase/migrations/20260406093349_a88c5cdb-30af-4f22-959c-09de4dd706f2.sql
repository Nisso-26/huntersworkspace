
-- Add TVA and date_echeance to factures
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS tva_taux numeric DEFAULT 20;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS montant_ttc numeric DEFAULT 0;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS date_echeance timestamp with time zone;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS dossier_client_name text;

-- Update statut default values - add brouillon and emise
-- No need to change enum, statut is text

-- Create chantiers table
CREATE TABLE public.chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  bien_id uuid REFERENCES public.biens(id) ON DELETE SET NULL,
  mandataire_id uuid,
  date_debut_prevue date,
  date_debut_reelle date,
  date_fin_prevue date,
  date_fin_reelle date,
  budget_alloue numeric DEFAULT 0,
  statut text NOT NULL DEFAULT 'a_planifier',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on chantiers" ON public.chantiers FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can view own chantiers" ON public.chantiers FOR SELECT TO authenticated USING (mandataire_id = auth.uid());
CREATE POLICY "Mandataires can insert own chantiers" ON public.chantiers FOR INSERT TO authenticated WITH CHECK (mandataire_id = auth.uid());
CREATE POLICY "Mandataires can update own chantiers" ON public.chantiers FOR UPDATE TO authenticated USING (mandataire_id = auth.uid()) WITH CHECK (mandataire_id = auth.uid());
CREATE POLICY "Mandataires can delete own chantiers" ON public.chantiers FOR DELETE TO authenticated USING (mandataire_id = auth.uid());

-- Create lots_travaux table
CREATE TABLE public.lots_travaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  designation text NOT NULL,
  artisan text,
  montant_devis numeric DEFAULT 0,
  montant_facture numeric DEFAULT 0,
  statut text NOT NULL DEFAULT 'a_faire',
  date_prevue date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lots_travaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on lots_travaux" ON public.lots_travaux FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can manage own lots" ON public.lots_travaux FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chantiers WHERE chantiers.id = lots_travaux.chantier_id AND chantiers.mandataire_id = auth.uid())
);

-- Create achats_deco table
CREATE TABLE public.achats_deco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  designation text NOT NULL,
  fournisseur text,
  montant numeric DEFAULT 0,
  statut_livraison text DEFAULT 'en_attente',
  lien_produit text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.achats_deco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on achats_deco" ON public.achats_deco FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can manage own achats" ON public.achats_deco FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chantiers WHERE chantiers.id = achats_deco.chantier_id AND chantiers.mandataire_id = auth.uid())
);

-- Create photos_chantier table
CREATE TABLE public.photos_chantier (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES public.chantiers(id) ON DELETE CASCADE NOT NULL,
  lot_id uuid REFERENCES public.lots_travaux(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  tag text DEFAULT 'pendant',
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.photos_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do all on photos_chantier" ON public.photos_chantier FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Mandataires can manage own photos" ON public.photos_chantier FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.chantiers WHERE chantiers.id = photos_chantier.chantier_id AND chantiers.mandataire_id = auth.uid())
);
