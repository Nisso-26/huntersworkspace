ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS site_lead_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS prospects_site_lead_id_key ON public.prospects (site_lead_id) WHERE site_lead_id IS NOT NULL;