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

export default function IdentiteSociete() {
  const { data: settings } = useCompanySettings();
  const updateMut = useUpdateCompanySettings();
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (k: keyof CompanySettings, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    const { id, ...updates } = form as any;
    updateMut.mutate({ section: 'identite_societe', updates });
    setConfirmOpen(false);
  };

  // Carte T expiration warning
  const carteExpDate = form.carte_t_expiration ? new Date(form.carte_t_expiration) : null;
  const now = new Date();
  const threeMonths = new Date(now.getTime() + 90 * 86400000);
  const carteExpiring = carteExpDate && carteExpDate <= threeMonths;

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Identité Société</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Raison sociale *</Label><Input value={form.raison_sociale || ''} onChange={e => set('raison_sociale', e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Forme juridique</Label>
          <Select value={form.forme_juridique || 'SAS'} onValueChange={v => set('forme_juridique', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SAS">SAS</SelectItem>
              <SelectItem value="SASU">SASU</SelectItem>
              <SelectItem value="SARL">SARL</SelectItem>
              <SelectItem value="EURL">EURL</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>SIRET *</Label><Input value={form.siret || ''} onChange={e => set('siret', e.target.value)} /></div>
        <div className="space-y-2"><Label>N° Carte T *</Label><Input value={form.carte_t_numero || ''} onChange={e => set('carte_t_numero', e.target.value)} /></div>
        <div className="space-y-2"><Label>Organisme délivrance carte T</Label><Input value={form.carte_t_organisme || ''} onChange={e => set('carte_t_organisme', e.target.value)} placeholder="Ex: CCI de Tours" /></div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Date expiration carte T
            {carteExpiring && <Badge variant="destructive" className="ml-1 text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Expire bientôt</Badge>}
          </Label>
          <Input type="date" value={form.carte_t_expiration || ''} onChange={e => set('carte_t_expiration', e.target.value)} />
        </div>
        <div className="space-y-2"><Label>Assureur RCP</Label><Input value={form.assureur_rcp || ''} onChange={e => set('assureur_rcp', e.target.value)} /></div>
        <div className="space-y-2"><Label>N° Police RCP</Label><Input value={form.assureur_police || ''} onChange={e => set('assureur_police', e.target.value)} /></div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2"><Label>Adresse siège</Label><Input value={form.adresse_siege || ''} onChange={e => set('adresse_siege', e.target.value)} /></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Téléphone</Label><Input value={form.telephone || ''} onChange={e => set('telephone', e.target.value)} /></div>
          <div className="space-y-2"><Label>Email contact</Label><Input type="email" value={form.email_contact || ''} onChange={e => set('email_contact', e.target.value)} /></div>
          <div className="space-y-2"><Label>Site web</Label><Input value={form.site_web || ''} onChange={e => set('site_web', e.target.value)} /></div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Capital social</Label><Input value={form.capital_social || ''} onChange={e => set('capital_social', e.target.value)} placeholder="Ex: 1 000 €" /></div>
          <div className="space-y-2"><Label>RCS</Label><Input value={form.rcs || ''} onChange={e => set('rcs', e.target.value)} placeholder="Ex: Tours B 123 456 789" /></div>
          <div className="space-y-2"><Label>N° TVA Intracommunautaire</Label><Input value={form.numero_tva_intra || ''} onChange={e => set('numero_tva_intra', e.target.value)} placeholder="FR12 123456789" /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>IBAN</Label><Input value={form.iban || ''} onChange={e => set('iban', e.target.value)} placeholder="FR76 ..." /></div>
          <div className="space-y-2"><Label>BIC</Label><Input value={form.bic || ''} onChange={e => set('bic', e.target.value)} /></div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Logo entreprise (PNG/JPG, max 1 Mo)</Label>
          <div className="flex items-center gap-4">
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded border bg-white p-1" />
            )}
            <Input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) { toast.error('Fichier > 1 Mo'); return; }
                const ext = file.name.split('.').pop();
                const path = `logo-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true });
                if (upErr) { toast.error(upErr.message); return; }
                const { data: pub } = supabase.storage.from('company-assets').getPublicUrl(path);
                set('logo_url', pub.publicUrl);
                toast.success('Logo téléversé — pensez à enregistrer');
              }}
            />
            {form.logo_url && (
              <Button variant="ghost" size="sm" onClick={() => set('logo_url', null)}>Retirer</Button>
            )}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="w-4 h-4 mr-2" />{updateMut.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer les modifications</AlertDialogTitle>
            <AlertDialogDescription>Les informations de la société seront mises à jour et utilisées dans tous les documents générés.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

