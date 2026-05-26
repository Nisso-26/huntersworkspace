import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User, Lock, MapPin, Shield, Bell, Building2, Receipt, Network, FileText,
  History, Plus, Trash2, Save, AlertTriangle, UserPlus,
} from 'lucide-react';
import {
  useCompanySettings, useUpdateCompanySettings,
  useHonorairesTranches, useSaveHonorairesTranches,
  useAuditLog, type CompanySettings, type HonorairesTranche,
} from '@/hooks/use-company-settings';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ModeleEconomique() {
  const { data: settings } = useCompanySettings();
  const updateMut = useUpdateCompanySettings();
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k: keyof CompanySettings, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    updateMut.mutate({
      section: 'modele_economique',
      updates: {
        taux_commission_siege: form.taux_commission_siege,
        tarif_abonnement_defaut: form.tarif_abonnement_defaut,
        periode_essai_jours: form.periode_essai_jours,
        delai_suspension_jours: form.delai_suspension_jours,
        tva_taux_defaut: form.tva_taux_defaut,
      } as any,
    });
    setConfirmOpen(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Modèle Économique Réseau</h2>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Taux commission siège (%)</Label><Input type="number" step="0.5" value={form.taux_commission_siege ?? 40} onChange={e => set('taux_commission_siege', Number(e.target.value))} /></div>
        <div className="space-y-2">
          <Label>Tarif pack mensuel HT (€)</Label>
          <Input type="number" value={form.tarif_abonnement_defaut ?? 149} onChange={e => set('tarif_abonnement_defaut', Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">Exigible dès le 1er mois suivant la signature — sans franchise. TVA 20 % → <strong>{((Number(form.tarif_abonnement_defaut ?? 149)) * 1.2).toFixed(2)} € TTC</strong>.</p>
        </div>
        <div className="space-y-2"><Label>Période d'essai (jours)</Label><Input type="number" value={form.periode_essai_jours ?? 30} onChange={e => set('periode_essai_jours', Number(e.target.value))} /></div>
        <div className="space-y-2"><Label>Délai suspension après impayé (jours)</Label><Input type="number" value={form.delai_suspension_jours ?? 5} onChange={e => set('delai_suspension_jours', Number(e.target.value))} /></div>
        <div className="space-y-2"><Label>TVA par défaut (%)</Label><Input type="number" step="0.1" value={form.tva_taux_defaut ?? 20} onChange={e => set('tva_taux_defaut', Number(e.target.value))} /></div>
      </div>
      <p className="text-xs text-muted-foreground">💡 Le taux personnalisé par mandataire peut être défini dans la fiche mandataire.</p>

      <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer les modifications</AlertDialogTitle><AlertDialogDescription>Les paramètres économiques du réseau seront mis à jour.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

