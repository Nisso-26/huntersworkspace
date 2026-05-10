-- Conversion du champ strategie de TEXT vers JSONB
-- pour stocker la stratégie IA structurée

ALTER TABLE public.dossiers
  ALTER COLUMN strategie TYPE JSONB
  USING CASE
    WHEN strategie IS NULL THEN NULL
    WHEN strategie = '' THEN NULL
    WHEN strategie LIKE '{%' THEN strategie::jsonb
    ELSE jsonb_build_object('legacy', strategie)
  END;

-- Ajout des colonnes de suivi IA
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS strategie_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS strategie_version INTEGER DEFAULT 1;
