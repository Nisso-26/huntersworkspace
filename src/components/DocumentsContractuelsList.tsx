import { useMemo } from 'react';
import { useDocumentsGeneriques } from '@/hooks/use-modeles-documents';
import { useMandataires } from '@/hooks/use-mandataires';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useModelesDocuments } from '@/hooks/use-modeles-documents';
import { buildDocumentPdf } from '@/lib/document-pdf';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { computeFinancierValues } from '@/lib/document-template';
import type { Dossier } from '@/hooks/use-dossiers';
import type { ModeleSection } from '@/hooks/use-modeles-documents';
import EnvoyerDocumentButton, { EnvoiStatutBadge } from '@/components/EnvoyerDocumentButton';
import { assertEmail, markEnvoiEnCours, pdfToBase64, safePdfFilename, sendDocumentEmail } from '@/lib/document-email';


const SERVICE_LABELS: Record<string, string> = {
  conseil: 'Conseil en investissement',
  chasse: 'Chasse immobilière',
  amo: 'Assistance maîtrise d’ouvrage (AMO)',
  deco: 'Décoration / Ameublement',
  financement: 'Accompagnement financement',
  gestion_locative: 'Gestion locative',
};

export default function DocumentsContractuelsList({ dossier }: { dossier: Dossier }) {
  const { data: items = [], isLoading, refetch } = useDocumentsGeneriques(dossier.id);
  const { data: mandataires = [] } = useMandataires();
  const { data: modeles = [] } = useModelesDocuments({ onlyActive: false });
  const { data: company } = useCompanySettings();

  const nameById = useMemo(
    () => new Map(mandataires.map((m) => [m.id, m.full_name])),
    [mandataires],
  );

  const buildPdf = async (doc: any) => {
    const modele = modeles.find((m) => m.id === doc.modele_id);
    if (!modele) throw new Error('Modèle introuvable');
    const snap = (doc.contenu || {}) as any;
    const sections = (modele.contenu_template?.sections || []) as ModeleSection[];
    const financierValues: Record<string, Record<string, number>> = snap.financierValues || {};
    return buildDocumentPdf({
      titre: doc.titre || modele.titre,
      sections,
      variables: snap.variables || {},
      financierValues,
      textOverrides: snap.textOverrides || {},
      services: snap.services || {},
      serviceLabels: SERVICE_LABELS,
      numeroDossier: dossier.numero_dossier,
      conseiller: nameById.get(doc.genere_par || '') || '',
      company,
      avecCouverture: true,
    });
  };

  const regenerate = async (doc: any) => {
    try {
      const pdf = await buildPdf(doc);
      const safe = (doc.titre || 'document').replace(/[^a-z0-9_-]+/gi, '_');
      pdf.save(`${safe}_${dossier.numero_dossier || dossier.id.slice(0, 8)}.pdf`);
    } catch (e: any) {
      toast.error(e.message || 'Erreur');
    }
  };

  const envoyer = async (doc: any, email: string) => {
    const to = assertEmail(email);
    const tracking = { table: 'documents_generiques', id: doc.id };
    const titre = doc.titre || 'Document contractuel';
    try {
      const pdf = await buildPdf(doc);
      const base64 = pdfToBase64(pdf as any);
      await markEnvoiEnCours(tracking, to);
      refetch();
      await sendDocumentEmail({
        to,
        tracking,
        subject: `${titre} — HUNTERS Immobilier`,
        eyebrow: 'Document contractuel',
        title: titre,
        numeroDossier: dossier.numero_dossier,
        pdf: { filename: safePdfFilename(titre), base64 },
        bodyHtml: `
          <p>Bonjour,</p>
          <p>Vous trouverez ci-joint le document <strong>${titre}</strong> relatif à votre dossier.</p>
          <p>Nous restons à votre disposition pour toute question.</p>
          <p>Bien à vous,<br/>L'équipe HUNTERS Immobilier</p>`,
      });
      await (supabase.from('documents_generiques') as any)
        .update({ statut: 'envoye', email_destinataire: to, date_envoi: new Date().toISOString() })
        .eq('id', doc.id);
      toast.success(`Document envoyé à ${to}`);
    } catch (e: any) {
      toast.error(e.message || "Échec de l'envoi du document");
      throw Object.assign(e instanceof Error ? e : new Error(String(e)), { __handled: true });
    } finally {
      refetch();
    }
  };

  return (
    <div className="space-y-3 border-t pt-4 mt-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#004621]" />
        Documents contractuels ({items.length})
      </h4>

      {isLoading ? (
        <Skeleton className="h-10 rounded" />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Aucun document contractuel généré.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((d: any) => (
            <li
              key={d.id}
              className="px-2.5 py-2 rounded-md bg-secondary/50 space-y-1.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="w-4 h-4 text-[#004621]" />
                <span className="text-xs font-medium text-foreground flex-1 min-w-0">
                  {d.titre || 'Document'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(d.date_generation).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {d.genere_par && nameById.get(d.genere_par) && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    · {nameById.get(d.genere_par)}
                  </span>
                )}
                <Badge
                  className={
                    d.statut === 'envoye'
                      ? 'bg-[#004621] text-white'
                      : 'bg-[#E8F2EC] text-[#004621] border border-[#004621]/20'
                  }
                >
                  {d.statut === 'envoye' ? 'Envoyé' : 'Généré'}
                </Badge>
                <Button size="sm" variant="ghost" onClick={() => regenerate(d)} title="Télécharger">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => regenerate(d)} title="Régénérer">
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
                <EnvoyerDocumentButton
                  documentLabel={d.titre || 'Document contractuel'}
                  statut={d.email_statut}
                  destinataire={d.email_destinataire}
                  envoyeAt={d.email_envoye_at}
                  erreur={d.email_erreur}
                  defaultEmail={dossier.email}
                  onSend={(email) => envoyer(d, email)}
                />
              </div>
              {d.email_statut && d.email_statut !== 'non_envoye' && (
                <EnvoiStatutBadge
                  statut={d.email_statut}
                  destinataire={d.email_destinataire}
                  envoyeAt={d.email_envoye_at}
                  erreur={d.email_erreur}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

