CREATE OR REPLACE FUNCTION public.start_partner_decision(_token text, _verdict text, _justification text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  code := upper(substr(md5(random()::text || clock_timestamp()::text || _token), 1, 4));

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
$function$;