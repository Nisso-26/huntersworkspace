DROP POLICY IF EXISTS "Partenaires readable by creator, assigned or admin" ON public.partenaires;

CREATE POLICY "Partenaires readable by authenticated"
  ON public.partenaires FOR SELECT
  TO authenticated
  USING (true);