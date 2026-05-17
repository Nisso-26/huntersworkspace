import { useParams, useNavigate } from 'react-router-dom';
import { useDossiers, useUpdateDossier, useDeleteDossier } from '@/hooks/use-dossiers';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/StatusBadge';
import DocumentsSection from '@/components/DocumentsSection';
import JournalActivite from '@/components/JournalActivite';
import HistoriqueStatuts from '@/components/HistoriqueStatuts';
import RapportConseilButton from '@/components/RapportConseilButton';
import RapportsGeneresList from '@/components/RapportsGeneresList';
import SignatureSection from '@/components/SignatureSection';
import ClientPortalSection, { ClientComments } from '@/components/ClientPortalSection';
import StrategieIA from '@/components/StrategieIA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useState } from 'react';
import { ArrowLeft, Save, Trash2, User, TrendingUp, FileText, PenTool, Globe, Receipt } from 'lucide-react';
import { useMandataires } from '@/hooks/use-mandataires';
import WorkflowProgress from '@/components/WorkflowProgress';
import AccompagnementSection from '@/components/AccompagnementSection';
import DossierExportMenu from '@/components/DossierExportMenu';
import FacturationSection from '@/components/FacturationSection';
import FicheClientFields from '@/components/FicheClientFields';
import { emptyFicheValues, loadFicheFromDossier, serializeFicheForSave, type FicheValues } from '@/lib/fiche-client-fields';
import { ALL_SERVICES_TRUE } from '@/lib/workflow';

const statuses = [
  { value: 'nouveau', label: 'Nouveau' },
  { value: 'conseil', label: 'En conseil' },
  { value: 'chasse', label: 'En chasse' },
  { value: 'visite', label: 'Visites' },
  { value: 'offre', label: 'Offre déposée' },
  { value: 'compromis', label: 'Compromis signé' },
  { value: 'signe', label: 'Acte signé' },
  { value: 'cloture', label: 'Clôturé' },
];

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: dossiers = [], isLoading } = useDossiers();
  const { data: mandataires = [] } = useMandataires();
  const { isAdmin } = useAuth();
  const updateMut = useUpdateDossier();
  const deleteMut = useDeleteDossier();

  const dossier = dossiers.find(d => d.id === id);

  const [form, setForm] = useState({
    client_name: '',
    email: '',
    phone: '',
    mandataire_id: '',
    status: 'nouveau',
    budget: '',
    ville: '',
    honoraires: '',
    notes: '',
    type_accompagnement: 'cle_en_main',
    services_souscrits: { ...ALL_SERVICES_TRUE, gestion_locative: false } as Record<string, boolean>,
  });

  const [fiche, setFiche] = useState<FicheValues>(emptyFicheValues());

  // Sync form quand le dossier charge — une seule fois
  const [formInitialized, setFormInitialized] = useState(false);
  if (dossier && !formInitialized && !isLoading) {
    setFormInitialized(true);
    setForm({
      client_name: dossier.client_name,
      email: dossier.email || '',
      phone: dossier.phone || '',
      mandataire_id: dossier.mandataire_id || '',
      status: dossier.status,
      budget: dossier.budget?.toString() || '',
      ville: dossier.ville || '',
      honoraires: dossier.honoraires?.toString() || '',
      notes: dossier.notes || '',
      type_accompagnement: dossier.type_accompagnement || 'cle_en_main',
      services_souscrits: (dossier.services_souscrits as Record<string, boolean>) || { ...ALL_SERVICES_TRUE, gestion_locative: false },
    });
    setFiche(loadFicheFromDossier(dossier as any));
  }

  const handleSave = async () => {
    if (!dossier) return;
    await updateMut.mutateAsync({
      id: dossier.id,
      ...form,
      ...serializeFicheForSave(fiche),
      budget: Number(form.budget) || 0,
      honoraires: Number(form.honoraires) || 0,
    } as any);
    toast.success('Dossier enregistré');
  };

  const handleDelete = async () => {
    if (!dossier || !confirm('Supprimer ce dossier définitivement ?')) return;
    await deleteMut.mutateAsync(dossier.id);
    navigate('/dossiers');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!dossier) {
    return (
      <AppLayout>
        <div className="text-center py-16">
          <p className="text-muted-foreground">Dossier introuvable.</p>
          <Button variant="ghost" onClick={() => navigate('/dossiers')} className="mt-4">
            ← Retour aux dossiers
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dossiers')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-heading font-bold text-foreground">
                  {dossier.client_name}
                </h1>
                {dossier.numero_dossier && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-primary text-primary-foreground text-[11px] font-mono font-semibold tracking-wide">
                    {dossier.numero_dossier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={dossier.status as any} />
                <span className="text-xs text-muted-foreground">{dossier.ville}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{dossier.budget.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DossierExportMenu dossier={dossier} />
            <RapportConseilButton dossier={dossier} />
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </Button>
            <Button size="sm" className="gap-2" onClick={handleSave} disabled={updateMut.isPending}>
              <Save className="w-4 h-4" />
              {updateMut.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        {/* Workflow progression */}
        <WorkflowProgress dossier={dossier} />

        {/* Onglets */}
        <Tabs defaultValue="infos">
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="infos" className="gap-1.5 text-xs">
              <User className="w-3.5 h-3.5" />Infos
            </TabsTrigger>
            <TabsTrigger value="strategie" className="gap-1.5 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />Stratégie
            </TabsTrigger>
            <TabsTrigger value="facturation" className="gap-1.5 text-xs">
              <Receipt className="w-3.5 h-3.5" />Facturation
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />Documents
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-1.5 text-xs">
              <PenTool className="w-3.5 h-3.5" />Signature
            </TabsTrigger>
            <TabsTrigger value="portail" className="gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" />Portail
            </TabsTrigger>
          </TabsList>

          {/* Infos */}
          <TabsContent value="infos" className="mt-4">
            <div className="bg-card border rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nom du client *</Label>
                  <Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                {isAdmin && mandataires.length > 0 && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Conseiller</Label>
                    <Select value={form.mandataire_id} onValueChange={v => setForm(f => ({ ...f, mandataire_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {mandataires.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name} — {m.zone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statuses.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Budget (€)</Label>
                  <Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Honoraires (€)</Label>
                  <Input type="number" value={form.honoraires} onChange={e => setForm(f => ({ ...f, honoraires: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={4} />
                </div>
                <AccompagnementSection
                  type={form.type_accompagnement}
                  services={form.services_souscrits}
                  onTypeChange={v => setForm(f => ({ ...f, type_accompagnement: v }))}
                  onServicesChange={s => setForm(f => ({ ...f, services_souscrits: s }))}
                />
              </div>
              <div className="mt-2 border-t pt-4">
                <FicheClientFields values={fiche} onChange={patch => setFiche(f => ({ ...f, ...patch }))} />
              </div>
            </div>
            <div className="mt-4">
              <JournalActivite dossierId={dossier.id} />
            </div>
            <div className="mt-4">
              <HistoriqueStatuts dossierId={dossier.id} />
            </div>
          </TabsContent>

          {/* Stratégie */}
          <TabsContent value="strategie" className="mt-4">
            <div className="bg-card border rounded-xl p-6">
              <StrategieIA dossier={dossier} />
            </div>
          </TabsContent>

          {/* Facturation */}
          <TabsContent value="facturation" className="mt-4">
            <FacturationSection dossier={dossier} />
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <div className="bg-card border rounded-xl p-6">
              <DocumentsSection dossierId={dossier.id} />
              <RapportsGeneresList dossier={dossier} />
            </div>
          </TabsContent>

          {/* Signature */}
          <TabsContent value="signature" className="mt-4">
            <div className="bg-card border rounded-xl p-6">
              <SignatureSection dossierId={dossier.id} clientName={form.client_name} clientEmail={form.email} numeroDossier={dossier.numero_dossier} />
            </div>
          </TabsContent>

          {/* Portail client */}
          <TabsContent value="portail" className="mt-4 space-y-4">
            <div className="bg-card border rounded-xl p-6">
              <ClientPortalSection dossierId={dossier.id} clientName={form.client_name} />
            </div>
            <div className="bg-card border rounded-xl p-6">
              <p className="text-sm font-semibold text-foreground mb-3">💬 Commentaires client</p>
              <ClientComments dossierId={dossier.id} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
