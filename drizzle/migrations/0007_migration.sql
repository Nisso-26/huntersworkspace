ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS surface_min numeric, ADD COLUMN IF NOT EXISTS dpe_min text CHECK (dpe_min IS NULL OR dpe_min IN ('A','B','C','D','E','F','G')), ADD COLUMN IF NOT EXISTS exterieur_souhaite text;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS mediateur text DEFAULT '';

CREATE TABLE public.fiches_biens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  bien_id uuid REFERENCES public.biens(id) ON DELETE SET NULL,
  mandataire_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  type_projet text NOT NULL DEFAULT 'residence_principale' CHECK (type_projet IN ('residence_principale','locatif','achat_revente')),
  statut text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon','prete','envoyee')),
  source_url text, description_source text,
  titre text, ville text, code_postal text, quartier text,
  prix_affiche numeric, surface_habitable numeric, surface_terrain numeric, nb_pieces integer, nb_chambres integer,
  etage text, ascenseur boolean, niveaux integer, exposition text, chauffage text, annee_construction integer,
  exterieur text, stationnement text, annexes text, sanitaires text,
  dpe_classe text, dpe_kwh numeric, ges_classe text, cout_energie_min numeric, cout_energie_max numeric,
  charges_copro_annuelles numeric, taxe_fonciere numeric,
  lecture_bien text, phrase_cle text, points_forts text[] NOT NULL DEFAULT '{}', points_vigilance text[] NOT NULL DEFAULT '{}',
  projet_texte text, travaux jsonb NOT NULL DEFAULT '[]'::jsonb, duree_detention_mois integer, prix_revente_vise numeric,
  interet_constate boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiches_biens TO authenticated;
GRANT ALL ON public.fiches_biens TO service_role;
ALTER TABLE public.fiches_biens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mandataires manage fiches of own dossiers" ON public.fiches_biens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = fiches_biens.dossier_id AND d.mandataire_id = auth.uid()))
  WITH CHECK (mandataire_id = auth.uid() AND EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = fiches_biens.dossier_id AND d.mandataire_id = auth.uid()));
CREATE POLICY "Super admins all fiches_biens" ON public.fiches_biens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
CREATE TRIGGER trg_fiches_biens_updated_at BEFORE UPDATE ON public.fiches_biens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fiches_biens_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id uuid NOT NULL REFERENCES public.fiches_biens(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  legende text,
  role text NOT NULL DEFAULT 'galerie' CHECK (role IN ('couverture','galerie','avant','apres')),
  origine text NOT NULL DEFAULT 'televersement' CHECK (origine IN ('visite','annonce','televersement')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiches_biens_photos TO authenticated;
GRANT ALL ON public.fiches_biens_photos TO service_role;
ALTER TABLE public.fiches_biens_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access photos via fiche" ON public.fiches_biens_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.fiches_biens f JOIN public.dossiers d ON d.id = f.dossier_id WHERE f.id = fiches_biens_photos.fiche_id AND (d.mandataire_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.fiches_biens f JOIN public.dossiers d ON d.id = f.dossier_id WHERE f.id = fiches_biens_photos.fiche_id AND (d.mandataire_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))));

-- Storage : chemin = <fiche_id>/<fichier>
CREATE POLICY "fiches-biens-photos access" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'fiches-biens-photos' AND EXISTS (SELECT 1 FROM public.fiches_biens f JOIN public.dossiers d ON d.id = f.dossier_id WHERE f.id::text = (storage.foldername(name))[1] AND (d.mandataire_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))))
  WITH CHECK (bucket_id = 'fiches-biens-photos' AND EXISTS (SELECT 1 FROM public.fiches_biens f JOIN public.dossiers d ON d.id = f.dossier_id WHERE f.id::text = (storage.foldername(name))[1] AND (d.mandataire_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role))));