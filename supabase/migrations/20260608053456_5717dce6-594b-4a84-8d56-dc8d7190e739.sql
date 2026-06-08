-- Overload no-arg : recalcule le trimestre courant pour tous les mandataires actifs
CREATE OR REPLACE FUNCTION public.compute_objectif_trimestre()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_annee      integer := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_trim       integer := FLOOR((EXTRACT(MONTH FROM CURRENT_DATE)::int - 1) / 3) + 1;
  v_mand       record;
  v_row        public.objectifs_trimestriels;
  v_atteints   integer := 0;
  v_insuf      integer := 0;
  v_en_cours   integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès réservé au Super Admin';
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
$$;

GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre() TO authenticated;