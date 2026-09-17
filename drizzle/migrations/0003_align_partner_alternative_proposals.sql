ALTER TABLE public.decisions_partenaire
ADD COLUMN IF NOT EXISTS proposition_alternative text;

ALTER TABLE public.dossiers
ADD COLUMN IF NOT EXISTS montage_financier_propose text;

UPDATE public.decisions_partenaire
SET proposition_alternative = proposition
WHERE proposition_alternative IS NULL
  AND proposition IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_partner_alternative_proposal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.proposition_alternative IS NULL AND NEW.proposition IS NOT NULL THEN
    NEW.proposition_alternative := NEW.proposition;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_partner_alternative_proposal_trigger
BEFORE INSERT OR UPDATE OF proposition, proposition_alternative
ON public.decisions_partenaire
FOR EACH ROW
EXECUTE FUNCTION public.sync_partner_alternative_proposal();

CREATE OR REPLACE FUNCTION public.get_partner_portal_decision_context(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN a.id IS NULL
      OR a.date_revocation IS NOT NULL
      OR a.date_expiration <= now()
    THEN NULL
    ELSE jsonb_build_object(
      'budget', d.budget,
      'capacite_emprunt_estimee', d.capacite_emprunt_estimee
    )
  END
  FROM public.acces_portail a
  JOIN public.dossiers d ON d.id = a.dossier_id
  WHERE a.token = _token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.start_partner_decision(
  _token text,
  _verdict text,
  _justification text,
  _proposition_alternative text,
  _api_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  d record;
  p record;
  profil text;
  proposition_nettoyee text := NULLIF(btrim(COALESCE(_proposition_alternative, '')), '');
  proposition_transmise text;
  resultat jsonb;
BEGIN
  IF _api_version <> 'proposition_alternative_v1' THEN
    RAISE EXCEPTION 'Version API invalide';
  END IF;

  SELECT * INTO a
  FROM public.acces_portail
  WHERE token = _token
  LIMIT 1;

  IF a.id IS NULL OR a.date_revocation IS NOT NULL OR a.date_expiration <= now() THEN
    RAISE EXCEPTION 'Acces invalide ou expire';
  END IF;

  SELECT budget, capacite_emprunt_estimee INTO d
  FROM public.dossiers
  WHERE id = a.dossier_id;

  SELECT specialite INTO p
  FROM public.partenaires
  WHERE id = a.partenaire_id;

  profil := CASE
    WHEN COALESCE(p.specialite, '') ~* 'cgp' THEN 'cgp'
    WHEN COALESCE(p.specialite, '') ~* 'avocat' THEN 'avocat'
    WHEN COALESCE(p.specialite, '') ~* 'notaire' THEN 'notaire'
    WHEN COALESCE(p.specialite, '') ~* 'juriste' THEN 'juriste'
    WHEN COALESCE(p.specialite, '') ~* '(fiscal|expert.?comptable)' THEN 'expert_comptable'
    ELSE 'courtier'
  END;

  IF profil = 'cgp' AND _verdict = 'invalidation'
     AND length(COALESCE(proposition_nettoyee, '')) < 10 THEN
    RAISE EXCEPTION 'Proposition de strategie obligatoire (10 caracteres minimum)';
  END IF;

  IF profil = 'courtier' AND _verdict = 'invalidation'
     AND length(COALESCE(proposition_nettoyee, '')) < 50 THEN
    RAISE EXCEPTION 'Proposition de montage financier obligatoire (50 caracteres minimum)';
  END IF;

  IF profil = 'courtier' AND _verdict = 'quitus'
     AND d.budget IS NULL
     AND d.capacite_emprunt_estimee IS NULL
     AND length(COALESCE(proposition_nettoyee, '')) < 50 THEN
    RAISE EXCEPTION 'Proposition de montage financier obligatoire (50 caracteres minimum)';
  END IF;

  IF profil NOT IN ('cgp', 'courtier')
     OR (profil = 'cgp' AND _verdict <> 'invalidation') THEN
    proposition_nettoyee := NULL;
  END IF;

  proposition_transmise := proposition_nettoyee;
  IF profil = 'courtier'
     AND _verdict = 'quitus'
     AND NOT (d.budget IS NULL AND d.capacite_emprunt_estimee IS NULL)
     AND proposition_nettoyee IS NULL
     AND (d.budget IS NULL OR d.capacite_emprunt_estimee IS NULL) THEN
    proposition_transmise := repeat('_', 50);
  END IF;

  resultat := public.start_partner_decision(
    _token,
    _verdict,
    _justification,
    proposition_transmise
  );

  UPDATE public.decisions_partenaire
  SET proposition = proposition_nettoyee,
      proposition_alternative = proposition_nettoyee
  WHERE id = (resultat ->> 'decision_id')::uuid;

  RETURN resultat;
END;
$$;

REVOKE ALL ON FUNCTION public.get_partner_portal_decision_context(text) FROM public;
REVOKE ALL ON FUNCTION public.start_partner_decision(text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_partner_portal_decision_context(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_partner_decision(text, text, text, text, text) TO anon, authenticated;