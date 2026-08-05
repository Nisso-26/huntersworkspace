import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Loader2,
  Briefcase,
  GraduationCap,
  Headset,
  Lock,
  FileText,
  MapPin,
} from 'lucide-react';
import huntersLogo from '@/assets/hunters-symbol-light.svg';


interface Props {
  onComplete: () => void;
}

const STEP_TITLES = ['Bienvenue', 'Identité', 'RSAC', 'Bancaire & Pack', 'Zone & Activation'];
const TOTAL_STEPS = 5;

interface ZoneAffectee {
  zone_label: string;
  statut: string;
  perimetre_km: number;
  communes: string[];
}


const isValidFrIban = (v: string) => /^FR\d{2}[A-Z0-9]{23}$/i.test(v.replace(/\s+/g, ''));
const isValidSiret = (v: string) => /^\d{14}$/.test(v.replace(/\s+/g, ''));

type FormData = {
  // Étape 2
  first_name: string;
  last_name: string;
  date_naissance: string;
  adresse_rue: string;
  adresse_cp: string;
  adresse_ville: string;
  telephone: string;
  statut_juridique: '' | 'auto-entrepreneur' | 'eurl' | 'sasu';
  // Étape 3
  rsac_numero: string;
  rsac_greffe: string;
  rsac_date: string;
  rsac_justificatif: string; // nom de fichier saisi
  // Étape 4
  iban: string;
  siret: string;
  accept_pack: boolean;
  // Étape 5
  accept_zone: boolean;
  accept_prescripteurs: boolean;
  accept_objectifs: boolean;
  accept_encaissement: boolean;
};

const EMPTY_FORM: FormData = {
  first_name: '',
  last_name: '',
  date_naissance: '',
  adresse_rue: '',
  adresse_cp: '',
  adresse_ville: '',
  telephone: '',
  statut_juridique: '',
  rsac_numero: '',
  rsac_greffe: '',
  rsac_date: '',
  rsac_justificatif: '',
  iban: '',
  siret: '',
  accept_pack: false,
  accept_zone: false,
  accept_prescripteurs: false,
  accept_objectifs: false,
  accept_encaissement: false,
};

export default function OnboardingWizard({ onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [zones, setZones] = useState<ZoneAffectee[]>([]);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // ----- Chargement initial : profil + progression
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: progress }, { data: zonesRows }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('onboarding_progress').select('*').eq('mandataire_id', user.id).maybeSingle(),
        supabase
          .from('zones_mandataires')
          .select('zone_label, statut, perimetre_km, communes')
          .eq('mandataire_id', user.id)
          .order('zone_label'),
      ]);
      setZones((zonesRows ?? []) as ZoneAffectee[]);


      const next = { ...EMPTY_FORM };
      if (profile) {
        const fullName = (profile.full_name || '').trim();
        const [first, ...rest] = fullName.split(' ');
        next.first_name = first || '';
        next.last_name = rest.join(' ');
        next.telephone = (profile as any).phone || '';
        next.statut_juridique = ((profile as any).statut_juridique || '') as FormData['statut_juridique'];
        next.rsac_numero = (profile as any).rsac_numero || '';
        next.rsac_greffe = (profile as any).rsac_greffe || '';
        next.rsac_date = (profile as any).rsac_date || '';
        next.rsac_justificatif = (profile as any).rsac_justificatif || '';
        next.iban = (profile as any).iban || '';
        next.siret = (profile as any).siret || '';
      }

      if (progress?.data && typeof progress.data === 'object') {
        Object.assign(next, progress.data as Partial<FormData>);
      }
      setForm(next);
      if (progress?.step_current) setStep(Math.min(Math.max(progress.step_current, 1), TOTAL_STEPS));
      if (progress?.step_completed) setCompletedSteps(progress.step_completed as number[]);
      setHydrated(true);
    })();
  }, [user]);

  // ----- Sauvegarde progressive (debounced)
  useEffect(() => {
    if (!hydrated || !user) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void persist();
    }, 500);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, step, completedSteps]);

  const persist = async () => {
    if (!user) return;
    try {
      await supabase.from('onboarding_progress').upsert(
        {
          mandataire_id: user.id,
          step_current: step,
          step_completed: completedSteps,
          data: form as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'mandataire_id' }
      );

      const profileFields: Record<string, unknown> = {
        full_name: [form.first_name, form.last_name].filter(Boolean).join(' ').trim() || null,
        phone: form.telephone || null,
        statut_juridique: form.statut_juridique || null,
        rsac_numero: form.rsac_numero || null,
        rsac_greffe: form.rsac_greffe || null,
        rsac_date: form.rsac_date || null,
        rsac_justificatif: form.rsac_justificatif || null,
        iban: form.iban || null,
        siret: form.siret || null,
        onboarding_step: step,
      };
      await supabase.from('profiles').update(profileFields as any).eq('id', user.id);

    } catch (e) {
      // silencieux — réessai au prochain changement
      console.error('Onboarding persist failed', e);
    }
  };

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ----- Validation par étape
  const canAdvance = useMemo(() => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return Boolean(
          form.first_name &&
          form.last_name &&
          form.date_naissance &&
          form.adresse_rue &&
          form.adresse_cp &&
          form.adresse_ville &&
          form.telephone &&
          form.statut_juridique
        );
      case 3:
        return Boolean(form.rsac_numero && form.rsac_greffe && form.rsac_date && form.rsac_justificatif);
      case 4: {
        const ibanOk = isValidFrIban(form.iban);
        const siretRequired = form.statut_juridique === 'eurl' || form.statut_juridique === 'sasu';
        const siretOk = siretRequired ? isValidSiret(form.siret) : true;
        return ibanOk && siretOk && form.accept_pack;
      }
      case 5:
        return zones.length > 0 && form.accept_zone && form.accept_prescripteurs && form.accept_objectifs && form.accept_encaissement;
      default:
        return false;
    }
  }, [step, form, zones]);


  const goNext = async () => {
    if (!canAdvance) return;
    setSaving(true);
    await persist();
    setCompletedSteps((c) => (c.includes(step) ? c : [...c, step]));
    if (step < TOTAL_STEPS) setStep(step + 1);
    setSaving(false);
  };

  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const activate = async () => {
    if (!user || !canAdvance) return;
    setSaving(true);
    try {
      await persist();
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_step: TOTAL_STEPS,
          status: 'actif',
          onboarding_completed_at: new Date().toISOString(),
        } as any)
        .eq('id', user.id);
      await supabase
        .from('onboarding_progress')
        .upsert(
          {
            mandataire_id: user.id,
            step_current: TOTAL_STEPS,
            step_completed: Array.from(new Set([...completedSteps, TOTAL_STEPS])),
            data: form as unknown as Record<string, unknown>,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'mandataire_id' }
        );

      // Notifier les super_admins
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'super_admin');
      const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ').trim();
      const zonesLabel = zones.map((z) => z.zone_label).join(', ') || '?';
      const detail = `Nouveau mandataire activé : ${fullName} — Zone(s) : ${zonesLabel} — Onboarding complet — Vérification dossier requise`;

      if (admins?.length) {
        await supabase.from('alertes').insert(
          admins.map((a) => ({
            user_id: a.user_id,
            type: 'info',
            title: 'Mandataire activé',
            detail,
          })) as any
        );
      }

      toast.success('Votre compte est activé. Bienvenue dans le réseau HUNTERS.');
      onComplete();
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de l\'activation');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex flex-col">
        {/* Barre de progression */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <img src={huntersLogo} alt="HUNTERS" className="h-8 w-8 rounded" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Onboarding</p>
                  <p className="text-sm font-semibold">Étape {step} / {TOTAL_STEPS} — {STEP_TITLES[step - 1]}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Sauvegarde automatique activée</p>
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5" />
          </div>
        </div>

        <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-8">
          {!hydrated ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {step === 1 && <StepBienvenue />}
              {step === 2 && <StepIdentite form={form} setField={setField} email={user.email || ''} />}
              {step === 3 && <StepRsac form={form} setField={setField} />}
              {step === 4 && <StepBancairePack form={form} setField={setField} />}
              {step === 5 && (
                <StepZoneActivation
                  form={form}
                  setField={setField}
                  zones={zones}
                />
              )}
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 mt-10 pt-6 border-t border-border">
            <Button variant="ghost" onClick={goPrev} disabled={step === 1 || saving}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
            </Button>
            {step < TOTAL_STEPS ? (
              <Button onClick={goNext} disabled={!canAdvance || saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {step === 1 ? 'Commencer' : 'Suivant'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={activate} disabled={!canAdvance || saving} className="bg-hunters-success hover:bg-hunters-success/90">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Activer mon compte
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ ÉTAPES ============

function StepBienvenue() {
  return (
    <div className="text-center space-y-6 py-8">
      <img src={huntersLogo} alt="HUNTERS" className="w-20 h-20 rounded-lg mx-auto" />
      <div>
        <h1 className="text-3xl font-heading font-bold">Bienvenue dans le réseau HUNTERS Immobilier</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Votre espace mandataire est prêt. Complétez votre dossier en 5 étapes pour activer votre accès complet à Hunters Workspace.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {[
          { icon: Briefcase, label: 'Outils professionnels', detail: 'CRM, simulateur, signature électronique' },
          { icon: GraduationCap, label: 'Méthode éprouvée', detail: 'Pipeline structuré, conformité intégrée' },
          { icon: Headset, label: 'Support permanent', detail: 'Direction, juridique, administratif' },
        ].map(({ icon: Icon, label, detail }) => (
          <div key={label} className="border border-border rounded-lg p-4 bg-card text-left">
            <Icon className="w-6 h-6 text-accent mb-2" />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepIdentite({
  form,
  setField,
  email,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  email: string;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-heading font-bold">Informations personnelles</h2>
        <p className="text-sm text-muted-foreground mt-1">Tous les champs sont obligatoires.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Prénom *">
          <Input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
        </Field>
        <Field label="Nom *">
          <Input value={form.last_name} onChange={(e) => setField('last_name', e.target.value)} />
        </Field>
        <Field label="Date de naissance *">
          <Input type="date" value={form.date_naissance} onChange={(e) => setField('date_naissance', e.target.value)} />
        </Field>
        <Field label="Téléphone *">
          <Input type="tel" value={form.telephone} onChange={(e) => setField('telephone', e.target.value)} placeholder="06 12 34 56 78" />
        </Field>
        <Field label="Email professionnel" className="sm:col-span-2">
          <Input value={email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Non modifiable</p>
        </Field>
        <Field label="Adresse — rue *" className="sm:col-span-2">
          <Input value={form.adresse_rue} onChange={(e) => setField('adresse_rue', e.target.value)} />
        </Field>
        <Field label="Code postal *">
          <Input value={form.adresse_cp} onChange={(e) => setField('adresse_cp', e.target.value)} maxLength={5} />
        </Field>
        <Field label="Ville *">
          <Input value={form.adresse_ville} onChange={(e) => setField('adresse_ville', e.target.value)} />
        </Field>
        <Field label="Statut juridique *" className="sm:col-span-2">
          <Select value={form.statut_juridique || undefined} onValueChange={(v) => setField('statut_juridique', v as FormData['statut_juridique'])}>
            <SelectTrigger><SelectValue placeholder="Choisir un statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto-entrepreneur">Auto-entrepreneur</SelectItem>
              <SelectItem value="eurl">EURL</SelectItem>
              <SelectItem value="sasu">SASU</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function StepRsac({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-accent" /> Immatriculation RSAC
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Registre Spécial des Agents Commerciaux — obligatoire avant tout début d'activité.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Numéro RSAC *">
          <Input value={form.rsac_numero} onChange={(e) => setField('rsac_numero', e.target.value)} placeholder="RSAC 123 456 789" />
        </Field>
        <Field label="Greffe compétent *">
          <Input value={form.rsac_greffe} onChange={(e) => setField('rsac_greffe', e.target.value)} placeholder="Tours" />
        </Field>
        <Field label="Date d'immatriculation *" className="sm:col-span-2">
          <Input type="date" value={form.rsac_date} onChange={(e) => setField('rsac_date', e.target.value)} />
        </Field>
      </div>

      <Field label="Justificatif RSAC (PDF ou image) *">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setField('rsac_justificatif', f.name);
          }}
        />
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Choisir un fichier
          </Button>
          <span className="text-sm text-muted-foreground truncate">
            {form.rsac_justificatif || 'Aucun fichier sélectionné'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Votre justificatif sera conservé dans votre dossier.</p>
      </Field>

      {(!form.rsac_numero || !form.rsac_greffe || !form.rsac_date || !form.rsac_justificatif) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Votre immatriculation au RSAC est obligatoire avant tout début d'activité. Vous ne pouvez pas accéder à l'étape suivante sans ce justificatif.</p>
        </div>
      )}
    </div>
  );
}

function StepBancairePack({
  form,
  setField,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  const ibanOk = !form.iban || isValidFrIban(form.iban);
  const siretRequired = form.statut_juridique === 'eurl' || form.statut_juridique === 'sasu';
  const siretOk = !siretRequired || !form.siret || isValidSiret(form.siret);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-heading font-bold">Informations bancaires et pack mensuel</h2>
      </header>

      <Field label="IBAN (France) *">
        <Input
          value={form.iban}
          onChange={(e) => setField('iban', e.target.value.toUpperCase())}
          placeholder="FR76 1234 5678 9012 3456 7890 123"
        />
        {!ibanOk && <p className="text-xs text-destructive mt-1">Format IBAN français invalide (FR + 25 caractères).</p>}
      </Field>

      <Field label={`SIRET ${siretRequired ? '*' : '(facultatif pour auto-entrepreneur)'}`}>
        <Input
          value={form.siret}
          onChange={(e) => setField('siret', e.target.value)}
          placeholder="14 chiffres"
          maxLength={14}
        />
        {!siretOk && <p className="text-xs text-destructive mt-1">Le SIRET doit contenir 14 chiffres.</p>}
      </Field>

      <div className="rounded-lg border-2 border-accent bg-accent/10 p-5 space-y-2">
        <p className="font-heading text-lg font-bold text-foreground">Pack mensuel HUNTERS Immobilier</p>
        <p className="text-2xl font-bold">149 € HT <span className="text-base font-normal text-muted-foreground">(178,80 € TTC)</span></p>
        <p className="text-sm font-semibold">Exigible dès le 1er mois suivant la signature — sans franchise.</p>
        <p className="text-sm text-muted-foreground">
          Ce pack couvre l'accès à Hunters Workspace, les outils, les procédures et le support HUNTERS.
          Le non-paiement à échéance constitue un manquement contractuel entraînant suspension puis résiliation.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={form.accept_pack}
          onCheckedChange={(c) => setField('accept_pack', c === true)}
          className="mt-1"
        />
        <span className="text-sm">
          Je reconnais avoir pris connaissance du pack mensuel de <strong>149 € HT</strong> et en accepte les conditions de facturation dès le 1er mois.
        </span>
      </label>
    </div>
  );
}

function StepZoneActivation({
  form,
  setField,
  zone,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  zone: number | null;
}) {
  const zoneInfo = zone ? ZONES[zone] : null;
  const ibanLast4 = form.iban ? form.iban.replace(/\s+/g, '').slice(-4) : '----';

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-heading font-bold">Zone prioritaire, règles réseau et activation</h2>
      </header>

      {/* 5.1 — Zone prioritaire */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Zone prioritaire
        </h3>
        {zoneInfo ? (
          <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="font-semibold">Zone prioritaire affectée : {zoneInfo.label}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Affectée par le Directeur — non modifiable
            </p>
            <p className="text-sm text-muted-foreground mt-2">{zoneInfo.communes}</p>
          </div>
        ) : (
          <div className="rounded-md border border-hunters-warning/40 bg-hunters-warning/5 p-4 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 text-hunters-warning mt-0.5 shrink-0" />
            <p>Votre zone prioritaire n'a pas encore été affectée par le Directeur. Contactez le siège avant de poursuivre.</p>
          </div>
        )}
        <div className="rounded-md border border-hunters-success/30 bg-hunters-success/5 p-3 text-sm">
          Votre zone prioritaire définit votre territoire de prospection — pas vos clients. Vous pouvez traiter des dossiers sur toutes les communes du périmètre HUNTERS (25 km autour de Tours). Le client appartient au mandataire qui l'a qualifié en premier dans Workspace.
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.accept_zone} onCheckedChange={(c) => setField('accept_zone', c === true)} className="mt-1" />
          <span className="text-sm">Je comprends que ma zone prioritaire définit mon territoire de prospection. Je peux traiter des dossiers sur toutes les communes du périmètre HUNTERS.</span>
        </label>
      </section>

      {/* 5.2 — Prescripteurs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Règle prescripteurs
        </h3>
        <div className="rounded-md border-2 border-destructive bg-destructive/5 p-4 text-sm space-y-2">
          <p className="font-bold flex items-center gap-2 text-destructive">⚠️ Règle absolue — Prescripteurs accrédités HUNTERS uniquement</p>
          <p>
            Tout prescripteur (notaire, courtier, agent immobilier, CGP, banquier) doit être préalablement accrédité par HUNTERS Immobilier avant tout démarchage. Vous ne démarcherez jamais un prescripteur en votre nom propre.
          </p>
          <p>
            Si vous identifiez un prescripteur potentiel, signalez-le au Directeur via Workspace. Toute violation constitue un manquement grave au contrat de mandat.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.accept_prescripteurs} onCheckedChange={(c) => setField('accept_prescripteurs', c === true)} className="mt-1" />
          <span className="text-sm">Je m'engage à ne démarcher aucun prescripteur sans accord préalable du Directeur.</span>
        </label>
      </section>

      {/* 5.3 — Objectifs */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Objectifs contractuels</h3>
        <div className="rounded-md border border-hunters-success/40 bg-hunters-success/5 p-4 text-sm space-y-2">
          <p className="font-semibold">Vos objectifs dès le 1er jour — applicables sans période de carence</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>CA HT : 20 000 € / trimestre</li>
            <li>Mandats signés : 2 / trimestre</li>
            <li>Conseil patrimonial : 1 rapport / mois</li>
          </ul>
          <p>Ces 3 indicateurs sont cumulatifs. Un trimestre est ATTEINT uniquement si les 3 sont au vert simultanément.</p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.accept_objectifs} onCheckedChange={(c) => setField('accept_objectifs', c === true)} className="mt-1" />
          <span className="text-sm">Je comprends que les 3 objectifs sont cumulatifs et applicables dès le 1er jour, sans période de carence.</span>
        </label>
      </section>

      {/* 5.4 — Politique de prix */}
      <section>
        <div className="rounded-md border-2 border-destructive bg-destructive/5 p-4 text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p>
            ⚠️ Le conseil patrimonial se facture toujours au tarif plein (1 500 / 2 500 / 3 500 € HT).
            <strong> Aucune remise autorisée, y compris en pack clé en main.</strong>
          </p>
        </div>
      </section>

      {/* 5.5 — Interdiction d'encaissement */}
      <section className="space-y-3">
        <div className="rounded-md border-2 border-destructive bg-destructive/5 p-4 text-sm space-y-2">
          <p className="font-bold flex items-center gap-2 text-destructive">⚠️ Rappel légal obligatoire</p>
          <p>
            Le mandataire est formellement interdit d'encaisser, sous quelque forme que ce soit,
            des sommes provenant des clients (honoraires, acomptes, dépôts de garantie).
          </p>
          <p>
            Tout encaissement est réservé exclusivement à HUNTERS Immobilier.
            Toute violation constitue une faute grave entraînant la résiliation immédiate du contrat.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={form.accept_encaissement} onCheckedChange={(c) => setField('accept_encaissement', c === true)} className="mt-1" />
          <span className="text-sm">Je confirme avoir pris connaissance de l'interdiction formelle d'encaissement direct de fonds clients.</span>
        </label>
      </section>

      {/* 5.5 — Récapitulatif */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif avant activation</h3>
        <dl className="rounded-md border border-border bg-card divide-y divide-border text-sm">
          <Row label="Identité" value={`${form.first_name} ${form.last_name}`} />
          <Row label="Adresse" value={`${form.adresse_rue} — ${form.adresse_cp} ${form.adresse_ville}`} />
          <Row label="Téléphone" value={form.telephone} />
          <Row label="Statut juridique" value={form.statut_juridique || '—'} />
          <Row label="N° RSAC / Greffe" value={`${form.rsac_numero} — ${form.rsac_greffe}`} />
          <Row label="IBAN" value={`•••• •••• •••• ${ibanLast4}`} />
          <Row label="Zone prioritaire" value={zoneInfo?.label || 'Non affectée'} />
          <Row label="Niveau" value="N1" />
          <Row label="Pack mensuel" value="149 € HT / mois — sans franchise" />
        </dl>
      </section>
    </div>
  );
}

// ============ Helpers UI ============

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value || '—'}</dd>
    </div>
  );
}
