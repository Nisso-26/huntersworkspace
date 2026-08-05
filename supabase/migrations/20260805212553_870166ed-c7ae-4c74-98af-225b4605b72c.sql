CREATE TABLE public.signatures_electroniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE CASCADE,
  mandataire_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signataire_nom text NOT NULL,
  signataire_email text NOT NULL,
  type_document text NOT NULL CHECK (type_document IN ('convention_cadre','bon_commande','mandat_recherche','contrat_mandataire','offre_achat')),
  document_url text,
  document_nom text,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','signe','expire','refuse')),
  signature_data text,
  signature_type text CHECK (signature_type IN ('dessinee','tapee')),
  ip_address text,
  user_agent text,
  motif_refus text,
  relance_envoyee_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  signed_at timestamptz,
  document_signe_url text
);

CREATE INDEX idx_signatures_token ON public.signatures_electroniques(token);
CREATE INDEX idx_signatures_dossier ON public.signatures_electroniques(dossier_id);
CREATE INDEX idx_signatures_statut ON public.signatures_electroniques(statut);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signatures_electroniques TO authenticated;
GRANT ALL ON public.signatures_electroniques TO service_role;

ALTER TABLE public.signatures_electroniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can read signatures"
ON public.signatures_electroniques FOR SELECT TO authenticated
USING (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owner or admin can create signatures"
ON public.signatures_electroniques FOR INSERT TO authenticated
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owner or admin can update signatures"
ON public.signatures_electroniques FOR UPDATE TO authenticated
USING (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owner or admin can delete signatures"
ON public.signatures_electroniques FOR DELETE TO authenticated
USING (mandataire_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_signatures_updated_at
BEFORE UPDATE ON public.signatures_electroniques
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.advance_dossier_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'signe' AND COALESCE(OLD.statut, '') <> 'signe'
     AND NEW.dossier_id IS NOT NULL
     AND NEW.type_document = 'mandat_recherche' THEN
    UPDATE public.dossiers
    SET status = 'signe', updated_at = now()
    WHERE id = NEW.dossier_id
      AND status NOT IN ('signe','cloture');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_advance_dossier_on_signature
AFTER UPDATE ON public.signatures_electroniques
FOR EACH ROW EXECUTE FUNCTION public.advance_dossier_on_signature();