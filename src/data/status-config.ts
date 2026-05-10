export const statusLabels: Record<string, string> = {
  nouveau: 'Nouveau',
  conseil: 'En conseil',
  chasse: 'En chasse',
  visite: 'Visites',
  offre: 'Offre déposée',
  compromis: 'Compromis signé',
  signe: 'Acte signé',
  cloture: 'Clôturé',
  en_recherche: 'En recherche',
  identifie: 'Identifié',
  offre_faite: 'Offre faite',
  acte: 'Acté',
  en_travaux: 'En travaux',
  loue: 'Loué',
  vendu: 'Vendu',
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
  en_recherche: 'bg-muted text-muted-foreground',
  identifie: 'bg-hunters-info/10 text-hunters-info',
  offre_faite: 'bg-accent/10 text-accent',
  acte: 'bg-hunters-success/20 text-hunters-success',
  en_travaux: 'bg-hunters-warning/10 text-hunters-warning',
  loue: 'bg-hunters-success/10 text-hunters-success',
  vendu: 'bg-muted text-muted-foreground',
};

export const pipelineStatuses = ['nouveau', 'conseil', 'chasse', 'visite', 'offre', 'compromis', 'signe', 'cloture'] as const;

export const columnColors: Record<string, string> = {
  nouveau: 'border-t-muted-foreground',
  conseil: 'border-t-hunters-info',
  chasse: 'border-t-hunters-warning',
  visite: 'border-t-accent',
  offre: 'border-t-accent',
  compromis: 'border-t-hunters-success',
  signe: 'border-t-hunters-success',
  cloture: 'border-t-muted-foreground',
};
