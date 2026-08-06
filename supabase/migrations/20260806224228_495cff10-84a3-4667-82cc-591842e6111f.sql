-- 1. company_settings : lecture pour tout utilisateur authentifié (paramétrage partagé)
GRANT SELECT ON public.company_settings TO authenticated;
DROP POLICY IF EXISTS "Authenticated can read company_settings" ON public.company_settings;
CREATE POLICY "Authenticated can read company_settings"
  ON public.company_settings FOR SELECT TO authenticated
  USING (true);

-- 3. Suppression de l'ancienne table signature_requests (remplacée par signatures_electroniques)
DROP TABLE IF EXISTS public.signature_requests CASCADE;

-- 7. Suppression de honoraires_tranches (remplacée par baremes_hunters)
DROP TABLE IF EXISTS public.honoraires_tranches CASCADE;

-- 10. envois_documents : visibilité élargie au mandataire du dossier / chantier
DROP POLICY IF EXISTS envois_documents_select ON public.envois_documents;
CREATE POLICY envois_documents_select
  ON public.envois_documents FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = envois_documents.dossier_id AND d.mandataire_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chantiers c WHERE c.id = envois_documents.chantier_id AND c.mandataire_id = auth.uid())
  );

DROP POLICY IF EXISTS envois_documents_update ON public.envois_documents;
CREATE POLICY envois_documents_update
  ON public.envois_documents FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = envois_documents.dossier_id AND d.mandataire_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chantiers c WHERE c.id = envois_documents.chantier_id AND c.mandataire_id = auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = envois_documents.dossier_id AND d.mandataire_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.chantiers c WHERE c.id = envois_documents.chantier_id AND c.mandataire_id = auth.uid())
  );

-- 12. Numérotation automatique des devis
CREATE TABLE IF NOT EXISTS public.devis_counters (
  year integer NOT NULL PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.devis_counters TO service_role;
GRANT SELECT ON public.devis_counters TO authenticated;
ALTER TABLE public.devis_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins can read devis_counters" ON public.devis_counters;
CREATE POLICY "Super admins can read devis_counters"
  ON public.devis_counters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE FUNCTION public.generate_numero_devis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year int;
  next_num int;
BEGIN
  IF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN
    RETURN NEW;
  END IF;
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.date_emission, now()))::int;
  INSERT INTO public.devis_counters (year, last_number)
    VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.devis_counters.last_number + 1
  RETURNING last_number INTO next_num;
  NEW.numero := 'DEV-' || current_year || '-' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_generate_numero_devis ON public.devis;
CREATE TRIGGER trg_generate_numero_devis
  BEFORE INSERT ON public.devis
  FOR EACH ROW EXECUTE FUNCTION public.generate_numero_devis();