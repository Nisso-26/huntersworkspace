ALTER TABLE public.decisions_partenaire
ADD COLUMN IF NOT EXISTS proposition text;

CREATE OR REPLACE FUNCTION public.get_partner_portal_payload(_token text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  d record;
  p record;
  scope jsonb;
  sections jsonb := '{}'::jsonb;
  toutes text[] := ARRAY['situation_financiere','patrimoine','projet','montage','structure_juridique_fiscale','financement_resume'];
  exclues text[] := ARRAY[]::text[];
  s text;
  deja_decide boolean;
BEGIN
  SELECT * INTO a FROM public.acces_portail WHERE token = _token LIMIT 1;
  IF a.id IS NULL THEN RETURN NULL; END IF;
  IF a.date_revocation IS NOT NULL OR a.date_expiration <= now() THEN RETURN NULL; END IF;
  IF a.nb_ouvertures_max IS NOT NULL AND a.nb_ouvertures_effectuees >= a.nb_ouvertures_max THEN RETURN NULL; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.decisions_partenaire dp
    WHERE dp.acces_portail_id = a.id AND dp.date_decision IS NOT NULL
  ) INTO deja_decide;
  IF deja_decide THEN RETURN NULL; END IF;

  SELECT * INTO d FROM public.dossiers WHERE id = a.dossier_id;
  SELECT nom, specialite, societe INTO p FROM public.partenaires WHERE id = a.partenaire_id;
  scope := a.scope_lecture;

  IF scope ? 'situation_financiere' THEN
    sections := sections || jsonb_build_object('situation_financiere', jsonb_build_object(
      'revenus_nets_mensuels', d.revenus_nets_mensuels,
      'revenus_conjoint', d.revenus_conjoint,
      'revenus_locatifs_existants', d.revenus_locatifs_existants,
      'autres_revenus', d.autres_revenus,
      'charges_mensuelles_fixes', d.charges_mensuelles_fixes,
      'capacite_epargne_mensuelle', d.capacite_epargne_mensuelle,
      'epargne_disponible', d.epargne_disponible,
      'apport_disponible', d.apport_disponible,
      'taux_endettement_actuel', d.taux_endettement_actuel,
      'statut_professionnel', d.statut_professionnel
    ));
  END IF;

  IF scope ? 'patrimoine' THEN
    sections := sections || jsonb_build_object('patrimoine', jsonb_build_object(
      'regime_matrimonial', d.regime_matrimonial,
      'situation_familiale', d.situation_familiale,
      'nombre_enfants', d.nombre_enfants,
      'tmi', d.tmi,
      'revenus_fiscaux_reference', d.revenus_fiscaux_reference,
      'impot_revenu_paye', d.impot_revenu_paye,
      'assujetti_ifi', d.assujetti_ifi,
      'objectif_fiscal', d.objectif_fiscal,
      'deficits_fonciers_existants', d.deficits_fonciers_existants,
      'dispositifs_fiscaux_en_cours', d.dispositifs_fiscaux_en_cours,
      'autres_actifs', d.autres_actifs,
      'passif_total', d.passif_total,
      'biens_locatifs_existants', d.biens_locatifs_existants,
      'epargne_financiere', d.epargne_financiere
    ));
  END IF;

  IF scope ? 'projet' THEN
    sections := sections || jsonb_build_object('projet', jsonb_build_object(
      'budget', d.budget,
      'ville', d.ville,
      'type_bien_souhaite', d.type_bien_souhaite,
      'type_location_souhaite', d.type_location_souhaite,
      'objectif_principal', d.objectif_principal,
      'horizon_investissement', d.horizon_investissement,
      'appetence_risque', d.appetence_risque,
      'contraintes_geographiques', d.contraintes_geographiques,
      'delai_concretisation', d.delai_concretisation
    ));
  END IF;

  IF scope ? 'montage' THEN
    sections := sections || jsonb_build_object('montage', jsonb_build_object(
      'strategie', d.strategie,
      'type_accompagnement', d.type_accompagnement
    ));
  END IF;

  IF scope ? 'structure_juridique_fiscale' THEN
    sections := sections || jsonb_build_object('structure_juridique_fiscale', jsonb_build_object(
      'regime_matrimonial', d.regime_matrimonial,
      'situation_familiale', d.situation_familiale,
      'nombre_enfants', d.nombre_enfants,
      'tmi', d.tmi,
      'assujetti_ifi', d.assujetti_ifi,
      'objectif_fiscal', d.objectif_fiscal,
      'dispositifs_fiscaux_en_cours', d.dispositifs_fiscaux_en_cours,
      'deficits_fonciers_existants', d.deficits_fonciers_existants,
      'strategie', d.strategie,
      'type_accompagnement', d.type_accompagnement
    ));
  END IF;

  IF scope ? 'financement_resume' THEN
    sections := sections || jsonb_build_object('financement_resume', jsonb_build_object(
      'capacite_emprunt_estimee', d.capacite_emprunt_estimee,
      'duree_credit_souhaitee', d.duree_credit_souhaitee,
      'preference_taux', d.preference_taux,
      'budget', d.budget
    ));
  END IF;

  FOREACH s IN ARRAY toutes LOOP
    IF NOT (scope ? s) THEN exclues := array_append(exclues, s); END IF;
  END LOOP;

  UPDATE public.acces_portail
     SET nb_ouvertures_effectuees = nb_ouvertures_effectuees + 1
   WHERE id = a.id;

  INSERT INTO public.log_acces_portail (acces_portail_id, evenement, detail)
  VALUES (a.id, 'ouverture', jsonb_build_object('type_destinataire', p.specialite, 'champs_exposes', a.scope_lecture));

  RETURN jsonb_build_object(
    'acces', jsonb_build_object(
      'id', a.id,
      'date_expiration', a.date_expiration,
      'date_generation', a.date_generation,
      'nature_validation', a.nature_validation,
      'scope_lecture', a.scope_lecture,
      'scope_decision', a.scope_decision,
      'nb_ouvertures_effectuees', a.nb_ouvertures_effectuees + 1,
      'nb_ouvertures_max', a.nb_ouvertures_max
    ),
    'dossier', jsonb_build_object(
      'numero_dossier', COALESCE(d.numero_dossier, 'DOSSIER'),
      'etape', d.etape,
      'sous_statut', d.sous_statut,
      'budget_renseigne', d.budget IS NOT NULL,
      'capacite_emprunt_renseignee', d.capacite_emprunt_estimee IS NOT NULL
    ),
    'partenaire', jsonb_build_object('nom', p.nom, 'specialite', p.specialite, 'societe', p.societe),
    'sections', sections,
    'sections_exclues', to_jsonb(exclues)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.start_partner_decision(
  _token text,
  _verdict text,
  _justification text,
  _proposition text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a record;
  d record;
  p record;
  dec record;
  code text;
  profil text;
  proposition_nettoyee text := NULLIF(btrim(COALESCE(_proposition, '')), '');
BEGIN
  IF _verdict NOT IN ('quitus','invalidation') THEN
    RAISE EXCEPTION 'Verdict invalide';
  END IF;
  IF _justification IS NULL OR length(btrim(_justification)) < 10 THEN
    RAISE EXCEPTION 'Justification obligatoire (10 caracteres minimum)';
  END IF;

  SELECT * INTO a FROM public.acces_portail WHERE token = _token LIMIT 1;
  IF a.id IS NULL OR a.date_revocation IS NOT NULL OR a.date_expiration <= now() THEN
    RAISE EXCEPTION 'Acces invalide ou expire';
  END IF;
  IF EXISTS (SELECT 1 FROM public.decisions_partenaire dp WHERE dp.acces_portail_id = a.id AND dp.date_decision IS NOT NULL) THEN
    RAISE EXCEPTION 'Une decision a deja ete soumise pour cet acces';
  END IF;

  SELECT budget, capacite_emprunt_estimee INTO d FROM public.dossiers WHERE id = a.dossier_id;
  SELECT specialite INTO p FROM public.partenaires WHERE id = a.partenaire_id;

  profil := CASE
    WHEN COALESCE(p.specialite, '') ~* 'cgp' THEN 'cgp'
    WHEN COALESCE(p.specialite, '') ~* 'avocat' THEN 'avocat'
    WHEN COALESCE(p.specialite, '') ~* 'notaire' THEN 'notaire'
    WHEN COALESCE(p.specialite, '') ~* 'juriste' THEN 'juriste'
    WHEN COALESCE(p.specialite, '') ~* 'expert.?comptable' THEN 'expert_comptable'
    ELSE 'courtier'
  END;

  IF profil = 'cgp' AND _verdict = 'invalidation' AND length(COALESCE(proposition_nettoyee, '')) < 10 THEN
    RAISE EXCEPTION 'Proposition de strategie obligatoire (10 caracteres minimum)';
  END IF;
  IF profil = 'courtier' AND _verdict = 'invalidation' AND length(COALESCE(proposition_nettoyee, '')) < 50 THEN
    RAISE EXCEPTION 'Proposition de montage financier obligatoire (50 caracteres minimum)';
  END IF;
  IF profil = 'courtier' AND _verdict = 'quitus'
     AND (d.budget IS NULL OR d.capacite_emprunt_estimee IS NULL)
     AND length(COALESCE(proposition_nettoyee, '')) < 50 THEN
    RAISE EXCEPTION 'Proposition de montage financier obligatoire (50 caracteres minimum)';
  END IF;
  IF profil NOT IN ('cgp', 'courtier') THEN
    proposition_nettoyee := NULL;
  END IF;
  IF profil = 'cgp' AND _verdict <> 'invalidation' THEN
    proposition_nettoyee := NULL;
  END IF;

  code := upper(substr(md5(random()::text || clock_timestamp()::text || _token), 1, 4));

  SELECT * INTO dec FROM public.decisions_partenaire
   WHERE acces_portail_id = a.id AND date_decision IS NULL LIMIT 1;

  IF dec.id IS NULL THEN
    INSERT INTO public.decisions_partenaire (acces_portail_id, verdict, justification, proposition, code_confirmation_genere)
    VALUES (a.id, _verdict, btrim(_justification), proposition_nettoyee, code)
    RETURNING * INTO dec;
  ELSE
    UPDATE public.decisions_partenaire
       SET verdict = _verdict,
           justification = btrim(_justification),
           proposition = proposition_nettoyee,
           code_confirmation_genere = code
     WHERE id = dec.id
    RETURNING * INTO dec;
  END IF;

  RETURN jsonb_build_object('decision_id', dec.id, 'code', code);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_partner_decision(
  _token text,
  _decision_id uuid,
  _code text,
  _ip text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  dec record;
  d record;
  p record;
  q record;
  contenu jsonb;
BEGIN
  SELECT * INTO a FROM public.acces_portail WHERE token = _token LIMIT 1;
  IF a.id IS NULL OR a.date_revocation IS NOT NULL OR a.date_expiration <= now() THEN
    RAISE EXCEPTION 'Acces invalide ou expire';
  END IF;

  SELECT * INTO dec FROM public.decisions_partenaire
   WHERE id = _decision_id AND acces_portail_id = a.id AND date_decision IS NULL LIMIT 1;
  IF dec.id IS NULL THEN RAISE EXCEPTION 'Decision introuvable ou deja soumise'; END IF;
  IF dec.code_confirmation_genere IS NULL OR upper(btrim(COALESCE(_code, ''))) <> dec.code_confirmation_genere THEN
    RAISE EXCEPTION 'Code de confirmation incorrect';
  END IF;

  SELECT * INTO d FROM public.dossiers WHERE id = a.dossier_id;
  SELECT nom, specialite, societe INTO p FROM public.partenaires WHERE id = a.partenaire_id;

  UPDATE public.decisions_partenaire
     SET code_confirmation_saisi = upper(btrim(_code)),
         date_decision = now(),
         ip_session = _ip
   WHERE id = dec.id
  RETURNING * INTO dec;

  contenu := jsonb_build_object(
    'numero_dossier', COALESCE(d.numero_dossier, 'DOSSIER'),
    'nature_validation', a.nature_validation,
    'partenaire_nom', p.nom,
    'partenaire_specialite', p.specialite,
    'partenaire_societe', p.societe,
    'verdict', dec.verdict,
    'justification', dec.justification,
    'proposition', dec.proposition,
    'perimetre', a.scope_lecture,
    'certification', 'En confirmant, j''atteste avoir examine les elements du dossier ' ||
      COALESCE(d.numero_dossier, 'DOSSIER') ||
      ' dans le perimetre presente, et je certifie l''exactitude de mon verdict et de ma justification ci-dessus.',
    'horodatage', to_char(dec.date_decision, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
    'token_id', a.id,
    'code_confirmation', dec.code_confirmation_saisi
  );

  INSERT INTO public.quitus (decision_id, dossier_id, contenu)
  VALUES (dec.id, a.dossier_id, contenu)
  RETURNING * INTO q;

  UPDATE public.acces_portail SET date_revocation = now() WHERE id = a.id;

  UPDATE public.dossiers
     SET sous_statut = CASE WHEN dec.verdict = 'quitus' THEN 'valide_quitus' ELSE 'invalide_motive' END
   WHERE id = a.dossier_id;

  INSERT INTO public.log_acces_portail (acces_portail_id, evenement, detail)
  VALUES
    (a.id, 'decision', jsonb_build_object('type_destinataire', p.specialite, 'verdict', dec.verdict, 'proposition_jointe', dec.proposition IS NOT NULL, 'champs_exposes', a.scope_lecture)),
    (a.id, 'revocation', jsonb_build_object('motif', 'auto_apres_decision'));

  RETURN jsonb_build_object('quitus_id', q.id, 'decision_id', dec.id, 'dossier_id', a.dossier_id, 'verdict', dec.verdict, 'proposition_jointe', dec.proposition IS NOT NULL, 'contenu', contenu);
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_portal_payload(text) FROM public;
REVOKE ALL ON FUNCTION public.start_partner_decision(text, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.submit_partner_decision(text, uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_partner_portal_payload(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_partner_decision(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_decision(text, uuid, text, text) TO anon, authenticated;