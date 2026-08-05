import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FilePlus, Loader2, Search } from 'lucide-react';
import { useModelesDocuments, type ModeleDocument } from '@/hooks/use-modeles-documents';
import DocumentEditor from '@/components/DocumentEditor';
import type { Dossier } from '@/hooks/use-dossiers';
import { supabase } from '@/integrations/supabase/client';

const CATEGORIE_LABELS: Record<string, string> = {
  proposition_commerciale: 'Proposition commerciale',
  fiche_rentabilite: 'Fiche de rentabilité',
  mandat_recherche: 'Mandat de recherche',
  convention_honoraires: "Convention d'honoraires",
  lettre_mission_amo: 'Lettre de mission AMO',
  lettre_mission_deco: 'Lettre de mission Décoration',
  contrat_pack: 'Contrat Pack clé en main',
  compte_rendu: 'Compte-rendu',
  autre: 'Autre',
};

const CATEGORIE_ICONS: Record<string, string> = {
  mandat_recherche: '📋',
  convention_honoraires: '💼',
  lettre_mission_amo: '🏗️',
  lettre_mission_deco: '🎨',
  contrat_pack: '✨',
  proposition_commerciale: '📊',
  fiche_rentabilite: '📈',
  compte_rendu: '📝',
  autre: '📄',
};

const CATEGORIE_DESCRIPTIONS: Record<string, string> = {
  mandat_recherche: "Mandat confiant à HUNTERS la recherche d'un bien immobilier.",
  convention_honoraires: "Convention fixant les honoraires de conseil patrimonial.",
  lettre_mission_amo: "Mission d'assistance à maîtrise d'ouvrage pour les travaux.",
  lettre_mission_deco: "Mission de décoration et d'ameublement du bien.",
  contrat_pack: "Contrat Pack clé en main avec remise globale de 10 %.",
  proposition_commerciale: "Proposition chiffrée des prestations HUNTERS.",
  fiche_rentabilite: "Synthèse de rentabilité prévisionnelle du bien.",
  compte_rendu: "Compte-rendu de visite et analyse financière du bien.",
  autre: "Document personnalisé.",
};

const CATEGORIE_ORDER: string[] = [
  'Proposition commerciale',
  "Convention d'honoraires",
  'Contrat Pack clé en main',
  'Mandat de recherche',
  'Lettre de mission AMO',
  'Lettre de mission Décoration',
  'Fiche de rentabilité',
  'Compte-rendu',
  'Autre',
];

export default function NouveauDocumentButton({
  dossier,
  onGenerated,
}: {
  dossier: Dossier;
  onGenerated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ModeleDocument | null>(null);
  const [search, setSearch] = useState('');
  const [usage, setUsage] = useState<Record<string, number>>({});
  const { data: modeles = [], isLoading } = useModelesDocuments({ onlyActive: true });

  // Charger les compteurs d'utilisation (nombre de documents générés par modèle)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from('documents_generiques')
        .select('modele_id');
      if (error || !data) return;
      const counts: Record<string, number> = {};
      data.forEach((r: any) => {
        if (r.modele_id) counts[r.modele_id] = (counts[r.modele_id] || 0) + 1;
      });
      setUsage(counts);
    })();
  }, [open]);

  // Filtrage par recherche + tri par usage (desc)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? modeles.filter(
          (m) =>
            m.titre.toLowerCase().includes(q) ||
            (CATEGORIE_LABELS[m.categorie] || m.categorie).toLowerCase().includes(q),
        )
      : modeles;
    return [...list].sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0));
  }, [modeles, search, usage]);

  const grouped = filtered.reduce((acc, m) => {
    const cat = CATEGORIE_LABELS[m.categorie] || m.categorie;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, ModeleDocument[]>);
  const cats = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORIE_ORDER.indexOf(a);
    const ib = CATEGORIE_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const showSearch = modeles.length > 5;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-[#004621] hover:bg-[#004621]/90 text-white gap-2"
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
            <>
              {showSearch && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un modèle…"
                    className="pl-9 h-10"
                  />
                </div>
              )}

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {cats.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">
                    Aucun modèle ne correspond à votre recherche.
                  </p>
                ) : (
                  cats.map((cat) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#004621]">
                          {cat}
                        </span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[10px] text-muted-foreground">
                          {grouped[cat].length}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {grouped[cat].map((m) => {
                          const icon = CATEGORIE_ICONS[m.categorie] || '📄';
                          const desc = CATEGORIE_DESCRIPTIONS[m.categorie] || '';
                          const count = usage[m.id] || 0;
                          return (
                            <li key={m.id}>
                              <button
                                onClick={() => {
                                  setSelected(m);
                                  setOpen(false);
                                }}
                                className="w-full text-left flex items-start gap-3 p-3 rounded-md border hover:border-[#004621] hover:bg-[#E8F2EC] transition"
                              >
                                <span className="text-2xl leading-none mt-0.5 shrink-0" aria-hidden>
                                  {icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-sm text-foreground truncate">
                                      {m.titre}
                                    </p>
                                    {count > 0 && (
                                      <span className="text-[10px] text-[#004621] bg-[#E8F2EC] px-1.5 py-0.5 rounded shrink-0">
                                        {count} utilisé{count > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                  {desc && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                                  )}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </>
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
