CREATE INDEX IF NOT EXISTS idx_dossiers_mandataire
  ON public.dossiers(mandataire_id);

CREATE INDEX IF NOT EXISTS idx_dossiers_status
  ON public.dossiers(status);

CREATE INDEX IF NOT EXISTS idx_dossiers_mandataire_status
  ON public.dossiers(mandataire_id, status);

CREATE INDEX IF NOT EXISTS idx_factures_mandataire
  ON public.factures(mandataire_id);

CREATE INDEX IF NOT EXISTS idx_factures_statut
  ON public.factures(statut);

CREATE INDEX IF NOT EXISTS idx_objectifs_mandataire
  ON public.objectifs_trimestriels(mandataire_id, annee, trimestre);

CREATE INDEX IF NOT EXISTS idx_conseils_mensuels_mandataire
  ON public.conseils_mensuels(mandataire_id, annee, mois);

CREATE INDEX IF NOT EXISTS idx_prospects_mandataire
  ON public.prospects(mandataire_id);

CREATE INDEX IF NOT EXISTS idx_alertes_user_id
  ON public.alertes(user_id);

CREATE INDEX IF NOT EXISTS idx_commissions_mandataire
  ON public.commissions(mandataire_id);