import { useMemo } from 'react';
import { useFactures } from '@/hooks/use-factures';
import { useDossiers } from '@/hooks/use-dossiers';
import { useBaremesHunters } from '@/hooks/use-baremes-hunters';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { compteursParService, niveauParService, seuilsN2, type Compteurs, type Niveaux } from '@/lib/niveau-service';

/** Compteurs encaissés de l'année en cours et niveau courant par service, par mandataire. */
export function useNiveauxServices(mandataireIds: string[]) {
  const { data: factures = [] } = useFactures();
  const { data: dossiers = [] } = useDossiers();
  const { data: baremes = [] } = useBaremesHunters();
  const { data: company } = useCompanySettings();
  return useMemo(() => {
    const seuils = seuilsN2(company as any);
    const dossMap = new Map(dossiers.map(d => [d.id, d as any]));
    const annee = new Date().getFullYear();
    const out = new Map<string, { compteurs: Compteurs; niveaux: Niveaux }>();
    for (const id of mandataireIds) {
      const compteurs = compteursParService(id, annee, factures as any, dossMap, baremes);
      out.set(id, { compteurs, niveaux: niveauParService(compteurs, seuils) });
    }
    return { parMandataire: out, seuils };
  }, [factures, dossiers, baremes, company, mandataireIds.join(',')]);
}
