import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { GraduationCap, ShieldCheck, Upload, FileText, Calendar, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import { useConformite, useUpsertConformite, uploadJustificatif, getJustificatifUrl } from '@/hooks/use-conformite';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const formationBadge = (s: string) => {
  if (s === 'conforme') return <Badge className="bg-hunters-success/15 text-hunters-success hover:bg-hunters-success/15"><CheckCircle2 className="w-3 h-3 mr-1" />Conforme</Badge>;
  if (s === 'en_cours') return <Badge className="bg-[#F5A800]/15 text-[#F5A800] hover:bg-[#F5A800]/15"><AlertTriangle className="w-3 h-3 mr-1" />En cours</Badge>;
  return <Badge variant="destructive">Non conforme</Badge>;
};
const attestBadge = (s: string, fin: string | null) => {
  if (s === 'valide') return <Badge className="bg-hunters-success/15 text-hunters-success hover:bg-hunters-success/15">Valide</Badge>;
  if (s === 'expirante') {
    const j = fin ? Math.max(0, Math.ceil((new Date(fin).getTime() - Date.now()) / 86400000)) : 0;
    return <Badge className="bg-[#F5A800]/15 text-[#F5A800] hover:bg-[#F5A800]/15">Expire dans {j}j</Badge>;
  }
  if (s === 'expiree') return <Badge variant="destructive">Expirée</Badge>;
  return <Badge variant="outline">Inactive</Badge>;
};

interface Props {
  mandataireId: string;
  readonly?: boolean;
}

export default function ConformiteTab({ mandataireId, readonly = false }: Props) {
  const { isAdmin } = useAuth();
  const { data: c } = useConformite(mandataireId);
  const upsert = useUpsertConformite();
  const fileRef = useRef<HTMLInputElement>(null);

  const [heures, setHeures] = useState<string>(c?.heures_formation_annee?.toString() || '0');
  const [debut, setDebut] = useState<string>(c?.attestation_debut || '');
  const [fin, setFin] = useState<string>(c?.attestation_fin || '');

  // Sync local state when data loads
  const [hydrated, setHydrated] = useState(false);
  if (c && !hydrated) {
    setHydrated(true);
    setHeures(String(c.heures_formation_annee));
    setDebut(c.attestation_debut || '');
    setFin(c.attestation_fin || '');
  }

  const pct = Math.min(100, Math.round((Number(heures) / 14) * 100));
  const restant = Math.max(0, 14 - Number(heures));
  const annee = new Date().getFullYear();
  const echeance = `31/01/${annee + 1}`;

  const handleUpload = async (file: File) => {
    try {
      const path = await uploadJustificatif(mandataireId, file);
      const justificatifs = [...(c?.justificatifs || []), { path, name: file.name, uploaded_at: new Date().toISOString() }];
      await upsert.mutateAsync({
        mandataire_id: mandataireId,
        annee,
        heures_formation_annee: Number(heures) || 0,
        justificatifs,
        attestation_debut: debut || null as any,
        attestation_fin: fin || null as any,
      });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSave = async () => {
    await upsert.mutateAsync({
      mandataire_id: mandataireId,
      annee,
      heures_formation_annee: Number(heures) || 0,
      justificatifs: c?.justificatifs || [],
      attestation_debut: debut || null as any,
      attestation_fin: fin || null as any,
    });
  };

  const handleRenouveler = async () => {
    const today = new Date();
    const newFin = new Date(today); newFin.setFullYear(newFin.getFullYear() + 1);
    setDebut(today.toISOString().slice(0, 10));
    setFin(newFin.toISOString().slice(0, 10));
    await upsert.mutateAsync({
      mandataire_id: mandataireId,
      annee,
      heures_formation_annee: Number(heures) || 0,
      justificatifs: c?.justificatifs || [],
      attestation_debut: today.toISOString().slice(0, 10) as any,
      attestation_fin: newFin.toISOString().slice(0, 10) as any,
      suspendu: false,
    });
  };

  const handleRevoquer = async () => {
    if (!confirm('Révoquer l\'attestation de ce mandataire ?')) return;
    await upsert.mutateAsync({
      mandataire_id: mandataireId,
      annee,
      heures_formation_annee: Number(heures) || 0,
      justificatifs: c?.justificatifs || [],
      attestation_debut: null as any,
      attestation_fin: null as any,
      suspendu: true,
    });
  };

  const openFile = async (path: string) => {
    const url = await getJustificatifUrl(path);
    if (url) window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Formation ALUR */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#1A4D2E]" />
            <h3 className="font-heading font-semibold">Formation ALUR — {annee}</h3>
          </div>
          {formationBadge(c?.statut_formation || 'non_conforme')}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Heures validées</span>
            <span className="font-semibold">{heures} / 14 h</span>
          </div>
          <Progress value={pct} className="h-2" />
          {restant > 0 && (
            <p className="text-xs text-muted-foreground">
              Il vous reste <strong className="text-foreground">{restant} h</strong> à valider avant le {echeance}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Heures de formation</Label>
            <Input
              type="number"
              step="0.5"
              value={heures}
              onChange={e => setHeures(e.target.value)}
              disabled={readonly}
            />
          </div>
          <div className="space-y-1 flex flex-col">
            <Label className="text-xs">Justificatif (PDF, image)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={readonly}>
              <Upload className="w-4 h-4 mr-2" />Téléverser
            </Button>
          </div>
        </div>

        {c?.justificatifs && c.justificatifs.length > 0 && (
          <div className="border rounded-md divide-y">
            {c.justificatifs.map((j, i) => (
              <button
                key={i}
                onClick={() => openFile(j.path)}
                className="w-full p-2.5 flex items-center gap-2 hover:bg-muted/40 text-left text-sm"
              >
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1 truncate">{j.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(j.uploaded_at).toLocaleDateString('fr-FR')}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Attestation */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1A4D2E]" />
            <h3 className="font-heading font-semibold">Attestation d'habilitation</h3>
          </div>
          {attestBadge(c?.statut_attestation || 'inactive', c?.attestation_fin || null)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Date d'émission</Label>
            <Input type="date" value={debut} onChange={e => setDebut(e.target.value)} disabled={readonly && !isAdmin} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date d'expiration</Label>
            <Input type="date" value={fin} onChange={e => setFin(e.target.value)} disabled={readonly && !isAdmin} />
          </div>
        </div>

        {c?.suspendu && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Attestation suspendue — accès aux outils bloqué.
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={handleSave} disabled={upsert.isPending}>
            <Calendar className="w-4 h-4 mr-2" />Enregistrer
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={handleRenouveler} disabled={upsert.isPending}>
                <RotateCw className="w-4 h-4 mr-2" />Renouveler
              </Button>
              <Button variant="outline" className="text-destructive" onClick={handleRevoquer} disabled={upsert.isPending}>
                Révoquer
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
