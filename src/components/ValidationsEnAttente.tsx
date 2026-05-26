import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShieldCheck, AlertTriangle, Check, X, MessageSquare, ExternalLink } from 'lucide-react';
import { useValidationsEnAttente, useDecideValidation, type ValidationDossier } from '@/hooks/use-validations-dossiers';

type Action = 'valide' | 'refuse' | 'infos_demandees';
const ACTION_LABEL: Record<Action, string> = {
  valide: 'Valider',
  refuse: 'Refuser',
  infos_demandees: 'Demander des infos',
};

export default function ValidationsEnAttente() {
  const { data: items = [], isLoading } = useValidationsEnAttente();
  const decideMut = useDecideValidation();
  const [active, setActive] = useState<{ v: ValidationDossier; action: Action } | null>(null);
  const [motif, setMotif] = useState('');

  const openMotif = (v: ValidationDossier, action: Action) => {
    setActive({ v, action });
    setMotif('');
  };

  const onValidate = async (v: ValidationDossier) => {
    await decideMut.mutateAsync({ id: v.id, statut: 'valide' });
  };

  const submitMotif = async () => {
    if (!active) return;
    if (!motif.trim()) return;
    await decideMut.mutateAsync({ id: active.v.id, statut: active.action, motif: motif.trim() });
    setActive(null);
  };

  if (isLoading) return null;

  return (
    <Card className="p-5 border-l-4 border-l-destructive">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-destructive" />
          <h2 className="font-heading font-bold text-foreground">Dossiers en attente de validation</h2>
          {items.length > 0 && (
            <Badge variant="destructive" className="ml-1">{items.length}</Badge>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun dossier en attente de validation directeur.</p>
      ) : (
        <div className="space-y-3">
          {items.map(v => (
            <div key={v.id} className="border rounded-lg p-4 bg-card">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/dossiers/${v.dossier_id}`} className="font-semibold text-foreground hover:text-primary inline-flex items-center gap-1">
                      {v.client_name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    {v.numero_dossier && (
                      <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded">{v.numero_dossier}</span>
                    )}
                    <Badge className="bg-[#F5A800] text-primary hover:bg-[#F5A800]">{v.niveau_qualification || 'Expert'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Score : <strong className="text-foreground">{v.score_qualification ?? '—'}</strong></span>
                    <span>·</span>
                    <span>Conseiller : <strong className="text-foreground">{v.mandataire_name || 'Non assigné'}</strong></span>
                    <span>·</span>
                    <span>Tarif conseil : <strong className="text-foreground">{Number(v.tarif_conseil_ht || 0).toLocaleString('fr-FR')} € HT</strong></span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    En attente depuis {new Date(v.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openMotif(v, 'infos_demandees')}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Infos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => openMotif(v, 'refuse')}
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />Refuser
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90"
                    onClick={() => onValidate(v)}
                    disabled={decideMut.isPending}
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />Valider
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => { if (!o) setActive(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F5A800]" />
              {active ? ACTION_LABEL[active.action] : ''} — {active?.v.client_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif <span className="text-destructive">*</span></Label>
            <Textarea
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder={active?.action === 'refuse' ? 'Raison du refus...' : 'Informations nécessaires...'}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Le mandataire recevra une notification avec ce motif et l'événement sera journalisé.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Annuler</Button>
            <Button onClick={submitMotif} disabled={!motif.trim() || decideMut.isPending}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function ValidationsCounter() {
  const { data: items = [] } = useValidationsEnAttente();
  return items.length;
}
