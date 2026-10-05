import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Home, Plus, Trash2 } from 'lucide-react';
import FicheBienDialog from './FicheBienDialog';
import {
  useFichesBiens, useDeleteFicheBien, TYPE_PROJET_LABELS, STATUT_FICHE_LABELS, type FicheBien,
} from '@/hooks/use-fiches-biens';

export default function FichesBiensSection({ dossier }: { dossier: any }) {
  const { data: fiches = [], isLoading } = useFichesBiens(dossier.id);
  const del = useDeleteFicheBien();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FicheBien | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Fiches biens</h3>
        <Button size="sm" className="gap-2" onClick={() => { setSelected(null); setOpen(true); }}>
          <Plus className="h-4 w-4" />Nouvelle fiche
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : fiches.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune fiche pour ce dossier.</p>
      ) : (
        <div className="divide-y border">
          {fiches.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setSelected(f); setOpen(true); }}>
                <div className="h-14 w-20 shrink-0 bg-muted">
                  {f.cover_url ? <img src={f.cover_url} alt="" className="h-full w-full object-cover" /> : <Home className="m-auto mt-4 h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.titre || 'Fiche sans titre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.prix_affiche ? `${Number(f.prix_affiche).toLocaleString('fr-FR')} €` : 'Prix non renseigné'}
                    {' · '}{TYPE_PROJET_LABELS[f.type_projet]}
                    {' · '}{new Date(f.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </button>
              <div className="text-right">
                <span className="border px-2 py-0.5 text-[11px]">{STATUT_FICHE_LABELS[f.statut]}</span>
                {(f as any).envoyee_at && <p className="mt-1 text-[11px] text-muted-foreground">Envoyée le {new Date((f as any).envoyee_at).toLocaleDateString('fr-FR')}</p>}
                {(f as any).derniere_consultation_at && <p className="text-[11px] text-muted-foreground">Consultée le {new Date((f as any).derniere_consultation_at).toLocaleDateString('fr-FR')}</p>}
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" aria-label="Supprimer la fiche"
                onClick={() => confirm('Supprimer cette fiche ?') && del.mutate({ id: f.id, dossier_id: f.dossier_id })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <FicheBienDialog open={open} onOpenChange={setOpen} dossier={dossier} fiche={selected} />
    </div>
  );
}
