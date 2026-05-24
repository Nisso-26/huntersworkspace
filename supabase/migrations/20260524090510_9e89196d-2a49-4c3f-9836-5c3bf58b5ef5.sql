CREATE TABLE IF NOT EXISTS public.baremes_hunters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL CHECK (service IN ('conseil','chasse','amo','deco')),
  tranche_min numeric NOT NULL DEFAULT 0,
  tranche_max numeric,
  type text NOT NULL DEFAULT 'forfait' CHECK (type IN ('forfait','pourcentage')),
  valeur numeric NOT NULL DEFAULT 0,
  valeur_fixe numeric NOT NULL DEFAULT 0,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.baremes_hunters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read baremes_hunters"
  ON public.baremes_hunters FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage baremes_hunters"
  ON public.baremes_hunters FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER baremes_hunters_updated_at
  BEFORE UPDATE ON public.baremes_hunters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_baremes_hunters_service ON public.baremes_hunters(service, ordre);

-- Pre-fill defaults
INSERT INTO public.baremes_hunters (service, tranche_min, tranche_max, type, valeur, valeur_fixe, ordre) VALUES
  ('conseil', 0, 2, 'forfait', 1500, 0, 1),
  ('conseil', 3, 5, 'forfait', 2500, 0, 2),
  ('conseil', 6, NULL, 'forfait', 3500, 0, 3),
  ('chasse', 0, 100000, 'forfait', 0, 0, 1),
  ('chasse', 100001, 200000, 'forfait', 6500, 0, 2),
  ('chasse', 200001, 500000, 'pourcentage', 4, 0, 3),
  ('chasse', 500001, 1000000, 'pourcentage', 3, 0, 4),
  ('chasse', 1000000, NULL, 'pourcentage', 2, 0, 5),
  ('amo', 0, 50000, 'pourcentage', 10, 2000, 1),
  ('amo', 50001, 150000, 'pourcentage', 8, 2000, 2),
  ('amo', 150000, NULL, 'pourcentage', 6, 2000, 3),
  ('deco', 0, 20000, 'pourcentage', 15, 2500, 1),
  ('deco', 20001, 50000, 'pourcentage', 12, 2500, 2),
  ('deco', 50000, NULL, 'pourcentage', 10, 2500, 3);