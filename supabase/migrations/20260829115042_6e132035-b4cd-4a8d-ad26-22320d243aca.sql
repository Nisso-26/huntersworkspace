-- 1. sous_statut élargi (portail partenaire)
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_sous_statut_valide;
ALTER TABLE public.dossiers ADD CONSTRAINT dossiers_sous_statut_valide CHECK (
  sous_statut IS NULL
  OR (sous_statut IN ('gagne','perdu') AND status = 'cloture')
  OR sous_statut IN ('en_attente_partenaire','valide_quitus','invalide_motive','corrige_auto_valide','conteste_escalade')
);

-- 2. Portail partenaire
CREATE TABLE public.acces_portail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  partenaire_id uuid NOT NULL REFERENCES public.partenaires(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  scope_lecture jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope_decision jsonb NOT NULL DEFAULT '[]'::jsonb,
  nature_validation text,
  date_generation timestamptz NOT NULL DEFAULT now(),
  date_expiration timestamptz NOT NULL,
  date_revocation timestamptz,
  nb_ouvertures_max integer NOT NULL DEFAULT 20,
  nb_ouvertures_effectuees integer NOT NULL DEFAULT 0,
  created_by uuid
);
CREATE INDEX idx_acces_portail_dossier ON public.acces_portail(dossier_id);

CREATE TABLE public.decisions_partenaire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acces_portail_id uuid NOT NULL REFERENCES public.acces_portail(id) ON DELETE CASCADE,
  verdict text NOT NULL CHECK (verdict IN ('quitus','invalidation')),
  justification text NOT NULL,
  code_confirmation_genere text,
  code_confirmation_saisi text,
  date_decision timestamptz,
  ip_session text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_decisions_partenaire_acces ON public.decisions_partenaire(acces_portail_id);

CREATE TABLE public.quitus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL REFERENCES public.decisions_partenaire(id) ON DELETE CASCADE,
  dossier_id uuid NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  contenu jsonb NOT NULL DEFAULT '{}'::jsonb,
  contenu_pdf_url text,
  date_generation timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quitus_dossier ON public.quitus(dossier_id);

CREATE TABLE public.log_acces_portail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acces_portail_id uuid NOT NULL REFERENCES public.acces_portail(id) ON DELETE CASCADE,
  evenement text NOT NULL CHECK (evenement IN ('ouverture','consultation','decision','revocation')),
  detail jsonb,
  horodatage timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_acces_portail_acces ON public.log_acces_portail(acces_portail_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acces_portail TO authenticated;
GRANT SELECT ON public.decisions_partenaire TO authenticated;
GRANT SELECT ON public.quitus TO authenticated;
GRANT SELECT ON public.log_acces_portail TO authenticated;
GRANT ALL ON public.acces_portail, public.decisions_partenaire, public.quitus, public.log_acces_portail TO service_role;

ALTER TABLE public.acces_portail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions_partenaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quitus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_acces_portail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acces portail gere par mandataire du dossier ou admin"
ON public.acces_portail FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = acces_portail.dossier_id AND d.mandataire_id = auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = acces_portail.dossier_id AND d.mandataire_id = auth.uid())
);

CREATE POLICY "Decisions lisibles par mandataire du dossier ou admin"
ON public.decisions_partenaire FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.acces_portail a
    JOIN public.dossiers d ON d.id = a.dossier_id
    WHERE a.id = decisions_partenaire.acces_portail_id AND d.mandataire_id = auth.uid()
  )
);

CREATE POLICY "Quitus lisibles par mandataire du dossier ou admin"
ON public.quitus FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (SELECT 1 FROM public.dossiers d WHERE d.id = quitus.dossier_id AND d.mandataire_id = auth.uid())
);

CREATE POLICY "Logs lisibles par mandataire du dossier ou admin"
ON public.log_acces_portail FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.acces_portail a
    JOIN public.dossiers d ON d.id = a.dossier_id
    WHERE a.id = log_acces_portail.acces_portail_id AND d.mandataire_id = auth.uid()
  )
);

-- 3. Modeles d'export scopes
INSERT INTO public.modeles_documents (titre, categorie, contenu_template, actif) VALUES
(
  'Export Financement — Partenaire bancaire',
  'export_scope',
  '{"sections":[
    {"id":"header","type":"header","titre":"DOSSIER DE FINANCEMENT","contenu":"Dossier {{numero_dossier}} — document anonymisé destiné au partenaire bancaire","export_scope":["financement"],"modifiable_mandataire":false},
    {"id":"situation_financiere","type":"text","titre":"SITUATION FINANCIÈRE","contenu":"Revenus nets mensuels : {{revenus_nets_mensuels}}\nRevenus du conjoint : {{revenus_conjoint}}\nRevenus locatifs existants : {{revenus_locatifs_existants}}\nCharges mensuelles fixes : {{charges_mensuelles_fixes}}\nCapacité d''épargne mensuelle : {{capacite_epargne_mensuelle}}\nApport disponible : {{apport_disponible}}\nTaux d''endettement actuel : {{taux_endettement_actuel}}","export_scope":["financement"],"modifiable_mandataire":false},
    {"id":"projet","type":"text","titre":"PROJET","contenu":"Budget d''acquisition : {{budget}}\nZone recherchée : {{ville}}\nType de bien : {{type_bien_souhaite}}\nHorizon d''investissement : {{horizon_investissement}}\nDélai de concrétisation : {{delai_concretisation}}","export_scope":["financement","montage_juridique"],"modifiable_mandataire":true},
    {"id":"montage_resume","type":"text","titre":"MONTAGE ENVISAGÉ (RÉSUMÉ)","contenu":"{{montage_resume}}","export_scope":["financement"],"modifiable_mandataire":true},
    {"id":"financement_demande","type":"text","titre":"FINANCEMENT SOLLICITÉ","contenu":"Montant estimé : {{capacite_emprunt_estimee}}\nDurée souhaitée : {{duree_credit_souhaitee}} ans\nPréférence de taux : {{preference_taux}}","export_scope":["financement"],"modifiable_mandataire":true},
    {"id":"confidentialite","type":"text","titre":"CONFIDENTIALITÉ","contenu":"Document anonymisé transmis à un partenaire bancaire dans le cadre de l''étude de financement du dossier {{numero_dossier}}. Ne comporte ni volet décoration, ni volet AMO, ni détail fiscal complet.","export_scope":["financement"],"modifiable_mandataire":false}
  ]}'::jsonb,
  true
),
(
  'Export Montage juridique et fiscal — Partenaire conseil',
  'export_scope',
  '{"sections":[
    {"id":"header","type":"header","titre":"MONTAGE JURIDIQUE ET FISCAL","contenu":"Dossier {{numero_dossier}} — document anonymisé, consultable via le Portail Partenaire","export_scope":["montage_juridique"],"modifiable_mandataire":false},
    {"id":"situation_patrimoniale","type":"text","titre":"SITUATION PATRIMONIALE","contenu":"Régime matrimonial : {{regime_matrimonial}}\nSituation familiale : {{situation_familiale}} — {{nombre_enfants}} enfant(s)\nTMI : {{tmi}} %\nPatrimoine existant : {{autres_actifs}}\nPassif total : {{passif_total}}\nObjectif principal : {{objectif_principal}}\nObjectif fiscal : {{objectif_fiscal}}","export_scope":["montage_juridique"],"modifiable_mandataire":false},
    {"id":"projet","type":"text","titre":"PROJET","contenu":"Budget d''acquisition : {{budget}}\nZone recherchée : {{ville}}\nType de bien : {{type_bien_souhaite}}\nType de location : {{type_location_souhaite}}\nHorizon d''investissement : {{horizon_investissement}}","export_scope":["financement","montage_juridique"],"modifiable_mandataire":true},
    {"id":"montage_detaille","type":"text","titre":"MONTAGE DÉTAILLÉ","contenu":"{{montage_detaille}}","export_scope":["montage_juridique"],"modifiable_mandataire":true},
    {"id":"financement_resume","type":"text","titre":"FINANCEMENT (RÉSUMÉ)","contenu":"Montant estimé : {{capacite_emprunt_estimee}}\nDurée : {{duree_credit_souhaitee}} ans","export_scope":["montage_juridique"],"modifiable_mandataire":true},
    {"id":"confidentialite","type":"text","titre":"CONFIDENTIALITÉ","contenu":"Document anonymisé destiné au partenaire conseil désigné pour la validation du montage du dossier {{numero_dossier}}. Consultation strictement en ligne via le Portail Partenaire — aucun téléchargement autorisé.","export_scope":["montage_juridique"],"modifiable_mandataire":false}
  ]}'::jsonb,
  true
)
ON CONFLICT (titre) DO NOTHING;

-- 4. RPC portail partenaire
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
  toutes text[] := ARRAY['situation_financiere','patrimoine','projet','montage','financement_resume'];
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
      'sous_statut', d.sous_statut
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
  _justification text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  dec record;
  code text;
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

  code := upper(substr(regexp_replace(encode(gen_random_bytes(8), 'hex'), '[^a-z0-9]', '', 'g'), 1, 4));

  SELECT * INTO dec FROM public.decisions_partenaire
   WHERE acces_portail_id = a.id AND date_decision IS NULL LIMIT 1;

  IF dec.id IS NULL THEN
    INSERT INTO public.decisions_partenaire (acces_portail_id, verdict, justification, code_confirmation_genere)
    VALUES (a.id, _verdict, btrim(_justification), code)
    RETURNING * INTO dec;
  ELSE
    UPDATE public.decisions_partenaire
       SET verdict = _verdict, justification = btrim(_justification), code_confirmation_genere = code
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
    (a.id, 'decision', jsonb_build_object('type_destinataire', p.specialite, 'verdict', dec.verdict, 'champs_exposes', a.scope_lecture)),
    (a.id, 'revocation', jsonb_build_object('motif', 'auto_apres_decision'));

  RETURN jsonb_build_object('quitus_id', q.id, 'contenu', contenu);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_partner_consultation(_token text, _section text)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record;
BEGIN
  SELECT id INTO a FROM public.acces_portail
   WHERE token = _token AND date_revocation IS NULL AND date_expiration > now() LIMIT 1;
  IF a.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.log_acces_portail (acces_portail_id, evenement, detail)
  VALUES (a.id, 'consultation', jsonb_build_object('section', _section));
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_portal_payload(text) FROM public;
REVOKE ALL ON FUNCTION public.start_partner_decision(text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.submit_partner_decision(text, uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION public.log_partner_consultation(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_partner_portal_payload(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_partner_decision(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_decision(text, uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_partner_consultation(text, text) TO anon, authenticated;