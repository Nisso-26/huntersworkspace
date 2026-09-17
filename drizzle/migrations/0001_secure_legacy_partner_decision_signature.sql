CREATE OR REPLACE FUNCTION public.start_partner_decision(
  _token text,
  _verdict text,
  _justification text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.start_partner_decision(_token, _verdict, _justification, NULL::text);
$$;

REVOKE ALL ON FUNCTION public.start_partner_decision(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.start_partner_decision(text, text, text) TO anon, authenticated;