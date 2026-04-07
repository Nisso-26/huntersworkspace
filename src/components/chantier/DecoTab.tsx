import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAchat, useUpdateAchat, useDeleteAchat, type AchatDeco } from '@/hooks/use-chantiers';
import { Plus, Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUT_LABELS: Record<string, string> = {
  selectionne: 'Sélectionné',
  commande: 'Commandé',
  en_transit: 'En transit',
  livre: 'Livré',
  installe: 'Installé',
  retourne: 'Retourné',
  en_attente: 'En attente',
};

const STATUT_COLORS: Record<string, string> = {
  selectionne: 'bg-muted text-muted-foreground',
  commande: 'bg-hunters-info/10 text-hunters-info',
  en_transit: 'bg-hunters-warning/10 text-hunters-warning',
  livre: 'bg-hunters-success/10 text-hunters-success',
  installe: 'bg-primary/10 text-primary',
  retourne: 'bg-destructive/10 text-destructive',
  en_attente: 'bg-muted text-muted-foreground',
};

const PIECES = ['Salon', 'Chambre 1', 'Chambre 2', 'Chambre 3', 'Cuisine', 'Salle de bain', 'WC', 'Entrée', 'Bureau', 'Extérieur', 'Autre'];

interface Props {
  chantierId: string;
  achats: AchatDeco[];
}

export default function DecoTab({ chantierId, achats }: Props) {
  const createAchat = useCreateAchat();
  const updateAchat = useUpdateAchat();
  const deleteAchat = useDeleteAchat();

  const [newAchat, setNewAchat] = useState({
    designation: '',
    fournisseur: '',
    reference_produit: '',
    prix_unitaire: 0,
    quantite: 1,
    lien_produit: '',
    piece: '',
    date_commande: '',
    date_livraison_estimee: '',
  });

  const totalDeco = achats.reduce((s, a) => s + a.montant, 0);
  const now = new Date().toISOString().slice(0, 10);

  const isLate = (a: AchatDeco) =>
    a.date_livraison_estimee && !a.date_livraison_reelle &&
    a.date_livraison_estimee < now &&
    !['livre', 'installe', 'retourne'].includes(a.statut_livraison);

  const addAchat = () => {
    if (!newAchat.designation) return;
    const montant = newAchat.prix_unitaire * newAchat.quantite;
    createAchat.mutate({
      chantier_id: chantierId,
      ...newAchat,
      montant,
      statut_livraison: 'selectionne',
    } as any);
    setNewAchat({ designation: '', fournisseur: '', reference_produit: '', prix_unitaire: 0, quantite: 1, lien_produit: '', piece: '', date_commande: '', date_livraison_estimee: '' });
  };

  // Group by piece
  const byPiece = achats.reduce((acc, a) => {
    const p = a.piece || 'Non assigné';
    if (!acc[p]) acc[p] = [];
    acc[p].push(a);
    return acc;
  }, {} as Record<string, AchatDeco[]>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted border">
        <span className="text-sm text-muted-foreground">Budget déco total</span>
        <span className="text-sm font-bold">{totalDeco.toLocaleString('fr-FR')} €</span>
      </div>

      {/* Grouped by piece */}
      {Object.entries(byPiece).map(([piece, items]) => (
        <div key={piece} className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{piece} ({items.length})</h4>
          {items.map(a => (
            <div key={a.id} className={cn('flex items-center gap-3 p-3 rounded-lg border bg-background', isLate(a) && 'border-destructive/50')}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{a.designation}</p>
                  {isLate(a) && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.fournisseur || '—'} {a.reference_produit ? `· Réf: ${a.reference_produit}` : ''}
                  {' · '}{a.quantite}x {a.prix_unitaire.toLocaleString('fr-FR')} € = {a.montant.toLocaleString('fr-FR')} €
                </p>
                {a.date_livraison_estimee && (
                  <p className="text-[10px] text-muted-foreground">
                    Livraison estimée: {a.date_livraison_estimee}
                    {a.date_livraison_reelle && ` · Réelle: ${a.date_livraison_reelle}`}
                  </p>
                )}
              </div>
              <Select
                value={a.statut_livraison}
                onValueChange={v => {
                  const updates: any = { statut_livraison: v };
                  if (v === 'livre' && !a.date_livraison_reelle) {
                    updates.date_livraison_reelle = new Date().toISOString().slice(0, 10);
                  }
                  updateAchat.mutate({ id: a.id, ...updates });
                }}
              >
                <SelectTrigger className={cn('w-28 h-7 text-[10px]', STATUT_COLORS[a.statut_livraison])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {a.lien_produit && (
                <a href={a.lien_produit} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 text-accent" />
                </a>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAchat.mutate(a.id)}>
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ))}

      {achats.length === 0 && (
        <p className="text-sm text-center text-muted-foreground py-4">Aucun achat déco</p>
      )}

      {/* Add form */}
      <div className="p-4 rounded-lg border border-dashed space-y-3">
        <p className="text-sm font-semibold text-muted-foreground">Ajouter un achat déco</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input placeholder="Désignation *" value={newAchat.designation} onChange={e => setNewAchat(a => ({ ...a, designation: e.target.value }))} />
          <Input placeholder="Fournisseur" value={newAchat.fournisseur} onChange={e => setNewAchat(a => ({ ...a, fournisseur: e.target.value }))} />
          <Input placeholder="Réf. produit" value={newAchat.reference_produit} onChange={e => setNewAchat(a => ({ ...a, reference_produit: e.target.value }))} />
          <Input type="number" placeholder="Prix unitaire €" value={newAchat.prix_unitaire || ''} onChange={e => setNewAchat(a => ({ ...a, prix_unitaire: Number(e.target.value) || 0 }))} />
          <Input type="number" placeholder="Quantité" value={newAchat.quantite || ''} onChange={e => setNewAchat(a => ({ ...a, quantite: Number(e.target.value) || 1 }))} />
          <Select value={newAchat.piece} onValueChange={v => setNewAchat(a => ({ ...a, piece: v }))}>
            <SelectTrigger><SelectValue placeholder="Pièce" /></SelectTrigger>
            <SelectContent>
              {PIECES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Lien produit" value={newAchat.lien_produit} onChange={e => setNewAchat(a => ({ ...a, lien_produit: e.target.value }))} />
          <Input type="date" placeholder="Date livraison estimée" value={newAchat.date_livraison_estimee} onChange={e => setNewAchat(a => ({ ...a, date_livraison_estimee: e.target.value }))} />
        </div>
        <Button size="sm" onClick={addAchat} disabled={!newAchat.designation}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
      </div>
    </div>
  );
}
