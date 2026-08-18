ALTER TABLE public.dossiers ADD COLUMN IF NOT EXISTS sous_statut text;

ALTER TABLE public.dossiers
  ADD CONSTRAINT dossiers_sous_statut_valide
  CHECK (
    sous_statut IS NULL
    OR (sous_statut IN ('gagne', 'perdu') AND status = 'cloture')
  );