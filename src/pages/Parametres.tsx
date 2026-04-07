import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  User, Lock, MapPin, Shield, Bell, Building2, Receipt, Network, FileText, History, Plus, Trash2, Save, AlertTriangle,
} from 'lucide-react';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';
import {
  useCompanySettings, useUpdateCompanySettings,
  useHonorairesTranches, useSaveHonorairesTranches,
  useAuditLog, type CompanySettings, type HonorairesTranche,
} from '@/hooks/use-company-settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const alertLabels: Record<keyof AlertSettings, { label: string; description: string }> = {
  relance_client: { label: 'Relance client J+3', description: 'Alerte si un dossier reste en "Nouveau" après 3 jours' },
  chasse_30j: { label: 'Chasse > 30 jours', description: 'Alerte si un dossier est en chasse depuis plus de 30 jours' },
  compromis_rappel: { label: 'Rappels compromis', description: 'Alertes J-15 et J-7 avant signature acte' },
  acte_signe_facture: { label: 'Facture acte signé', description: 'Alerte quand un dossier passe en "Acte signé"' },
  pack_impaye: { label: 'Pack impayé', description: 'Alerte si un pack est impayé depuis plus de 5 jours' },
  commission_attente: { label: 'Commission en attente', description: 'Alerte si une commission est due depuis plus de 30 jours' },
  mandataire_inactif: { label: 'Mandataire inactif', description: 'Alerte si aucune activité depuis 60 jours' },
};

function ProfileSection() {
  const { user, role } = useAuth();
  const [fullName, setFullName] = useState('');
  const [zone, setZone] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.user_metadata?.full_name || '');
    supabase.from('profiles').select('zone').eq('id', user.id).single().then(({ data }) => {
      if (data) setZone(data.zone || '');
    });
  }, [user]);

  const updateProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (!authErr) {
      await supabase.from('profiles').update({ full_name: fullName, zone, updated_at: new Date().toISOString() } as any).eq('id', user.id);
    }
    setSaving(false);
    if (authErr) toast.error(authErr.message);
    else toast.success('Profil mis à jour');
  };

  const changePassword = async () => {
    if (newPassword.length < 6) { toast.error('6 caractères minimum'); return; }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPwd(false);
    if (error) toast.error(error.message);
    else { toast.success('Mot de passe mis à jour'); setNewPassword(''); }
  };

  const roleLabelsMap: Record<string, string> = {
    super_admin: 'Super Admin', mandataire: 'Mandataire', decoratrice: 'Décoratrice',
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Profil</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nom complet</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ''} disabled className="opacity-70" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zone</Label><Input value={zone} onChange={e => setZone(e.target.value)} placeholder="Ex: Paris, Lyon..." /></div>
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-secondary">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">{role ? roleLabelsMap[role] : '...'}</span>
          </div>
          <Button onClick={updateProfile} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </Card>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Sécurité</h2>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nouveau mot de passe</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button onClick={changePassword} disabled={changingPwd} variant="outline">{changingPwd ? 'Modification...' : 'Changer le mot de passe'}</Button>
        </div>
      </Card>
    </div>
  );
}

function IdentiteSociete() {
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

function BaremeHonoraires() {
  const { data: tranches = [] } = useHonorairesTranches();
  const saveMut = useSaveHonorairesTranches();
  const [rows, setRows] = useState<Omit<HonorairesTranche, 'id'>[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (tranches.length) setRows(tranches.map(({ id, ...t }) => t));
  }, [tranches]);

  const updateRow = (i: number, k: string, v: any) => {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [k]: v } : r));
  };

  const addRow = () => setRows(prev => [...prev, { prix_min: 0, prix_max: null, taux: 3, montant_minimum: 0, ordre: prev.length + 1 }]);
  const removeRow = (i: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, j) => j !== i)); };

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    saveMut.mutate(rows);
    setConfirmOpen(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Barème Honoraires Clients</h2>
        </div>
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-4 h-4 mr-1" />Tranche</Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground uppercase">
          <span>Prix min (€)</span><span>Prix max (€)</span><span>Taux (%)</span><span>Min. garanti (€)</span><span></span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 items-center">
            <Input type="number" value={row.prix_min} onChange={e => updateRow(i, 'prix_min', Number(e.target.value))} />
            <Input type="number" value={row.prix_max ?? ''} onChange={e => updateRow(i, 'prix_max', e.target.value ? Number(e.target.value) : null)} placeholder="∞" />
            <Input type="number" step="0.1" value={row.taux} onChange={e => updateRow(i, 'taux', Number(e.target.value))} />
            <Input type="number" value={row.montant_minimum} onChange={e => updateRow(i, 'montant_minimum', Number(e.target.value))} />
            <Button size="icon" variant="ghost" onClick={() => removeRow(i)} disabled={rows.length <= 1}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer le barème</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le barème</AlertDialogTitle>
            <AlertDialogDescription>Le barème mis à jour sera appliqué aux nouveaux calculs d'honoraires.</AlertDialogDescription>
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

function ModeleEconomique() {
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
        <div className="space-y-2"><Label>Tarif abonnement mensuel HT (€)</Label><Input type="number" value={form.tarif_abonnement_defaut ?? 125} onChange={e => set('tarif_abonnement_defaut', Number(e.target.value))} /></div>
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

function ModelesDocuments() {
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

function NotificationsSection() {
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

function JournalAudit() {
  const { data: logs = [] } = useAuditLog();
  const sectionLabels: Record<string, string> = {
    identite_societe: 'Identité', honoraires: 'Honoraires', modele_economique: 'Éco. réseau',
    modeles_documents: 'Documents', notifications: 'Notifications',
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Journal des modifications</h2>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune modification enregistrée</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0 text-sm">
              <Badge variant="secondary" className="text-[10px] shrink-0">{sectionLabels[log.section] || log.section}</Badge>
              <div className="min-w-0">
                <p className="font-medium">{log.user_name || 'Inconnu'} — {log.action}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function Parametres() {
  const { isAdmin, role } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground mt-1">Configuration de votre compte HUNTERS</p>
        </div>

        {/* Profile section visible to all */}
        <ProfileSection />

        {/* Admin-only settings */}
        {isAdmin && (
          <Tabs defaultValue="identite" className="space-y-4">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="identite"><Building2 className="w-4 h-4 mr-1" />Société</TabsTrigger>
              <TabsTrigger value="honoraires"><Receipt className="w-4 h-4 mr-1" />Honoraires</TabsTrigger>
              <TabsTrigger value="economique"><Network className="w-4 h-4 mr-1" />Réseau</TabsTrigger>
              <TabsTrigger value="documents"><FileText className="w-4 h-4 mr-1" />Documents</TabsTrigger>
              <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1" />Alertes</TabsTrigger>
              <TabsTrigger value="audit"><History className="w-4 h-4 mr-1" />Journal</TabsTrigger>
            </TabsList>
            <TabsContent value="identite"><IdentiteSociete /></TabsContent>
            <TabsContent value="honoraires"><BaremeHonoraires /></TabsContent>
            <TabsContent value="economique"><ModeleEconomique /></TabsContent>
            <TabsContent value="documents"><ModelesDocuments /></TabsContent>
            <TabsContent value="notifications"><NotificationsSection /></TabsContent>
            <TabsContent value="audit"><JournalAudit /></TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
