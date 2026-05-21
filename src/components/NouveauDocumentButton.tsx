import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FilePlus, FileText, Loader2 } from 'lucide-react';
import { useModelesDocuments, type ModeleDocument } from '@/hooks/use-modeles-documents';
import DocumentEditor from '@/components/DocumentEditor';
import type { Dossier } from '@/hooks/use-dossiers';

const CATEGORIE_LABELS: Record<string, string> = {
  proposition_commerciale: 'Proposition commerciale',
  fiche_rentabilite: 'Fiche de rentabilité',
  mandat_recherche: 'Mandat de recherche',
  compte_rendu: 'Compte-rendu',
  autre: 'Autre',
};

export default function NouveauDocumentButton({
  dossier,
  onGenerated,
}: {
  dossier: Dossier;
  onGenerated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ModeleDocument | null>(null);
  const { data: modeles = [], isLoading } = useModelesDocuments({ onlyActive: true });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 text-white gap-2"
      >
        <FilePlus className="w-4 h-4" />
        Nouveau document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir un modèle</DialogTitle>
            <DialogDescription>
              Sélectionnez un modèle à pré-remplir avec les données du dossier.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : modeles.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              Aucun modèle disponible. Demandez à un Directeur d'en créer dans Paramètres.
            </p>
          ) : (
            <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
              {modeles.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      setSelected(m);
                      setOpen(false);
                    }}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-md border hover:border-[#1A4D2E] hover:bg-[#E8F2EC] transition"
                  >
                    <FileText className="w-5 h-5 text-[#1A4D2E] mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{m.titre}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIE_LABELS[m.categorie] || m.categorie}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {selected && (
        <DocumentEditor
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          modele={selected}
          dossier={dossier}
          onGenerated={onGenerated}
        />
      )}
    </>
  );
}
