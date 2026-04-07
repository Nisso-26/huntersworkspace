
-- 1. Create visites_chantier table for site visit reports
CREATE TABLE public.visites_chantier (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chantier_id UUID NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  date_visite TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  personnes_presentes TEXT,
  observations TEXT,
  points_vigilance TEXT,
  prochaines_actions JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visites_chantier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mandataires can manage own visites" ON public.visites_chantier
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM chantiers WHERE chantiers.id = visites_chantier.chantier_id AND chantiers.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM chantiers WHERE chantiers.id = visites_chantier.chantier_id AND chantiers.mandataire_id = auth.uid()));

CREATE POLICY "Super admins can do all on visites_chantier" ON public.visites_chantier
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Create photos_visite table for visit photos
CREATE TABLE public.photos_visite (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visite_id UUID NOT NULL REFERENCES public.visites_chantier(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  legende TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.photos_visite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mandataires can manage own visit photos" ON public.photos_visite
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM visites_chantier vc JOIN chantiers c ON c.id = vc.chantier_id WHERE vc.id = photos_visite.visite_id AND c.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM visites_chantier vc JOIN chantiers c ON c.id = vc.chantier_id WHERE vc.id = photos_visite.visite_id AND c.mandataire_id = auth.uid()));

CREATE POLICY "Super admins can do all on photos_visite" ON public.photos_visite
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- 3. Enrich lots_travaux with contact, engaged amount, progress
ALTER TABLE public.lots_travaux
  ADD COLUMN IF NOT EXISTS contact_artisan TEXT,
  ADD COLUMN IF NOT EXISTS montant_engage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avancement INTEGER DEFAULT 0;

-- 4. Enrich achats_deco with full order tracking fields
ALTER TABLE public.achats_deco
  ADD COLUMN IF NOT EXISTS reference_produit TEXT,
  ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantite INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS date_commande DATE,
  ADD COLUMN IF NOT EXISTS date_livraison_estimee DATE,
  ADD COLUMN IF NOT EXISTS date_livraison_reelle DATE,
  ADD COLUMN IF NOT EXISTS piece TEXT;

-- 5. Enrich photos_chantier with piece and legende
ALTER TABLE public.photos_chantier
  ADD COLUMN IF NOT EXISTS piece TEXT,
  ADD COLUMN IF NOT EXISTS legende TEXT;

-- 6. Create storage bucket for visit photos
INSERT INTO storage.buckets (id, name, public) VALUES ('visites-photos', 'visites-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visites-photos bucket
CREATE POLICY "Authenticated users can upload visit photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'visites-photos');

CREATE POLICY "Anyone can view visit photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'visites-photos');

CREATE POLICY "Authenticated users can delete own visit photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'visites-photos');

-- 7. Enable realtime for visites_chantier
ALTER PUBLICATION supabase_realtime ADD TABLE public.visites_chantier;
