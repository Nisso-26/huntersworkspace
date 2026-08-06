// Journal d'envoi pour les documents PDF générés à la volée (rapport de chantier,
// compte-rendu de visite…) qui n'ont pas de ligne dédiée en base.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  assertEmail, markEnvoiEnCours, safePdfFilename, sendDocumentEmail,
  type DocEmailStatut,
} from '@/lib/document-email';

export interface EnvoiDocument {
  id: string;
  dossier_id: string | null;
  chantier_id: string | null;
  contexte: string;
  document_nom: string;
  destinataire: string | null;
  email_statut: DocEmailStatut;
  email_envoye_at: string | null;
  email_erreur: string | null;
  created_at: string;
}

export function useEnvoisDocuments(filters: { chantierId?: string; dossierId?: string; contexte?: string }) {
  const { chantierId, dossierId, contexte } = filters;
  return useQuery({
    queryKey: ['envois-documents', chantierId || null, dossierId || null, contexte || null],
    queryFn: async () => {
      let q = (supabase.from('envois_documents') as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (chantierId) q = q.eq('chantier_id', chantierId);
      if (dossierId) q = q.eq('dossier_id', dossierId);
      if (contexte) q = q.eq('contexte', contexte);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EnvoiDocument[];
    },
    enabled: !!(chantierId || dossierId),
  });
}

export interface EnvoiAdHocPayload {
  contexte: string;
  documentNom: string;
  chantierId?: string | null;
  dossierId?: string | null;
  email: string;
  subject: string;
  eyebrow?: string;
  title?: string;
  bodyHtml: string;
  numeroDossier?: string | null;
  pdfBase64: string;
}

/** Envoi réel d'un PDF généré à la volée, avec trace persistée dans envois_documents. */
export function useEnvoyerDocumentAdHoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: EnvoiAdHocPayload) => {
      const to = assertEmail(p.email);
      const { data, error } = await (supabase.from('envois_documents') as any)
        .insert({
          contexte: p.contexte,
          document_nom: p.documentNom,
          chantier_id: p.chantierId || null,
          dossier_id: p.dossierId || null,
          destinataire: to,
          email_statut: 'envoi_en_cours',
        })
        .select()
        .single();
      if (error) throw error;

      const tracking = { table: 'envois_documents', id: (data as any).id, withDestinataire: false };
      await markEnvoiEnCours(tracking, to);
      qc.invalidateQueries({ queryKey: ['envois-documents'] });

      try {
        await sendDocumentEmail({
          to,
          tracking,
          subject: p.subject,
          eyebrow: p.eyebrow ?? null,
          title: p.title ?? null,
          numeroDossier: p.numeroDossier ?? null,
          bodyHtml: p.bodyHtml,
          pdf: { filename: safePdfFilename(p.documentNom), base64: p.pdfBase64 },
        });
      } finally {
        qc.invalidateQueries({ queryKey: ['envois-documents'] });
      }
      return { to };
    },
    onSuccess: ({ to }) => toast.success(`Document envoyé à ${to}`),
    onError: (e: any) => toast.error(e?.message || "Échec de l'envoi du document"),
  });
}
