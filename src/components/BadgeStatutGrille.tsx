type Props = { statut: string | null | undefined };

// Badge simple affiché aux mandataires dans l'onglet Stratégie.
// Ne révèle aucun détail de la grille — statut uniquement.
export function BadgeStatutGrille({ statut }: Props) {
  if (!statut) return null;

  const config: Record<string, { label: string; className: string }> = {
    valide: {
      label: "✓ Stratégie validée par l'analyste",
      className: 'bg-green-100 text-green-800 border border-green-300',
    },
    en_cours: {
      label: '⏳ Validation en cours',
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    },
    bloque: {
      label: '⚠ Rapport en cours de correction',
      className: 'bg-red-100 text-red-800 border border-red-300',
    },
  };

  const entry = config[statut];
  if (!entry) return null;

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${entry.className}`}>
      {entry.label}
    </div>
  );
}

export default BadgeStatutGrille;
