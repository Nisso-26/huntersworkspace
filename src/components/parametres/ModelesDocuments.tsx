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

export default function ModelesDocuments() {
  const { data: settings } = useCompanySettings();
  const updateMut = useUpdateCompanySettings();
  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const set = (k: keyof CompanySettings, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    updateMut.mutate({
      section: 'modeles_documents',
      updates: {
        couleur_primaire: form.couleur_primaire,
        couleur_secondaire: form.couleur_secondaire,
        clause_mediation: form.clause_mediation,
        clause_rgpd: form.clause_rgpd,
        clause_retractation: form.clause_retractation,
        mentions_legales: form.mentions_legales,
        entete_document: form.entete_document,
        pied_page_document: form.pied_page_document,
      } as any,
    });
    setConfirmOpen(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Modèles de Documents</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Couleur primaire</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.couleur_primaire || '#1A4D2E'} onChange={e => set('couleur_primaire', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
            <Input value={form.couleur_primaire || '#1A4D2E'} onChange={e => set('couleur_primaire', e.target.value)} className="w-32" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Couleur secondaire</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.couleur_secondaire || '#D4A017'} onChange={e => set('couleur_secondaire', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
            <Input value={form.couleur_secondaire || '#D4A017'} onChange={e => set('couleur_secondaire', e.target.value)} className="w-32" />
          </div>
        </div>
      </div>

      <div className="space-y-2"><Label>En-tête documents</Label><Textarea rows={3} value={form.entete_document || ''} onChange={e => set('entete_document', e.target.value)} placeholder="Coordonnées, mentions carte T..." /></div>
      <div className="space-y-2"><Label>Pied de page documents</Label><Textarea rows={3} value={form.pied_page_document || ''} onChange={e => set('pied_page_document', e.target.value)} placeholder="RIB, mentions légales..." /></div>
      <div className="space-y-2"><Label>Mentions légales</Label><Textarea rows={4} value={form.mentions_legales || ''} onChange={e => set('mentions_legales', e.target.value)} /></div>
      <div className="space-y-2"><Label>Clause médiation</Label><Textarea rows={3} value={form.clause_mediation || ''} onChange={e => set('clause_mediation', e.target.value)} /></div>
      <div className="space-y-2"><Label>Clause RGPD</Label><Textarea rows={3} value={form.clause_rgpd || ''} onChange={e => set('clause_rgpd', e.target.value)} /></div>
      <div className="space-y-2"><Label>Clause rétractation</Label><Textarea rows={3} value={form.clause_retractation || ''} onChange={e => set('clause_retractation', e.target.value)} /></div>

      <Button onClick={handleSave} disabled={updateMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmer</AlertDialogTitle><AlertDialogDescription>Les modèles de documents seront mis à jour pour toutes les futures générations.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

