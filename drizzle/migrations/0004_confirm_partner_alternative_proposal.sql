CREATE OR REPLACE FUNCTION public.submit_partner_decision(
  _token text,
  _decision_id uuid,
  _code text,
  _ip text,
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
  dec record;
  proposition_nettoyee text := NULLIF(btrim(COALESCE(_proposition_alternative, '')), '');
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

  SELECT * INTO dec
  FROM public.decisions_partenaire
  WHERE id = _decision_id
    AND acces_portail_id = a.id
    AND date_decision IS NULL
  LIMIT 1;

  IF dec.id IS NULL THEN
    RAISE EXCEPTION 'Decision introuvable ou deja soumise';
  END IF;

  IF dec.proposition_alternative IS DISTINCT FROM proposition_nettoyee THEN
    RAISE EXCEPTION 'La contre-proposition ne correspond pas a la decision preparee';
  END IF;

  resultat := public.submit_partner_decision(_token, _decision_id, _code, _ip);
  RETURN resultat || jsonb_build_object(
    'proposition_alternative', proposition_nettoyee,
    'proposition_jointe', proposition_nettoyee IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_partner_decision(text, uuid, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_partner_decision(text, uuid, text, text, text, text) TO anon, authenticated;