
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.cloturer_trimestres_objectifs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  -- Si on est le 1er jour d'un trimestre civil, le trimestre PRÉCÉDENT vient de se clôturer
  IF v_is_first_day THEN
    IF v_trim_courant = 1 THEN
      v_annee_close := v_annee_courante - 1;
      v_trim_close := 4;
    ELSE
      v_annee_close := v_annee_courante;
      v_trim_close := v_trim_courant - 1;
    END IF;
  END IF;

  -- Pour chaque mandataire actif
  FOR v_mandataire IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE COALESCE(p.status, 'actif') <> 'résilie'
      AND (ur.role IS NULL OR ur.role = 'mandataire')
  LOOP
    -- Recalcule toujours le trimestre courant (rafraîchissement quotidien)
    PERFORM public.compute_objectif_trimestre(
      v_mandataire.id, v_annee_courante, v_trim_courant
    );

    -- Clôture définitive du trimestre précédent le 1er jour du nouveau trimestre
    IF v_is_first_day THEN
      PERFORM public.compute_objectif_trimestre(
        v_mandataire.id, v_annee_close, v_trim_close
      );
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cloturer_trimestres_objectifs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cloturer_trimestres_objectifs() TO service_role;
