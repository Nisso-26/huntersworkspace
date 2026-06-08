import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  FileText,
  CreditCard,
  MapPin,
  Sparkles,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import huntersLogo from '@/assets/hunters-logo.jpg';

interface Props {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Bienvenue', icon: Sparkles },
  { id: 2, title: 'Identité', icon: User },
  { id: 3, title: 'RSAC', icon: FileText },
  { id: 4, title: 'Bancaire & Pack', icon: CreditCard },
  { id: 5, title: 'Zone & Règles', icon: MapPin },
];

const ZONES = [
  { id: 'zone_1', label: 'Zone 1 — Tours centre', communes: 'Tours centre, Tours nord' },
  { id: 'zone_2', label: 'Zone 2 — Tours sud-ouest', communes: 'Joué-lès-Tours, Saint-Avertin' },
  { id: 'zone_3', label: 'Zone 3 — Ouest', communes: 'Saint-Cyr-sur-Loire, Fondettes, Luynes' },
  { id: 'zone_4', label: 'Zone 4 — Est', communes: 'Chambray-lès-Tours, Saint-Pierre-des-Corps, Montlouis-sur-Loire' },
  { id: 'zone_5', label: 'Zone 5 — Sud', communes: 'Veigné, Sorigny, Monts, Ballan-Miré' },
];

const isValidFrIban = (v: string) => /^FR\d{2}[A-Z0-9]{23}$/i.test(v.replace(/\s+/g, ''));
const isValidSiret = (v: string) => /^\d{14}$/.test(v.replace(/\s+/g, ''));

export default function OnboardingWizard({ onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Étape 2 — Identité
  const [identite, setIdentite] = useState({
    first_name: '',
    last_name: '',
    date_naissance: '',
    adresse_rue: '',
    adresse_cp: '',
    adresse_ville: '',
    email: user?.email ?? '',
    phone: '',
    statut_juridique: '',
  });

  // Étape 3 — RSAC
  const [rsac, setRsac] = useState({
    rsac_numero: '',
    rsac_greffe: '',
    rsac_date_immat: '',
    rsac_justificatif_path: '' as string,
  });

  // Étape 4 — Bancaire & Pack
  const [bancaire, setBancaire] = useState({
    iban: '',
    siret: '',
    pack_accepte: false,
  });

  // Étape 5 — Zone & règles
  const [reglementaire, setReglementaire] = useState({
    zone_prioritaire: '' as string,
    zone_acceptee: false,
    prescripteurs_acceptes: false,
  });

  // Pré-remplissage depuis profiles
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!data) return;
      const p = data as any;
      setIdentite((s) => ({
        ...s,
        first_name: p.first_name ?? s.first_name,
        last_name: p.last_name ?? s.last_name,
        date_naissance: p.date_naissance ?? s.date_naissance,
        adresse_rue: p.adresse_rue ?? s.adresse_rue,
        adresse_cp: p.adresse_cp ?? s.adresse_cp,
        adresse_ville: p.adresse_ville ?? s.adresse_ville,
        email: p.email ?? s.email,
        phone: p.phone ?? s.phone,
        statut_juridique: p.statut_juridique ?? '',
      }));
      setRsac((s) => ({
        ...s,
        rsac_numero: p.rsac_numero ?? '',
        rsac_greffe: p.rsac_greffe ?? '',
        rsac_date_immat: p.rsac_date_immat ?? '',
        rsac_justificatif_path: p.rsac_justificatif_path ?? '',
      }));
      setBancaire((s) => ({
        ...s,
        iban: p.iban ?? '',
        siret: p.siret ?? '',
        pack_accepte: !!p.pack_accepte,
      }));
      setReglementaire((s) => ({
        ...s,
        zone_prioritaire: p.zone_prioritaire ?? p.zone ?? '',
        zone_acceptee: !!p.zone_acceptee,
        prescripteurs_acceptes: !!p.prescripteurs_acceptes,
      }));
    })();
  }, [user]);

  // Validations par étape
  const errorsStep2 = (): string | null => {
    const i = identite;
    if (!i.first_name.trim() || !i.last_name.trim()) return 'Nom et prénom requis';
    if (!i.date_naissance) return 'Date de naissance requise';
    if (!i.adresse_rue.trim() || !i.adresse_cp.trim() || !i.adresse_ville.trim()) return 'Adresse complète requise';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email)) return 'Email professionnel invalide';
    if (!i.phone.trim()) return 'Téléphone requis';
    if (!i.statut_juridique) return 'Statut juridique requis';
    return null;
  };

  const errorsStep3 = (): string | null => {
    if (!rsac.rsac_numero.trim()) return 'Numéro RSAC requis';
    if (!rsac.rsac_greffe.trim()) return 'Greffe requis';
    if (!rsac.rsac_date_immat) return 'Date d\'immatriculation requise';
    if (!rsac.rsac_justificatif_path) return 'Justificatif RSAC obligatoire';
    return null;
  };

  const errorsStep4 = (): string | null => {
    if (!isValidFrIban(bancaire.iban)) return 'IBAN français invalide (FR + 25 caractères)';
    const needSiret = bancaire.siret.trim().length > 0 || identite.statut_juridique === 'eurl' || identite.statut_juridique === 'sasu';
    if (needSiret && !isValidSiret(bancaire.siret)) return 'SIRET invalide (14 chiffres)';
    if (!bancaire.pack_accepte) return 'Vous devez accepter les conditions du pack mensuel';
    return null;
  };

  const errorsStep5 = (): string | null => {
    if (!reglementaire.zone_prioritaire) return 'Votre zone prioritaire n\'a pas encore été affectée par le Directeur';
    if (!reglementaire.zone_acceptee) return 'Vous devez confirmer la compréhension de votre zone';
    if (!reglementaire.prescripteurs_acceptes) return 'Vous devez accepter la règle prescripteurs';
    return null;
  };

  const saveProgress = async (extra: Record<string, any> = {}) => {
    if (!user) return;
    const payload: Record<string, any> = {
      ...identite,
      ...rsac,
      iban: bancaire.iban,
      siret: bancaire.siret,
      pack_accepte: bancaire.pack_accepte,
      pack_accepte_at: bancaire.pack_accepte ? new Date().toISOString() : null,
      zone_prioritaire: reglementaire.zone_prioritaire || null,
      zone_acceptee: reglementaire.zone_acceptee,
      prescripteurs_acceptes: reglementaire.prescripteurs_acceptes,
      full_name: `${identite.first_name} ${identite.last_name}`.trim(),
      ...extra,
    };
    const { error } = await supabase.from('profiles').update(payload as any).eq('id', user.id);
    if (error) throw error;
  };

  const goNext = async (validator: () => string | null, target: number) => {
    const err = validator();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await saveProgress();
      setStep(target);
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    const err = errorsStep5();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await saveProgress({ onboarding_completed_at: new Date().toISOString(), status: 'actif' });
      toast.success('Onboarding finalisé');
      onComplete();
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadRsac = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (10 Mo max)');
      return;
    }
    if (!/(pdf|image\/)/i.test(file.type)) {
      toast.error('Format accepté : PDF ou image');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/rsac/justificatif_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('mandataire-documents').upload(path, file, { upsert: true });
      if (error) throw error;
      setRsac((s) => ({ ...s, rsac_justificatif_path: path }));
      toast.success('Justificatif RSAC uploadé');
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const renderStepper = () => (
    <div className="flex items-center justify-center gap-1.5 px-6 py-4 border-b border-border/40 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1.5">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
              ${step > s.id ? 'bg-primary text-white' :
                step === s.id ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                'bg-secondary text-muted-foreground'}`}
          >
            {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
          </div>
          {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-border/60 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-hunters p-5 text-center shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 mx-auto mb-2">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-white font-heading font-bold text-lg">Activation de votre compte mandataire</h1>
          <p className="text-white/70 text-xs mt-1">5 étapes obligatoires et séquentielles</p>
        </div>

        {renderStepper()}

        <div className="p-6 overflow-y-auto flex-1">
          {/* ÉTAPE 1 — Bienvenue */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-heading font-bold text-foreground text-lg">
                Bienvenue {user?.user_metadata?.first_name || user?.email?.split('@')[0]} !
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                Pour activer votre compte, complétez ce parcours en 5 étapes :
                identité, immatriculation RSAC, informations bancaires & pack mensuel, puis zone d'intervention
                et règles réseau. Chaque étape est obligatoire pour passer à la suivante.
              </p>
              <Button onClick={() => setStep(2)} className="bg-primary hover:bg-primary/90 text-white gap-2">
                Commencer <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ÉTAPE 2 — Identité */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-bold text-foreground">Étape 1 — Informations personnelles</h2>
                <p className="text-xs text-muted-foreground mt-1">Tous les champs sont obligatoires.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="label-premium">Prénom *</Label>
                  <Input value={identite.first_name} onChange={(e) => setIdentite({ ...identite, first_name: e.target.value })} maxLength={80} />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Nom *</Label>
                  <Input value={identite.last_name} onChange={(e) => setIdentite({ ...identite, last_name: e.target.value })} maxLength={80} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">Date de naissance *</Label>
                  <Input type="date" value={identite.date_naissance} onChange={(e) => setIdentite({ ...identite, date_naissance: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">Adresse — rue *</Label>
                  <Input value={identite.adresse_rue} onChange={(e) => setIdentite({ ...identite, adresse_rue: e.target.value })} maxLength={200} placeholder="12 rue des Halles" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Code postal *</Label>
                  <Input value={identite.adresse_cp} onChange={(e) => setIdentite({ ...identite, adresse_cp: e.target.value })} maxLength={10} placeholder="37000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Ville *</Label>
                  <Input value={identite.adresse_ville} onChange={(e) => setIdentite({ ...identite, adresse_ville: e.target.value })} maxLength={100} placeholder="Tours" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Email professionnel *</Label>
                  <Input type="email" value={identite.email} onChange={(e) => setIdentite({ ...identite, email: e.target.value })} maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Téléphone *</Label>
                  <Input value={identite.phone} onChange={(e) => setIdentite({ ...identite, phone: e.target.value })} maxLength={25} placeholder="06 00 00 00 00" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">Statut juridique *</Label>
                  <Select value={identite.statut_juridique || undefined} onValueChange={(v) => setIdentite({ ...identite, statut_juridique: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez votre statut" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_entrepreneur">Auto-entrepreneur</SelectItem>
                      <SelectItem value="eurl">EURL</SelectItem>
                      <SelectItem value="sasu">SASU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <NavButtons onBack={() => setStep(1)} onNext={() => goNext(errorsStep2, 3)} saving={saving} />
            </div>
          )}

          {/* ÉTAPE 3 — RSAC */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-bold text-foreground">Étape 2 — Immatriculation RSAC</h2>
                <p className="text-xs text-muted-foreground mt-1">L'inscription au Registre Spécial des Agents Commerciaux est obligatoire.</p>
              </div>

              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">
                  Votre immatriculation au RSAC est obligatoire avant tout début d'activité.
                  Vous ne pouvez pas accéder à l'étape suivante sans ce justificatif.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="label-premium">Numéro RSAC *</Label>
                  <Input value={rsac.rsac_numero} onChange={(e) => setRsac({ ...rsac, rsac_numero: e.target.value })} maxLength={40} placeholder="RSAC 123 456 789" />
                </div>
                <div className="space-y-1.5">
                  <Label className="label-premium">Greffe compétent *</Label>
                  <Input value={rsac.rsac_greffe} onChange={(e) => setRsac({ ...rsac, rsac_greffe: e.target.value })} maxLength={80} placeholder="Tours" />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">Date d'immatriculation *</Label>
                  <Input type="date" value={rsac.rsac_date_immat} onChange={(e) => setRsac({ ...rsac, rsac_date_immat: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="label-premium">Justificatif RSAC (PDF ou image) *</Label>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadRsac(f);
                      }}
                    />
                    <div className="cursor-pointer border border-dashed border-border rounded-lg p-3 text-sm text-muted-foreground hover:border-primary hover:bg-primary/5 transition flex items-center justify-center gap-2">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {rsac.rsac_justificatif_path ? 'Remplacer le justificatif' : 'Téléverser un fichier (PDF/image, max 10 Mo)'}
                    </div>
                  </label>
                </div>
                {rsac.rsac_justificatif_path && (
                  <p className="text-xs text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Justificatif chargé : {rsac.rsac_justificatif_path.split('/').pop()}
                  </p>
                )}
              </div>

              <NavButtons onBack={() => setStep(2)} onNext={() => goNext(errorsStep3, 4)} saving={saving} />
            </div>
          )}

          {/* ÉTAPE 4 — Bancaire & Pack */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading font-bold text-foreground">Étape 3 — Informations bancaires & pack mensuel</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">IBAN (FR) *</Label>
                  <Input
                    value={bancaire.iban}
                    onChange={(e) => setBancaire({ ...bancaire, iban: e.target.value.toUpperCase() })}
                    maxLength={34}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="label-premium">
                    SIRET {(identite.statut_juridique === 'eurl' || identite.statut_juridique === 'sasu') ? '*' : '(facultatif si auto-entrepreneur en cours)'}
                  </Label>
                  <Input
                    value={bancaire.siret}
                    onChange={(e) => setBancaire({ ...bancaire, siret: e.target.value.replace(/\s+/g, '') })}
                    maxLength={14}
                    placeholder="14 chiffres"
                  />
                </div>
              </div>

              <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
                <h3 className="font-heading font-bold text-primary text-sm uppercase tracking-wide">
                  Pack mensuel HUNTERS Immobilier
                </h3>
                <p className="text-lg font-bold text-foreground">149 € HT <span className="text-sm text-muted-foreground font-normal">(178,80 € TTC)</span></p>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  Exigible <strong>dès le 1er mois</strong> suivant la signature — <strong>sans franchise</strong>.
                  Ce pack couvre l'accès à Hunters Workspace, les outils, les procédures et le support HUNTERS.
                  Le non-paiement à échéance constitue un manquement contractuel entraînant suspension puis résiliation.
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/40 transition">
                <Checkbox
                  checked={bancaire.pack_accepte}
                  onCheckedChange={(c) => setBancaire({ ...bancaire, pack_accepte: !!c })}
                  className="mt-0.5"
                />
                <span className="text-foreground leading-snug">
                  Je reconnais avoir pris connaissance du pack mensuel de <strong>149 € HT</strong> et
                  en accepte les conditions de facturation dès le 1er mois.
                </span>
              </label>

              <NavButtons onBack={() => setStep(3)} onNext={() => goNext(errorsStep4, 5)} saving={saving} />
            </div>
          )}

          {/* ÉTAPE 5 — Zone & Règles réseau */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-foreground">Étape 4 — Zone prioritaire & règles réseau</h2>
              </div>

              {/* 4.1 — Zone */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="label-premium">Votre zone prioritaire (affectée par le Directeur)</Label>
                  {reglementaire.zone_prioritaire ? (
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      <p className="font-semibold text-sm text-foreground">
                        {ZONES.find((z) => z.id === reglementaire.zone_prioritaire)?.label ?? reglementaire.zone_prioritaire}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ZONES.find((z) => z.id === reglementaire.zone_prioritaire)?.communes}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Niveau initial : <strong>N1</strong> (affecté automatiquement)</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      Votre zone prioritaire n'a pas encore été affectée par le Directeur. Contactez votre référent HUNTERS.
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-foreground/80 leading-relaxed space-y-2">
                  <p>
                    Votre zone prioritaire définit votre <strong>territoire de prospection</strong> — pas vos clients.
                    Vous pouvez traiter des dossiers sur toutes les communes du périmètre HUNTERS (rayon 25 km autour de Tours).
                  </p>
                  <p>
                    Si un client de votre zone vous demande un bien dans une autre zone — c'est votre client,
                    c'est votre dossier, c'est votre commission.
                  </p>
                  <p>
                    <strong>Règle de priorité client :</strong> le client appartient au mandataire qui l'a qualifié en premier
                    et dont le dossier est ouvert dans Hunters Workspace. En cas de litige, le Directeur arbitre.
                  </p>
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/40 transition">
                  <Checkbox
                    checked={reglementaire.zone_acceptee}
                    onCheckedChange={(c) => setReglementaire({ ...reglementaire, zone_acceptee: !!c })}
                    className="mt-0.5"
                  />
                  <span className="text-foreground leading-snug">
                    Je comprends que ma zone prioritaire définit mon territoire de prospection.
                    Je peux traiter des dossiers sur toutes les communes du périmètre HUNTERS.
                  </span>
                </label>
              </div>

              {/* 4.2 — Prescripteurs */}
              <div className="space-y-3">
                <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-destructive" />
                    <h3 className="font-heading font-bold text-destructive text-sm uppercase tracking-wide">
                      Règle absolue — Prescripteurs accrédités uniquement
                    </h3>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Tout prescripteur (notaire, courtier, agent immobilier, CGP, banquier) doit être préalablement
                    <strong> accrédité par HUNTERS Immobilier</strong> avant tout démarchage.
                    Vous ne démarcherez <strong>jamais</strong> un prescripteur en votre nom propre.
                  </p>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Si vous identifiez un prescripteur potentiel dans votre zone, vous le signalez au Directeur via Workspace.
                    HUNTERS prend contact, évalue, accrédite et lui remet sa charte partenaire.
                    L'annuaire des prescripteurs accrédités est accessible dans Workspace — utilisez-le exclusivement.
                  </p>
                  <p className="text-xs text-destructive font-semibold leading-relaxed">
                    Toute violation de cette règle constitue un manquement grave au contrat de mandat.
                  </p>
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/40 transition">
                  <Checkbox
                    checked={reglementaire.prescripteurs_acceptes}
                    onCheckedChange={(c) => setReglementaire({ ...reglementaire, prescripteurs_acceptes: !!c })}
                    className="mt-0.5"
                  />
                  <span className="text-foreground leading-snug">
                    Je comprends que tous les prescripteurs doivent être accrédités par HUNTERS Immobilier.
                    Je m'engage à ne démarcher aucun prescripteur sans accord préalable du Directeur.
                  </span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(4)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Retour
                </Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Finaliser mon activation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButtons({ onBack, onNext, saving }: { onBack: () => void; onNext: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ChevronLeft className="w-4 h-4" /> Retour
      </Button>
      <Button onClick={onNext} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continuer'} <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
