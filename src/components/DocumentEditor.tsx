import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Download, X, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { useMandataires } from '@/hooks/use-mandataires';
import {
  computeFinancierValues,
  interpolate,
  formatNumber,
} from '@/lib/document-template';
import { buildDocumentPdf } from '@/lib/document-pdf';
import { fmtPdfEur } from '@/lib/pdf-utils';
import type { ModeleDocument, ModeleSection } from '@/hooks/use-modeles-documents';
import type { Dossier } from '@/hooks/use-dossiers';

const SERVICE_LABELS: Record<string, string> = {
  conseil: 'Conseil en investissement',
  chasse: 'Chasse immobilière',
  amo: 'Assistance maîtrise d’ouvrage (AMO)',
  deco: 'Décoration / Ameublement',
  financement: 'Accompagnement financement',
  gestion_locative: 'Gestion locative',
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modele: ModeleDocument;
  dossier: Dossier;
  onGenerated?: () => void;
}

export default function DocumentEditor({ open, onOpenChange, modele, dossier, onGenerated }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: company } = useCompanySettings();
  const { data: mandataires = [] } = useMandataires();

  const conseiller = mandataires.find((m) => m.id === dossier.mandataire_id)?.full_name || '';
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Variables texte
  const baseVariables = useMemo<Record<string, any>>(() => ({
    nom_client: dossier.client_name || '',
    email_client: dossier.email || '',
    telephone_client: dossier.phone || '',
    ville: dossier.ville || '',
    budget: dossier.budget ? fmtPdfEur(dossier.budget) : '',
    conseiller,
    numero_dossier: dossier.numero_dossier || '',
    date: today,
    honoraires: dossier.honoraires ? fmtPdfEur(dossier.honoraires) : '',
  }), [dossier, conseiller, today]);

  const sections = (modele.contenu_template?.sections || []) as ModeleSection[];

  // Auto source pour champs financiers (auto_from)
  const autoSource = useMemo<Record<string, number>>(() => ({
    budget: Number(dossier.budget) || 0,
    honoraires: Number(dossier.honoraires) || 0,
    apport_disponible: Number((dossier as any).apport_disponible) || 0,
    revenus_nets_mensuels: Number((dossier as any).revenus_nets_mensuels) || 0,
    revenus_locatifs_existants: Number((dossier as any).revenus_locatifs_existants) || 0,
    charges_mensuelles_fixes: Number((dossier as any).charges_mensuelles_fixes) || 0,
  }), [dossier]);

  // État éditable : saisies financières par section + textes par section + variables
  const [variables, setVariables] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(baseVariables).map(([k, v]) => [k, String(v ?? '')])),
  );
  const [financierSaisies, setFinancierSaisies] = useState<Record<string, Record<string, number>>>({});
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Calcul des valeurs financières
  const financierValues = useMemo<Record<string, Record<string, number>>>(() => {
    const out: Record<string, Record<string, number>> = {};
    for (const s of sections) {
      if (s.type === 'financier' && s.champs) {
        out[s.id] = computeFinancierValues(s.champs as any, financierSaisies[s.id] || {}, autoSource);
      }
    }
    return out;
  }, [sections, financierSaisies, autoSource]);

  // Services souscrits
  const services = (dossier.services_souscrits || {}) as Record<string, boolean>;

  const handleVariable = (k: string, v: string) =>
    setVariables((prev) => ({ ...prev, [k]: v }));

  const handleFinancier = (sectionId: string, key: string, value: string) => {
    const n = value === '' ? NaN : Number(value.replace(',', '.'));
    setFinancierSaisies((prev) => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [key]: n },
    }));
  };

  const handleText = (sectionId: string, value: string) =>
    setTextOverrides((prev) => ({ ...prev, [sectionId]: value }));

  const buildPdf = () =>
    buildDocumentPdf({
      titre: modele.titre,
      sections,
      variables,
      financierValues,
      textOverrides,
      services,
      serviceLabels: SERVICE_LABELS,
      numeroDossier: dossier.numero_dossier,
      conseiller,
      company,
    });

  const handleExport = async () => {
    setSaving(true);
    try {
      const pdf = buildPdf();
      const safeTitre = modele.titre.replace(/[^a-z0-9_-]+/gi, '_');
      const filename = `${safeTitre}_${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`;
      pdf.save(filename);

      const snapshot = {
        variables,
        financierValues,
        textOverrides,
        services,
      };
      const { error } = await (supabase.from('documents_generiques') as any).insert({
        dossier_id: dossier.id,
        modele_id: modele.id,
        titre: modele.titre,
        type_export: modele.categorie,
        numero_dossier: dossier.numero_dossier,
        genere_par: user?.id,
        statut: 'genere',
        contenu: snapshot,
      });
      if (error) throw error;
      toast.success('Document généré et archivé');
      onGenerated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la génération');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Rendu de l'éditeur ----------
  const renderEditor = () => (
    <div className="space-y-6">
      {/* Variables */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[#1A4D2E]">Variables du dossier</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.keys(baseVariables).map((k) => {
            const empty = !variables[k];
            return (
              <div key={k} className="space-y-1">
                <Label className="text-xs capitalize">{k.replace(/_/g, ' ')}</Label>
                <Input
                  value={variables[k] || ''}
                  onChange={(e) => handleVariable(k, e.target.value)}
                  className={
                    empty
                      ? 'bg-orange-50 border-orange-300'
                      : 'bg-[#F5F8F5]'
                  }
                  placeholder={empty ? 'À compléter' : ''}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Sections */}
      {sections.map((section) => {
        if (section.type === 'header') return null;
        if (section.type === 'text') {
          const raw = textOverrides[section.id] ?? section.contenu ?? '';
          return (
            <section key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-[#1A4D2E]">{section.titre}</h3>
              <Textarea
                rows={6}
                value={raw}
                onChange={(e) => handleText(section.id, e.target.value)}
                className="bg-[#F5F8F5] font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Variables disponibles : {Object.keys(baseVariables).map((k) => `{{${k}}}`).join(', ')}
              </p>
            </section>
          );
        }
        if (section.type === 'financier') {
          const values = financierValues[section.id] || {};
          return (
            <section key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-[#1A4D2E]">{section.titre}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(section.champs || []).map((c) => {
                  const v = values[c.key] ?? 0;
                  const isCalc = c.type === 'calc';
                  return (
                    <div key={c.key} className="space-y-1">
                      <Label className="text-xs flex items-center justify-between">
                        <span>{c.label}</span>
                        {isCalc && (
                          <span className="text-[10px] text-green-700 font-normal">calculé automatiquement</span>
                        )}
                      </Label>
                      {isCalc ? (
                        <Input
                          readOnly
                          value={formatNumber(v)}
                          className="bg-green-50 text-green-800 border-green-200 font-semibold"
                        />
                      ) : (
                        <Input
                          type="number"
                          step="0.01"
                          value={
                            financierSaisies[section.id]?.[c.key] !== undefined &&
                            !Number.isNaN(financierSaisies[section.id]?.[c.key])
                              ? String(financierSaisies[section.id][c.key])
                              : String(v)
                          }
                          onChange={(e) => handleFinancier(section.id, c.key, e.target.value)}
                          className="bg-[#F5F8F5]"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }
        if (section.type === 'services_conditionnels') {
          const active = Object.keys(services).filter((k) => services[k]);
          return (
            <section key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-[#1A4D2E]">{section.titre}</h3>
              <div className="flex flex-wrap gap-2">
                {active.length === 0 ? (
                  <span className="text-xs italic text-muted-foreground">Aucun service souscrit</span>
                ) : (
                  active.map((k) => (
                    <Badge key={k} className="bg-[#E8F2EC] text-[#1A4D2E] border border-[#1A4D2E]/20">
                      {SERVICE_LABELS[k] || k}
                    </Badge>
                  ))
                )}
              </div>
            </section>
          );
        }
        if (section.type === 'signatures') {
          return (
            <section key={section.id} className="space-y-2">
              <h3 className="text-sm font-semibold text-[#1A4D2E]">{section.titre}</h3>
              <p className="text-xs text-muted-foreground">
                Les blocs de signature seront ajoutés automatiquement à la fin du PDF.
              </p>
            </section>
          );
        }
        return null;
      })}
    </div>
  );

  // ---------- Aperçu ----------
  const renderPreview = () => (
    <div className="space-y-4 text-sm">
      <div className="border-b-2 border-[#F5A800] pb-2">
        <p className="text-xs text-muted-foreground">
          {company?.adresse_siege || '45 Rue Michel Colombe, 37000 Tours'} ·{' '}
          {company?.telephone || '+33 2 59 16 03 37'} ·{' '}
          {company?.email_contact || 'hunters@huntersimmobilier.fr'}
        </p>
        <h2 className="text-xl font-bold text-[#1A4D2E] mt-2">{modele.titre}</h2>
        {dossier.numero_dossier && (
          <p className="text-xs text-muted-foreground">Réf. {dossier.numero_dossier}</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Tours, le {today}</p>
        {variables.nom_client && <p>Client : {variables.nom_client}</p>}
        {conseiller && <p>Conseiller : {conseiller}</p>}
      </div>

      {sections.map((section) => {
        if (section.type === 'header') return null;
        if (section.type === 'text') {
          const raw = textOverrides[section.id] ?? section.contenu ?? '';
          return (
            <div key={section.id}>
              <h3 className="text-xs font-bold text-[#1A4D2E] uppercase tracking-wider mb-1">
                {section.titre}
              </h3>
              <p className="text-xs whitespace-pre-wrap text-[#2C2C2C]">
                {interpolate(raw, variables)}
              </p>
            </div>
          );
        }
        if (section.type === 'financier') {
          const values = financierValues[section.id] || {};
          return (
            <div key={section.id}>
              <h3 className="text-xs font-bold text-[#1A4D2E] uppercase tracking-wider mb-1">
                {section.titre}
              </h3>
              <table className="w-full text-xs border">
                <tbody>
                  {(section.champs || []).map((c) => {
                    const v = values[c.key] ?? 0;
                    const isPct = /(%|pct|taux|rentabilite|vacance)/i.test(c.key);
                    return (
                      <tr key={c.key} className="border-b last:border-0">
                        <td className="px-2 py-1">{c.label}</td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {isPct ? `${formatNumber(v)} %` : fmtPdfEur(v)}
                        </td>
                        <td className="px-2 py-1 text-[10px] text-muted-foreground">
                          {c.type === 'calc' ? 'Calculé' : 'Saisie'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        if (section.type === 'services_conditionnels') {
          const active = Object.keys(services).filter((k) => services[k]);
          return (
            <div key={section.id}>
              <h3 className="text-xs font-bold text-[#1A4D2E] uppercase tracking-wider mb-1">
                {section.titre}
              </h3>
              <ul className="text-xs list-disc pl-5">
                {active.map((k) => (
                  <li key={k}>{SERVICE_LABELS[k] || k}</li>
                ))}
              </ul>
            </div>
          );
        }
        return null;
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-[#1A4D2E]">
            <FileText className="w-5 h-5" />
            {modele.titre}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isMobile ? (
            <Tabs defaultValue="edit" className="h-full flex flex-col">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="edit">Édition</TabsTrigger>
                <TabsTrigger value="preview" className="gap-1">
                  <Eye className="w-3.5 h-3.5" /> Aperçu
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="flex-1 overflow-y-auto px-4 pb-4">
                {renderEditor()}
              </TabsContent>
              <TabsContent value="preview" className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="bg-white border rounded-md p-4">{renderPreview()}</div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="grid grid-cols-2 h-full">
              <div className="overflow-y-auto p-6 border-r">{renderEditor()}</div>
              <div className="overflow-y-auto p-6 bg-muted/30">
                <div className="bg-white border rounded-md p-6 shadow-sm">{renderPreview()}</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t flex items-center justify-end gap-2 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="w-4 h-4 mr-1" /> Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={saving}
            className="bg-[#F5A800] hover:bg-[#F5A800]/90 text-[#2C2C2C] font-semibold"
          >
            <Download className="w-4 h-4 mr-1" />
            {saving ? 'Génération…' : 'Exporter en PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
