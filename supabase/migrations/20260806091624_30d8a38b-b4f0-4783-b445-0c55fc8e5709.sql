-- 1. Durcir la fonction globale : exiger explicitement une session super_admin
CREATE OR REPLACE FUNCTION public.compute_objectif_trimestre()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_annee      integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_trim       integer := FLOOR((EXTRACT(MONTH FROM CURRENT_DATE)::int - 1) / 3) + 1;
  v_mand       record;
  v_row        public.objectifs_trimestriels;
  v_atteints   integer := 0;
  v_insuf      integer := 0;
  v_en_cours   integer := 0;
BEGIN
  -- Accès réservé : appel technique (service_role / cron, sans claims JWT)
  -- ou super_admin authentifié. Un anonyme ne peut plus passer.
  IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Accès réservé au Super Admin';
    END IF;
  END IF;

  FOR v_mand IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE COALESCE(p.status, 'actif') <> 'résilie'
      AND (ur.role IS NULL OR ur.role = 'mandataire')
  LOOP
    v_row := public.compute_objectif_trimestre(v_mand.id, v_annee, v_trim);
    IF v_row.statut = 'atteint' THEN
      v_atteints := v_atteints + 1;
    ELSIF v_row.statut = 'insuffisant' THEN
      v_insuf := v_insuf + 1;
    ELSE
      v_en_cours := v_en_cours + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'traites', v_atteints + v_insuf + v_en_cours,
    'atteints', v_atteints,
    'insuffisants', v_insuf,
    'en_cours', v_en_cours,
    'annee', v_annee,
    'trimestre', v_trim,
    'date', CURRENT_DATE
  );
END;
$function$;

-- 2. Durcir la fonction de clôture (cron / service_role uniquement)
CREATE OR REPLACE FUNCTION public.cloturer_trimestres_objectifs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mandataire record;
  v_today date := CURRENT_DATE;
  v_annee_courante integer := EXTRACT(YEAR FROM v_today)::int;
  v_trim_courant integer := FLOOR((EXTRACT(MONTH FROM v_today)::int - 1) / 3) + 1;
  v_is_first_day boolean := EXTRACT(DAY FROM v_today)::int = 1
                            AND EXTRACT(MONTH FROM v_today)::int IN (1, 4, 7, 10);
  v_annee_close integer;
  v_trim_close integer;
BEGIN
  IF current_setting('request.jwt.claims', true) IS NOT NULL
     AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Accès réservé au processus automatique';
  END IF;

  IF v_is_first_day THEN
    IF v_trim_courant = 1 THEN
      v_annee_close := v_annee_courante - 1;
      v_trim_close := 4;
    ELSE
      v_annee_close := v_annee_courante;
      v_trim_close := v_trim_courant - 1;
    END IF;
  END IF;

  FOR v_mandataire IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE COALESCE(p.status, 'actif') <> 'résilie'
      AND (ur.role IS NULL OR ur.role = 'mandataire')
  LOOP
    PERFORM public.compute_objectif_trimestre(
      v_mandataire.id, v_annee_courante, v_trim_courant
    );

    IF v_is_first_day THEN
      PERFORM public.compute_objectif_trimestre(
        v_mandataire.id, v_annee_close, v_trim_close
      );
    END IF;
  END LOOP;
END;
$function$;

-- 3. Révocation des droits d'exécution publics
REVOKE ALL ON FUNCTION public.cloturer_trimestres_objectifs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cloturer_trimestres_objectifs() FROM anon;
REVOKE ALL ON FUNCTION public.cloturer_trimestres_objectifs() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cloturer_trimestres_objectifs() TO service_role;
GRANT EXECUTE ON FUNCTION public.cloturer_trimestres_objectifs() TO postgres;

REVOKE ALL ON FUNCTION public.compute_objectif_trimestre() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_objectif_trimestre() FROM anon;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre() TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre() TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre() TO postgres;

REVOKE ALL ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) TO postgres;