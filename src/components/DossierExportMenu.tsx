import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Download, Loader2, FileText, FileSignature, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Dossier } from '@/hooks/use-dossiers';
import { exportDossierIntegral, exportFicheInterne, exportFicheClient } from '@/lib/export-dossier-pdf';

interface Props { dossier: Dossier }

export default function DossierExportMenu({ dossier }: Props) {
  const { user, role, isAdmin } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const conseillerNom = (user?.user_metadata as any)?.full_name || user?.email || 'Hunters Immobilier';
  const canSeeInterne = isAdmin || dossier.mandataire_id === user?.id;

  const run = async (type: 'integral' | 'interne' | 'client') => {
    setLoading(type);
    try {
      if (type === 'integral') await exportDossierIntegral(dossier, conseillerNom);
      else if (type === 'interne') await exportFicheInterne(dossier, conseillerNom);
      else await exportFicheClient(dossier);
      toast.success('Document généré');
    } catch (e: any) {
      toast.error(e.message || "Erreur d'export");
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          className="gap-2"
          style={{ backgroundColor: '#1A4D2E', color: 'white' }}
          disabled={!!loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Niveau d'extraction</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canSeeInterne && (
          <DropdownMenuItem onClick={() => run('integral')} disabled={!!loading}>
            <FileText className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span className="text-sm">Dossier intégral</span>
              <span className="text-[10px] text-muted-foreground">PDF complet · usage interne</span>
            </div>
          </DropdownMenuItem>
        )}
        {canSeeInterne && (
          <DropdownMenuItem onClick={() => run('interne')} disabled={!!loading}>
            <FileSignature className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span className="text-sm">Fiche interne</span>
              <span className="text-[10px] text-muted-foreground">Récap 2 pages · interne</span>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => run('client')} disabled={!!loading}>
          <Users className="w-4 h-4 mr-2" />
          <div className="flex flex-col">
            <span className="text-sm">Fiche client</span>
            <span className="text-[10px] text-muted-foreground">1 page · remise au client</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
