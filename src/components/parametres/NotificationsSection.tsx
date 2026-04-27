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

const alertLabels: Record<keyof AlertSettings, { label: string; description: string }> = {
  relance_client: { label: 'Relance client J+3', description: 'Alerte si un dossier reste en "Nouveau" après 3 jours' },
  chasse_30j: { label: 'Chasse > 30 jours', description: 'Alerte si un dossier est en chasse depuis plus de 30 jours' },
  compromis_rappel: { label: 'Rappels compromis', description: 'Alertes J-15 et J-7 avant signature acte' },
  acte_signe_facture: { label: 'Facture acte signé', description: 'Alerte quand un dossier passe en "Acte signé"' },
  pack_impaye: { label: 'Pack impayé', description: 'Alerte si un pack est impayé depuis plus de 5 jours' },
  commission_attente: { label: 'Commission en attente', description: 'Alerte si une commission est due depuis plus de 30 jours' },
  mandataire_inactif: { label: 'Mandataire inactif', description: 'Alerte si aucune activité depuis 60 jours' },
};


export default function NotificationsSection() {
  const { data: settings } = useCompanySettings();
  const updateMut = useUpdateCompanySettings();
  const { settings: alertSettings, toggle } = useAlertSettings();
  const [emailAlertes, setEmailAlertes] = useState('');
  const [frequence, setFrequence] = useState('hebdomadaire');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setEmailAlertes(settings.email_alertes_dirigeant || '');
      setFrequence(settings.frequence_rapport || 'hebdomadaire');
    }
  }, [settings]);

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    updateMut.mutate({
      section: 'notifications',
      updates: { email_alertes_dirigeant: emailAlertes, frequence_rapport: frequence } as any,
    });
    setConfirmOpen(false);
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Notifications & Alertes</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Email réception alertes dirigeant</Label><Input type="email" value={emailAlertes} onChange={e => setEmailAlertes(e.target.value)} placeholder="dirigeant@hunters.fr" /></div>
        <div className="space-y-2">
          <Label>Fréquence rapport automatique</Label>
          <Select value={frequence} onValueChange={setFrequence}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
              <SelectItem value="mensuel">Mensuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Activez ou désactivez chaque type d'alerte</p>
        {(Object.keys(alertLabels) as Array<keyof AlertSettings>).map((key) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{alertLabels[key].label}</p>
              <p className="text-xs text-muted-foreground">{alertLabels[key].description}</p>
            </div>
            <Switch checked={alertSettings[key]} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer</AlertDialogTitle><AlertDialogDescription>Les paramètres de notifications seront mis à jour.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

