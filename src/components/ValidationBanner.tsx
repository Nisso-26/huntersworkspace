import { AlertTriangle, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useValidationDossier } from '@/hooks/use-validations-dossiers';

export default function ValidationBanner({ dossierId }: { dossierId: string }) {
  const { data: validation } = useValidationDossier(dossierId);
  if (!validation) return null;

  if (validation.statut === 'en_attente') {
    return (
      <Card className="p-4 border-l-4 border-l-[#F5A800] bg-[#F5A800]/5 flex items-start gap-3">
        <Clock className="w-5 h-5 text-[#F5A800] mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">En attente de validation directeur</p>
          <p className="text-sm text-muted-foreground">
            Ce dossier Expert nécessite l'approbation d'un directeur avant la génération du devis.
          </p>
        </div>
      </Card>
    );
  }

  if (validation.statut === 'refuse') {
    return (
      <Card className="p-4 border-l-4 border-l-destructive bg-destructive/5 flex items-start gap-3">
        <XCircle className="w-5 h-5 text-destructive mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Dossier refusé par le directeur</p>
          {validation.motif && <p className="text-sm text-muted-foreground mt-1">Motif : {validation.motif}</p>}
        </div>
      </Card>
    );
  }

  if (validation.statut === 'infos_demandees') {
    return (
      <Card className="p-4 border-l-4 border-l-[#F5A800] bg-[#F5A800]/5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#F5A800] mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Informations complémentaires demandées</p>
          {validation.motif && <p className="text-sm text-muted-foreground mt-1">{validation.motif}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            Mettez à jour le dossier puis enregistrez — la demande sera renvoyée pour validation.
          </p>
        </div>
      </Card>
    );
  }

  if (validation.statut === 'valide') {
    return (
      <Card className="p-3 border-l-4 border-l-hunters-success bg-hunters-success/5 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-hunters-success" />
        <p className="text-sm text-foreground">
          Dossier validé par le directeur le {new Date(validation.updated_at).toLocaleDateString('fr-FR')}.
        </p>
      </Card>
    );
  }
  return null;
}
