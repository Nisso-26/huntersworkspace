
-- 1. Objectifs réseau dans company_settings
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS ca_objectif_n1_trimestre numeric NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS ca_objectif_n2_trimestre numeric NOT NULL DEFAULT 30000,
  ADD COLUMN IF NOT EXISTS mandats_objectif_trimestre integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS conseils_objectif_mois integer NOT NULL DEFAULT 1;

-- 2. Table objectifs_trimestriels
CREATE TABLE IF NOT EXISTS public.objectifs_trimestriels (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandataire_id                 uuid NOT NULL,
  annee                         integer NOT NULL,
  trimestre                     integer NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  ca_objectif                   numeric NOT NULL DEFAULT 20000,
  ca_realise                    numeric NOT NULL DEFAULT 0,
  mandats_objectif              integer NOT NULL DEFAULT 2,
  mandats_realises              integer NOT NULL DEFAULT 0,
  conseils_objectif             integer NOT NULL DEFAULT 3,
  conseils_realises             integer NOT NULL DEFAULT 0,
  statut                        text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','atteint','insuffisant')),
  trimestres_rates_consecutifs  integer NOT NULL DEFAULT 0,
  leads_bloques                 boolean NOT NULL DEFAULT false,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mandataire_id, annee, trimestre)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectifs_trimestriels TO authenticated;
GRANT ALL ON public.objectifs_trimestriels TO service_role;
ALTER TABLE public.objectifs_trimestriels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage objectifs_trimestriels"
  ON public.objectifs_trimestriels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires read own objectifs_trimestriels"
  ON public.objectifs_trimestriels FOR SELECT TO authenticated
  USING (mandataire_id = auth.uid());

CREATE TRIGGER set_updated_at_objectifs
  BEFORE UPDATE ON public.objectifs_trimestriels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Table conseils_mensuels
CREATE TABLE IF NOT EXISTS public.conseils_mensuels (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandataire_id         uuid NOT NULL,
  annee                 integer NOT NULL,
  mois                  integer NOT NULL CHECK (mois BETWEEN 1 AND 12),
  nb_conseils_objectif  integer NOT NULL DEFAULT 1,
  nb_conseils_realises  integer NOT NULL DEFAULT 0,
  statut                text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours','atteint','insuffisant')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(mandataire_id, annee, mois)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conseils_mensuels TO authenticated;
GRANT ALL ON public.conseils_mensuels TO service_role;
ALTER TABLE public.conseils_mensuels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage conseils_mensuels"
  ON public.conseils_mensuels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Mandataires read own conseils_mensuels"
  ON public.conseils_mensuels FOR SELECT TO authenticated
  USING (mandataire_id = auth.uid());

CREATE TRIGGER set_updated_at_conseils_mensuels
  BEFORE UPDATE ON public.conseils_mensuels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Fonction de calcul et mise à jour automatique d'un trimestre
CREATE OR REPLACE FUNCTION public.compute_objectif_trimestre(
  _mandataire_id uuid, _annee integer, _trimestre integer
) RETURNS public.objectifs_trimestriels
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings record;
  v_niveau text;
  v_ca_obj numeric; v_mandats_obj integer; v_conseils_obj integer;
  v_start date; v_end date;
  v_ca numeric := 0; v_mandats integer := 0; v_conseils integer := 0;
  v_now date := CURRENT_DATE;
  v_termine boolean;
  v_atteint boolean;
  v_statut text;
  v_prev record;
  v_rates integer := 0;
  v_leads_bloques boolean := false;
  v_row public.objectifs_trimestriels;
  v_mandataire_name text;
BEGIN
  SELECT ca_objectif_n1_trimestre, ca_objectif_n2_trimestre,
         mandats_objectif_trimestre, conseils_objectif_mois
    INTO v_settings FROM public.company_settings LIMIT 1;

  SELECT COALESCE(niveau, 'N1'), COALESCE(full_name, '') INTO v_niveau, v_mandataire_name
    FROM public.profiles WHERE id = _mandataire_id;

  v_ca_obj := CASE WHEN v_niveau = 'N2'
                THEN COALESCE(v_settings.ca_objectif_n2_trimestre, 30000)
                ELSE COALESCE(v_settings.ca_objectif_n1_trimestre, 20000) END;
  v_mandats_obj := COALESCE(v_settings.mandats_objectif_trimestre, 2);
  v_conseils_obj := COALESCE(v_settings.conseils_objectif_mois, 1) * 3;

  v_start := make_date(_annee, (_trimestre - 1) * 3 + 1, 1);
  v_end := (v_start + interval '3 months')::date;

  -- CA réalisé = factures payées sur la période
  SELECT COALESCE(SUM(montant), 0) INTO v_ca
  FROM public.factures
  WHERE mandataire_id = _mandataire_id
    AND statut = 'paye'
    AND date_paiement >= v_start AND date_paiement < v_end;

  -- Mandats signés sur la période (dossiers signe/compromis)
  SELECT COUNT(*) INTO v_mandats
  FROM public.dossiers
  WHERE mandataire_id = _mandataire_id
    AND status IN ('signe','compromis')
    AND updated_at >= v_start AND updated_at < v_end;

  -- Conseils réalisés sur les 3 mois
  SELECT COALESCE(SUM(nb_conseils_realises), 0) INTO v_conseils
  FROM public.conseils_mensuels
  WHERE mandataire_id = _mandataire_id
    AND annee = _annee
    AND mois BETWEEN (_trimestre - 1) * 3 + 1 AND _trimestre * 3;

  v_termine := v_now >= v_end;
  v_atteint := (v_ca >= v_ca_obj) AND (v_mandats >= v_mandats_obj) AND (v_conseils >= v_conseils_obj);

  IF v_atteint THEN
    v_statut := 'atteint';
  ELSIF v_termine THEN
    v_statut := 'insuffisant';
  ELSE
    v_statut := 'en_cours';
  END IF;

  -- Trimestres ratés consécutifs (basé sur le trimestre précédent)
  IF v_statut = 'insuffisant' THEN
    SELECT * INTO v_prev FROM public.objectifs_trimestriels
      WHERE mandataire_id = _mandataire_id
        AND ((annee = _annee AND trimestre = _trimestre - 1)
          OR (_trimestre = 1 AND annee = _annee - 1 AND trimestre = 4))
      LIMIT 1;
    v_rates := COALESCE(v_prev.trimestres_rates_consecutifs, 0) + 1;
  ELSIF v_statut = 'atteint' THEN
    v_rates := 0;
  ELSE
    SELECT trimestres_rates_consecutifs INTO v_rates FROM public.objectifs_trimestriels
      WHERE mandataire_id = _mandataire_id AND annee = _annee AND trimestre = _trimestre;
    v_rates := COALESCE(v_rates, 0);
  END IF;

  v_leads_bloques := v_rates >= 2;

  INSERT INTO public.objectifs_trimestriels (
    mandataire_id, annee, trimestre, ca_objectif, ca_realise,
    mandats_objectif, mandats_realises, conseils_objectif, conseils_realises,
    statut, trimestres_rates_consecutifs, leads_bloques
  ) VALUES (
    _mandataire_id, _annee, _trimestre, v_ca_obj, v_ca,
    v_mandats_obj, v_mandats, v_conseils_obj, v_conseils,
    v_statut, v_rates, v_leads_bloques
  )
  ON CONFLICT (mandataire_id, annee, trimestre) DO UPDATE
    SET ca_objectif = EXCLUDED.ca_objectif,
        ca_realise = EXCLUDED.ca_realise,
        mandats_objectif = EXCLUDED.mandats_objectif,
        mandats_realises = EXCLUDED.mandats_realises,
        conseils_objectif = EXCLUDED.conseils_objectif,
        conseils_realises = EXCLUDED.conseils_realises,
        statut = EXCLUDED.statut,
        trimestres_rates_consecutifs = EXCLUDED.trimestres_rates_consecutifs,
        leads_bloques = EXCLUDED.leads_bloques,
        updated_at = now()
  RETURNING * INTO v_row;

  -- Dispositif gradué : si trimestre clôturé et insuffisant, créer alerte super_admin
  IF v_termine AND v_statut = 'insuffisant' AND v_rates >= 1 THEN
    -- Évite les doublons : une alerte par trimestre/niveau
    IF NOT EXISTS (
      SELECT 1 FROM public.alertes
      WHERE user_id IS NULL
        AND title LIKE 'Objectif T' || _trimestre || ' ' || _annee || ' — ' || v_mandataire_name || '%'
    ) THEN
      INSERT INTO public.alertes (user_id, type, title, detail)
      SELECT ur.user_id,
        CASE WHEN v_rates >= 3 THEN 'error'
             WHEN v_rates = 2 THEN 'error' ELSE 'warning' END,
        'Objectif T' || _trimestre || ' ' || _annee || ' — ' || v_mandataire_name
          || ' — ' || v_rates || ' trimestre(s) consécutif(s) raté(s)',
        'CA ' || v_ca || '/' || v_ca_obj || ' — Mandats ' || v_mandats || '/' || v_mandats_obj
          || ' — Conseils ' || v_conseils || '/' || v_conseils_obj
      FROM public.user_roles ur WHERE ur.role = 'super_admin';
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_objectif_trimestre(uuid, integer, integer) TO authenticated;
