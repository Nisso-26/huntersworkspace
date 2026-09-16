-- 1. Renommage du sous-statut : une correction mandataire repasse en attente de validation partenaire
ALTER TABLE public.dossiers DROP CONSTRAINT IF EXISTS dossiers_sous_statut_valide;

UPDATE public.dossiers
SET sous_statut = 'corrige_en_attente_validation'
WHERE sous_statut = 'corrige_auto_valide';

ALTER TABLE public.dossiers ADD CONSTRAINT dossiers_sous_statut_valide CHECK (
  sous_statut IS NULL
  OR (sous_statut IN ('gagne','perdu') AND status = 'cloture')
  OR sous_statut IN ('en_attente_partenaire','valide_quitus','invalide_motive','corrige_en_attente_validation','conteste_escalade')
);

-- 2. Suivi de la relance J+7 sur les accès partenaire (pas de renouvellement automatique)
ALTER TABLE public.acces_portail ADD COLUMN IF NOT EXISTS date_relance timestamptz;