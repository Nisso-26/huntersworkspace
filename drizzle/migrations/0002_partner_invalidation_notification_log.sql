ALTER TABLE public.log_acces_portail
  DROP CONSTRAINT IF EXISTS log_acces_portail_evenement_check;

ALTER TABLE public.log_acces_portail
  ADD CONSTRAINT log_acces_portail_evenement_check
  CHECK (evenement = ANY (ARRAY[
    'ouverture'::text,
    'consultation'::text,
    'decision'::text,
    'revocation'::text,
    'notification_invalidation'::text
  ]));

CREATE UNIQUE INDEX IF NOT EXISTS log_acces_portail_notification_invalidation_unique
  ON public.log_acces_portail (acces_portail_id)
  WHERE evenement = 'notification_invalidation';