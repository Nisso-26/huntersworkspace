-- Add column
ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS numero_dossier text;

-- Counter table per year
CREATE TABLE IF NOT EXISTS public.dossier_counters (
  year int PRIMARY KEY,
  last_number int NOT NULL DEFAULT 0
);

ALTER TABLE public.dossier_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read counters" ON public.dossier_counters
  FOR SELECT TO authenticated USING (true);

-- Function to generate next numero_dossier
CREATE OR REPLACE FUNCTION public.generate_numero_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year int;
  next_num int;
BEGIN
  IF NEW.numero_dossier IS NOT NULL AND NEW.numero_dossier <> '' THEN
    RETURN NEW;
  END IF;
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, now()))::int;

  INSERT INTO public.dossier_counters (year, last_number)
    VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.dossier_counters.last_number + 1
  RETURNING last_number INTO next_num;

  NEW.numero_dossier := 'DOS-' || current_year || '-' || LPAD(next_num::text, 3, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_numero_dossier ON public.dossiers;
CREATE TRIGGER trg_generate_numero_dossier
BEFORE INSERT ON public.dossiers
FOR EACH ROW EXECUTE FUNCTION public.generate_numero_dossier();

-- Backfill existing dossiers
DO $$
DECLARE
  rec RECORD;
  current_year int := -1;
  counter int := 0;
  rec_year int;
BEGIN
  FOR rec IN SELECT id, created_at FROM public.dossiers WHERE numero_dossier IS NULL OR numero_dossier = '' ORDER BY created_at ASC, id ASC LOOP
    rec_year := EXTRACT(YEAR FROM rec.created_at)::int;
    IF rec_year <> current_year THEN
      current_year := rec_year;
      SELECT COALESCE(last_number, 0) INTO counter FROM public.dossier_counters WHERE year = current_year;
      IF counter IS NULL THEN counter := 0; END IF;
    END IF;
    counter := counter + 1;
    UPDATE public.dossiers SET numero_dossier = 'DOS-' || current_year || '-' || LPAD(counter::text, 3, '0') WHERE id = rec.id;
    INSERT INTO public.dossier_counters (year, last_number) VALUES (current_year, counter)
      ON CONFLICT (year) DO UPDATE SET last_number = GREATEST(public.dossier_counters.last_number, EXCLUDED.last_number);
  END LOOP;
END $$;

-- Unique constraint after backfill
ALTER TABLE public.dossiers ADD CONSTRAINT dossiers_numero_dossier_unique UNIQUE (numero_dossier);