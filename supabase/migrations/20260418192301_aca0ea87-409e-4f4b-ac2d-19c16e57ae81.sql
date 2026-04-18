ALTER TABLE public.company_settings 
  ADD COLUMN IF NOT EXISTS iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bic text DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero_tva_intra text DEFAULT '',
  ADD COLUMN IF NOT EXISTS capital_social text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rcs text DEFAULT '';