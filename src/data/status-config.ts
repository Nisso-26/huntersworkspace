export const statusLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  conseil: 'Conseil',
  chasse: 'Chasse',
  visite: 'Visites',
  offre: 'Offre',
  compromis: 'Compromis',
  signe: 'Signé',
  cloture: 'Clôturé',
};

export const statusColors: Record<string, string> = {
  nouveau: 'bg-muted text-muted-foreground',
  conseil: 'bg-hunters-info/10 text-hunters-info',
  chasse: 'bg-hunters-warning/10 text-hunters-warning',
  visite: 'bg-accent/10 text-accent',
  offre: 'bg-accent/20 text-accent-foreground',
  compromis: 'bg-hunters-success/10 text-hunters-success',
  signe: 'bg-hunters-success/20 text-hunters-success',
  cloture: 'bg-muted text-muted-foreground',
};
