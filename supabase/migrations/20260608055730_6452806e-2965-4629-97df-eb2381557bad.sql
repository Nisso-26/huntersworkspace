
-- 1) Lock down compute_objectif_trimestre(uuid,int,int) to owner or super_admin
CREATE OR REPLACE FUNCTION public.compute_objectif_trimestre(_mandataire_id uuid, _annee integer, _trimestre integer)
 RETURNS objectifs_trimestriels
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Access control: when called via API, restrict to owner or super_admin
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _mandataire_id
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Accès interdit';
  END IF;

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

  SELECT COALESCE(SUM(montant), 0) INTO v_ca
  FROM public.factures
  WHERE mandataire_id = _mandataire_id
    AND statut = 'paye'
    AND date_paiement >= v_start AND date_paiement < v_end;

  SELECT COUNT(*) INTO v_mandats
  FROM public.dossiers
  WHERE mandataire_id = _mandataire_id
    AND status IN ('signe','compromis')
    AND updated_at >= v_start AND updated_at < v_end;

  SELECT COALESCE(SUM(nb_conseils_realises), 0) INTO v_conseils
  FROM public.conseils_mensuels
  WHERE mandataire_id = _mandataire_id
    AND annee = _annee
    AND mois BETWEEN (_trimestre - 1) * 3 + 1 AND _trimestre * 3;

  v_termine := v_now >= v_end;
  v_atteint := (v_ca >= v_ca_obj) AND (v_mandats >= v_mandats_obj) AND (v_conseils >= v_conseils_obj);

  IF v_atteint THEN v_statut := 'atteint';
  ELSIF v_termine THEN v_statut := 'insuffisant';
  ELSE v_statut := 'en_cours';
  END IF;

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

  IF v_termine AND v_statut = 'insuffisant' AND v_rates >= 1 THEN
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
$function$;

-- 2) Drop anon SELECT policies that leaked data based solely on dossier UUID
DROP POLICY IF EXISTS "Anon can read dossiers via token" ON public.dossiers;
DROP POLICY IF EXISTS "Anon can read biens via token" ON public.biens;
DROP POLICY IF EXISTS "Anon can read chantiers via token" ON public.chantiers;
DROP POLICY IF EXISTS "Anon can read lots via token" ON public.lots_travaux;
DROP POLICY IF EXISTS "Anon can read evenements via token" ON public.evenements;
DROP POLICY IF EXISTS "Anon can read documents via token" ON public.documents;
DROP POLICY IF EXISTS "Anon read devis envoyes via token" ON public.devis;

-- 3) Update get_dossier_for_portal to also expose numero_dossier (replacing direct anon read)
CREATE OR REPLACE FUNCTION public.get_dossier_for_portal(_dossier_id uuid)
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'id', d.id,
    'numero_dossier', d.numero_dossier,
    'client_name', d.client_name,
    'status', d.status,
    'etape', d.etape,
    'strategie', d.strategie,
    'ville', d.ville,
    'budget', d.budget,
    'honoraires', d.honoraires,
    'notes', d.notes,
    'created_at', d.created_at,
    'updated_at', d.updated_at
  )
  FROM dossiers d
  WHERE d.id = _dossier_id
    AND dossier_has_active_token(_dossier_id)
$function$;

-- 4) New consolidated RPC: validates token and returns all portal data
CREATE OR REPLACE FUNCTION public.get_portal_payload(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_token record;
  v_dossier_id uuid;
  v_payload jsonb;
BEGIN
  SELECT id, dossier_id, client_name, client_email, expires_at, is_active, last_viewed_at
    INTO v_token
  FROM public.client_tokens
  WHERE token = _token
    AND is_active = true
    AND expires_at > now()
  LIMIT 1;

  IF v_token.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_dossier_id := v_token.dossier_id;

  SELECT jsonb_build_object(
    'token', to_jsonb(v_token),
    'dossier', (
      SELECT to_jsonb(d) - 'email' - 'phone' - 'date_naissance' - 'revenus_nets_mensuels'
             - 'revenus_conjoint' - 'autres_revenus' - 'epargne_disponible'
             - 'apport_disponible' - 'revenus_fiscaux_reference' - 'impot_revenu_paye'
             - 'epargne_financiere' - 'credits_en_cours' - 'biens_locatifs_existants'
             - 'residence_principale_valeur' - 'residence_principale_crd'
             - 'charges_mensuelles_fixes' - 'capacite_epargne_mensuelle'
             - 'taux_endettement_actuel' - 'revenus_locatifs_existants'
             - 'tmi' - 'grille_controle' - 'grille_modifications' - 'criteres_qualification'
      FROM public.dossiers d WHERE d.id = v_dossier_id
    ),
    'biens', COALESCE((SELECT jsonb_agg(to_jsonb(b)) FROM public.biens b WHERE b.dossier_id = v_dossier_id), '[]'::jsonb),
    'chantiers', COALESCE((
      SELECT jsonb_agg(to_jsonb(c)) FROM public.chantiers c
      WHERE c.bien_id IN (SELECT id FROM public.biens WHERE dossier_id = v_dossier_id)
    ), '[]'::jsonb),
    'lots', COALESCE((
      SELECT jsonb_agg(to_jsonb(l)) FROM public.lots_travaux l
      WHERE l.chantier_id IN (
        SELECT c.id FROM public.chantiers c
        WHERE c.bien_id IN (SELECT id FROM public.biens WHERE dossier_id = v_dossier_id)
      )
    ), '[]'::jsonb),
    'documents', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM public.documents d WHERE d.dossier_id = v_dossier_id), '[]'::jsonb),
    'evenements', COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.date_debut) FROM public.evenements e WHERE e.dossier_id = v_dossier_id), '[]'::jsonb),
    'devis', COALESCE((
      SELECT jsonb_agg(to_jsonb(dv)) FROM public.devis dv
      WHERE dv.dossier_id = v_dossier_id AND dv.statut IN ('envoye','accepte','refuse')
    ), '[]'::jsonb)
  ) INTO v_payload;

  UPDATE public.client_tokens SET last_viewed_at = now() WHERE id = v_token.id;

  RETURN v_payload;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_portal_payload(text) TO anon, authenticated;

-- 5) Storage: extend dossier-documents SELECT to allow dossier owner (via documents table)
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'dossier-documents'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.documents doc
      JOIN public.dossiers ds ON ds.id = doc.dossier_id
      WHERE doc.file_path = storage.objects.name
        AND ds.mandataire_id = auth.uid()
    )
  )
);

-- 6) Storage: add explicit UPDATE policy on chantier-photos bucket
CREATE POLICY "Users can update own chantier photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'chantier-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'chantier-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

-- 7) Realtime: restrict channel subscriptions to authenticated users on topics scoped to their user_id
-- (No broadcast topics are currently used; this provides explicit deny for cross-user broadcast/presence subscriptions.)
DROP POLICY IF EXISTS "Auth users own realtime topic" ON realtime.messages;
CREATE POLICY "Auth users own realtime topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() LIKE (auth.uid())::text || '%'
);
