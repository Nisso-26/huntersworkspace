import { useState, useEffect, useCallback } from 'react';
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
  History, Plus, Trash2, Save, AlertTriangle, UserPlus, Copy, Check, HelpCircle,
  Briefcase, Landmark, FolderOpen, FileCheck,
} from 'lucide-react';
import {
  useCompanySettings, useUpdateCompanySettings,
  useHonorairesTranches, useSaveHonorairesTranches,
  useAuditLog, type CompanySettings, type HonorairesTranche,
} from '@/hooks/use-company-settings';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const VARIABLE_GROUPS: { label: string; icon: React.ElementType; color: string; vars: { key: string; desc: string }[] }[] = [
  {
    label: 'VARIABLES CLIENT',
    icon: User,
    color: 'text-blue-600 bg-blue-50',
    vars: [
      { key: '{{nom_client}}', desc: 'Nom et prénom du client' },
      { key: '{{email_client}}', desc: 'Email du client' },
      { key: '{{telephone_client}}', desc: 'Téléphone du client' },
      { key: '{{ville}}', desc: 'Ville du projet' },
      { key: '{{budget}}', desc: 'Budget formaté en €' },
      { key: '{{honoraires}}', desc: 'Honoraires du dossier' },
    ],
  },
  {
    label: 'VARIABLES MANDATAIRE',
    icon: Briefcase,
    color: 'text-emerald-600 bg-emerald-50',
    vars: [
      { key: '{{conseiller}}', desc: 'Nom du mandataire' },
      { key: '{{conseiller_email}}', desc: 'Email du mandataire' },
      { key: '{{conseiller_rsac}}', desc: 'Numéro RSAC' },
      { key: '{{conseiller_greffe}}', desc: 'Greffe d\'immatriculation' },
      { key: '{{conseiller_zone}}', desc: 'Zone prioritaire' },
      { key: '{{conseiller_niveau}}', desc: 'Niveau N1 ou N2' },
      { key: '{{conseiller_siret}}', desc: 'SIRET du mandataire' },
    ],
  },
  {
    label: 'VARIABLES CABINET',
    icon: Landmark,
    color: 'text-amber-600 bg-amber-50',
    vars: [
      { key: '{{cabinet_nom}}', desc: 'HUNTERS Immobilier' },
      { key: '{{cabinet_adresse}}', desc: 'Adresse du siège' },
      { key: '{{cabinet_siret}}', desc: 'SIRET HUNTERS' },
      { key: '{{carte_t}}', desc: 'Numéro carte professionnelle T' },
    ],
  },
  {
    label: 'VARIABLES DOSSIER',
    icon: FolderOpen,
    color: 'text-violet-600 bg-violet-50',
    vars: [
      { key: '{{numero_dossier}}', desc: 'Référence dossier automatique' },
      { key: '{{date}}', desc: 'Date du jour' },
      { key: '{{score_qualification}}', desc: 'Score client (0-10)' },
      { key: '{{niveau_client}}', desc: 'standard / complexe / expert' },
      { key: '{{tarif_conseil}}', desc: 'Tarif conseil calculé en €' },
      { key: '{{services_liste}}', desc: 'Liste des services souscrits' },
    ],
  },
  {
    label: 'VARIABLES CONTRACTUELLES',
    icon: FileCheck,
    color: 'text-rose-600 bg-rose-50',
    vars: [
      { key: '{{objectif_ca}}', desc: '20 000 € HT / trimestre' },
      { key: '{{objectif_mandats}}', desc: '2 mandats / trimestre' },
      { key: '{{objectif_conseil}}', desc: '1 rapport de conseil / mois' },
      { key: '{{pack_mensuel}}', desc: '149 € HT / mois' },
      { key: '{{seuil_n2}}', desc: '100 000 € CA HT cumulé' },
    ],
  },
];

function VariableHelpPanel() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text);
      toast.success(`Variable copiée : ${text}`);
      setTimeout(() => setCopied((prev) => (prev === text ? null : prev)), 2000);
    });
  }, []);

  return (
    <Card className="p-5 space-y-5 h-fit sticky top-4">
      <div className="flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-accent" />
        <h3 className="font-heading font-semibold text-sm">Variables disponibles</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Cliquez sur une variable pour la copier dans le presse-papiers et la coller dans vos modèles.
      </p>
      {VARIABLE_GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.label} className="space-y-2">
            <div className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide', group.color)}>
              <Icon className="w-3.5 h-3.5" />
              {group.label}
            </div>
            <div className="space-y-1">
              {group.vars.map((v) => (
                <button
                  key={v.key}
                  onClick={() => copy(v.key)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors text-left group"
                  title="Cliquer pour copier"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-xs font-mono text-primary whitespace-nowrap">{v.key}</code>
                    <span className="text-xs text-muted-foreground truncate">{v.desc}</span>
                  </div>
                  {copied === v.key ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

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
    <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Modèles de Documents</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Couleur primaire</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.couleur_primaire || '#004621'} onChange={e => set('couleur_primaire', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
              <Input value={form.couleur_primaire || '#004621'} onChange={e => set('couleur_primaire', e.target.value)} className="w-32" />
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

      <VariableHelpPanel />
    </div>
  );
}

