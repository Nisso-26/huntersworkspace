ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS type_accompagnement text DEFAULT 'cle_en_main',
  ADD COLUMN IF NOT EXISTS services_souscrits jsonb DEFAULT '{"conseil":true,"chasse":true,"financement":true,"amo":true,"deco":true,"gestion_locative":false}'::jsonb;