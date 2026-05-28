import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Network, Save } from 'lucide-react';
import {
  useCompanySettings, useUpdateCompanySettings, type CompanySettings,
} from '@/hooks/use-company-settings';
import { useAuth } from '@/contexts/AuthContext';

const COMMISSION_ROWS = [
  { label: 'Conseil patrimonial', n1: 'commission_conseil_n1', n2: 'commission_conseil_n2' },
  { label: 'Chasse immobilière', n1: 'commission_chasse_n1', n2: 'commission_chasse_n2' },
  { label: 'AMO travaux', n1: 'commission_amo_n1', n2: 'commission_amo_n2' },
  { label: 'Décoration', n1: 'commission_deco_n1', n2: 'commission_deco_n2' },
] as const;

const DEFAULTS: Record<string, number> = {
  commission_conseil_n1: 30, commission_conseil_n2: 40,
  commission_chasse_n1: 55, commission_chasse_n2: 60,
  commission_amo_n1: 20, commission_amo_n2: 25,
  commission_deco_n1: 15, commission_deco_n2: 20,
  seuil_passage_n2: 100000,
};

export default function ModeleEconomique() {
  const { isAdmin } = useAuth();
  const { data: settings } = useCompanySettings();
  const updateMut = useUpdateCompanySettings();
  const [form, setForm] = useState<Partial<CompanySettings> & Record<string, any>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    updateMut.mutate({
      section: 'modele_economique',
      updates: {
        tarif_abonnement_defaut: form.tarif_abonnement_defaut ?? 149,
        delai_suspension_jours: form.delai_suspension_jours,
        tva_taux_defaut: form.tva_taux_defaut,
        remise_pack_pct: form.remise_pack_pct ?? 10,
        commission_conseil_n1: form.commission_conseil_n1,
        commission_conseil_n2: form.commission_conseil_n2,
        commission_chasse_n1: form.commission_chasse_n1,
        commission_chasse_n2: form.commission_chasse_n2,
        commission_amo_n1: form.commission_amo_n1,
        commission_amo_n2: form.commission_amo_n2,
        commission_deco_n1: form.commission_deco_n1,
        commission_deco_n2: form.commission_deco_n2,
        seuil_passage_n2: form.seuil_passage_n2,
      } as any,
    });
    setConfirmOpen(false);
  };

  const val = (k: string) => Number(form[k] ?? DEFAULTS[k] ?? 0);

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Modèle Économique Réseau</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tarif pack mensuel HT (€)</Label>
          <Input type="number" value={form.tarif_abonnement_defaut ?? 149} onChange={e => set('tarif_abonnement_defaut', Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">
            Exigible dès le 1er mois suivant la signature — sans franchise <strong>(Contrat V5)</strong>.
            TVA 20 % → <strong>{((Number(form.tarif_abonnement_defaut ?? 149)) * 1.2).toFixed(2)} € TTC</strong>.
          </p>
        </div>
        <div className="space-y-2"><Label>Délai suspension après impayé (jours)</Label><Input type="number" value={form.delai_suspension_jours ?? 5} onChange={e => set('delai_suspension_jours', Number(e.target.value))} /></div>
        <div className="space-y-2"><Label>TVA par défaut (%)</Label><Input type="number" step="0.1" value={form.tva_taux_defaut ?? 20} onChange={e => set('tva_taux_defaut', Number(e.target.value))} /></div>
        <div className="space-y-2">
          <Label>Remise pack clé en main (%)</Label>
          <Input type="number" step="0.5" min={0} max={100} disabled={!isAdmin}
            value={form.remise_pack_pct ?? 10}
            onChange={e => set('remise_pack_pct', Number(e.target.value))} />
          <p className="text-xs italic text-muted-foreground">
            S'applique sur chasse + AMO + déco uniquement. Le conseil patrimonial n'est jamais remisé, y compris en pack.
          </p>
        </div>
      </div>


      <div className="space-y-3 pt-4 border-t">
        <h3 className="font-heading font-semibold">Grille de commissionnement mandataires</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="w-32">N1</TableHead>
              <TableHead className="w-32">N2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMMISSION_ROWS.map(row => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell>
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" step="0.5" className="h-8 w-20" value={val(row.n1)} onChange={e => set(row.n1, Number(e.target.value))} />
                      <span className="text-xs">%</span>
                    </div>
                  ) : <span>{val(row.n1)}%</span>}
                </TableCell>
                <TableCell>
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <Input type="number" step="0.5" className="h-8 w-20" value={val(row.n2)} onChange={e => set(row.n2, Number(e.target.value))} />
                      <span className="text-xs">%</span>
                    </div>
                  ) : <span>{val(row.n2)}%</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Passage N2</strong> : automatique dès <strong>{Number(form.seuil_passage_n2 ?? 100000).toLocaleString('fr-FR')} €</strong> de CA HT cumulé encaissé par HUNTERS — non rétroactif.</p>
          <p>• <strong>Conseil patrimonial</strong> : facturé au tarif plein en toutes circonstances — aucune remise autorisée, y compris en pack clé en main.</p>
        </div>
      </div>

      {isAdmin && (
        <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer les modifications</AlertDialogTitle><AlertDialogDescription>Les paramètres économiques du réseau seront mis à jour.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
