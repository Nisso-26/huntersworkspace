
-- 1) FACTURES: numéro séquentiel
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS numero_facture text;

CREATE TABLE IF NOT EXISTS public.facture_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0
);
ALTER TABLE public.facture_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read facture_counters" ON public.facture_counters;
CREATE POLICY "Authenticated read facture_counters" ON public.facture_counters FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.generate_numero_facture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year int;
  next_num int;
BEGIN
  IF NEW.numero_facture IS NOT NULL AND NEW.numero_facture <> '' THEN
    RETURN NEW;
  END IF;
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.date_emission, now()))::int;
  INSERT INTO public.facture_counters (year, last_number)
    VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.facture_counters.last_number + 1
  RETURNING last_number INTO next_num;
  NEW.numero_facture := 'FAC-' || current_year || '-' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_numero_facture ON public.factures;
CREATE TRIGGER trg_generate_numero_facture
  BEFORE INSERT ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.generate_numero_facture();

-- Backfill existing factures
DO $$
DECLARE
  r RECORD;
  cur_year int := -1;
  counter int := 0;
BEGIN
  FOR r IN
    SELECT id, EXTRACT(YEAR FROM date_emission)::int AS yr
    FROM public.factures
    WHERE numero_facture IS NULL
    ORDER BY date_emission ASC, created_at ASC
  LOOP
    IF r.yr <> cur_year THEN
      cur_year := r.yr;
      SELECT COALESCE(MAX(last_number), 0) INTO counter FROM public.facture_counters WHERE year = cur_year;
    END IF;
    counter := counter + 1;
    UPDATE public.factures SET numero_facture = 'FAC-' || cur_year || '-' || LPAD(counter::text, 3, '0') WHERE id = r.id;
    INSERT INTO public.facture_counters (year, last_number) VALUES (cur_year, counter)
      ON CONFLICT (year) DO UPDATE SET last_number = GREATEST(public.facture_counters.last_number, EXCLUDED.last_number);
  END LOOP;
END$$;

-- 2) DOCUMENTS GÉNÉRÉS
CREATE TABLE IF NOT EXISTS public.documents_generes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'rapport_conseil',
  numero_dossier text,
  conseiller_id uuid,
  date_generation timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents_generes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mandataires manage own documents_generes" ON public.documents_generes;
CREATE POLICY "Mandataires manage own documents_generes" ON public.documents_generes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = documents_generes.dossier_id AND d.mandataire_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = documents_generes.dossier_id AND d.mandataire_id = auth.uid()));

DROP POLICY IF EXISTS "Super admins all documents_generes" ON public.documents_generes;
CREATE POLICY "Super admins all documents_generes" ON public.documents_generes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- 3) CLIENT_TOKENS
ALTER TABLE public.client_tokens ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;
ALTER TABLE public.client_tokens ADD COLUMN IF NOT EXISTS last_relance_at timestamptz;
DROP POLICY IF EXISTS "Anon can mark token viewed" ON public.client_tokens;
CREATE POLICY "Anon can mark token viewed" ON public.client_tokens
  FOR UPDATE TO anon
  USING (is_active = true AND expires_at > now())
  WITH CHECK (is_active = true);

-- 4) HISTORIQUE STATUTS
CREATE TABLE IF NOT EXISTS public.historique_statuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL,
  ancien_statut text,
  nouveau_statut text NOT NULL,
  date_changement timestamptz NOT NULL DEFAULT now(),
  modifie_par uuid
);
CREATE INDEX IF NOT EXISTS idx_historique_statuts_dossier ON public.historique_statuts(dossier_id, date_changement DESC);
ALTER TABLE public.historique_statuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mandataires read own historique" ON public.historique_statuts;
CREATE POLICY "Mandataires read own historique" ON public.historique_statuts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM dossiers d WHERE d.id = historique_statuts.dossier_id AND d.mandataire_id = auth.uid()));

DROP POLICY IF EXISTS "Super admins all historique" ON public.historique_statuts;
CREATE POLICY "Super admins all historique" ON public.historique_statuts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE OR REPLACE FUNCTION public.log_dossier_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.historique_statuts (dossier_id, ancien_statut, nouveau_statut, modifie_par)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_dossier_status ON public.dossiers;
CREATE TRIGGER trg_log_dossier_status
  AFTER UPDATE OF status ON public.dossiers
  FOR EACH ROW EXECUTE FUNCTION public.log_dossier_status_change();
