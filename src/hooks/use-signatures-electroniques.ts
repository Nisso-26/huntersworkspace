import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CompanySettings } from '@/hooks/use-company-settings';
import {
  buildSignatureDocumentPdf,
  signatureDocFileName,
  type SignatureDocType,
} from '@/lib/signature-documents';


export const SIGNATURES_BUCKET = 'signatures';

export type TypeDocumentSignature =
  | 'convention_cadre'
  | 'bon_commande'
  | 'mandat_recherche'
  | 'contrat_mandataire'
  | 'offre_achat';

export const TYPES_DOCUMENT_SIGNATURE: { value: TypeDocumentSignature; label: string }[] = [
  { value: 'convention_cadre', label: 'Convention de Mission Cadre' },
  { value: 'bon_commande', label: 'Bon de Commande de Mission' },
  { value: 'mandat_recherche', label: 'Mandat de Recherche' },
  { value: 'offre_achat', label: "Offre d'Achat" },
  { value: 'contrat_mandataire', label: 'Contrat de Mandataire' },
];

export const STATUT_SIGNATURE_LABELS: Record<string, string> = {
  en_attente: 'En attente de signature',
  signe: 'Signé',
  expire: 'Expiré',
  refuse: 'Refusé',
};

export const EMAIL_STATUT_LABELS: Record<string, string> = {
  envoi_en_cours: 'Envoi en cours…',
  envoye: 'Email envoyé',
  echec: "Échec de l'envoi",
};

export interface SignatureElectronique {
  id: string;
  dossier_id: string | null;
  mandataire_id: string;
  signataire_nom: string;
  signataire_email: string;
  type_document: TypeDocumentSignature;
  document_url: string | null;
  document_nom: string | null;
  token: string;
  statut: string;
  signature_type: string | null;
  ip_address: string | null;
  motif_refus: string | null;
  created_at: string;
  expires_at: string;
  signed_at: string | null;
  document_signe_url: string | null;
  email_statut: string;
  email_envoye_at: string | null;
  email_erreur: string | null;
  relance_envoyee_at: string | null;
}

export function useSignaturesElectroniques(dossierId?: string | null, mandataireId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['signatures-electroniques', dossierId ?? null, mandataireId ?? null],
    queryFn: async () => {
      let q = supabase
        .from('signatures_electroniques')
        .select('*')
        .order('created_at', { ascending: false });
      if (dossierId) q = q.eq('dossier_id', dossierId);
      if (mandataireId) q = q.eq('mandataire_id', mandataireId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SignatureElectronique[];
    },
    enabled: !!user,
  });
}

interface CreatePayload {
  dossier_id?: string | null;
  type_document: TypeDocumentSignature;
  signataire_nom: string;
  signataire_email: string;
  document_nom?: string | null;
  /** PDF fourni manuellement (cas secondaire). Prioritaire sur autoDoc. */
  file?: File | null;
  /** Génération automatique du document contractuel depuis les données du dossier. */
  autoDoc?: {
    type: SignatureDocType;
    fields: Record<string, string>;
    company?: Partial<CompanySettings> | null;
  } | null;
  numero_dossier?: string | null;
}


function buildLien(token: string) {
  return `${window.location.origin}/signer/${token}`;
}

function labelDoc(type: string) {
  return TYPES_DOCUMENT_SIGNATURE.find(t => t.value === type)?.label ?? type;
}

/** Envoie l'email au signataire et met à jour l'état d'envoi persisté. */
async function envoyerEmailSignature(
  row: SignatureElectronique,
  opts: { numeroDossier?: string | null; rappel?: boolean },
) {
  const label = labelDoc(row.type_document);
  const lien = buildLien(row.token);
  const echeance = new Date(row.expires_at).toLocaleDateString('fr-FR');

  const body = opts.rappel
    ? `<p style="margin:0 0 12px;">Bonjour ${row.signataire_nom},</p>
       <p style="margin:0 0 12px;">Le document <strong style="color:#23291F;">${label}</strong> attend toujours votre signature.</p>
       <p style="margin:0;font-size:11px;">Valable jusqu'au ${echeance}.</p>`
    : `<p style="margin:0 0 12px;">Bonjour ${row.signataire_nom},</p>
       <p style="margin:0 0 12px;">Un document vous est adressé pour signature électronique :
       <strong style="color:#23291F;">${label}</strong>${row.document_nom ? ` — ${row.document_nom}` : ''}.</p>
       <p style="margin:0;font-size:11px;">Ce lien personnel est valable jusqu'au <strong>${echeance}</strong>. Ne le transmettez à personne.</p>`;

  let erreur: string | null = null;
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        to: row.signataire_email,
        // Le signataire est un client externe : autorisé car déjà enregistré en base.
        allow_external: true,

        subject: opts.rappel ? `Rappel — document à signer : ${label}` : `Document à signer — ${label}`,
        numero_dossier: opts.numeroDossier ?? null,
        eyebrow: 'Signature électronique',
        title: opts.rappel ? 'Rappel de signature' : 'Document à signer',
        cta: { label: 'Signer le document', url: lien },
        body,
      },
    });
    if (error) {
      // Remonte le message réel renvoyé par la fonction (email invalide, refus Resend…)
      const ctx = (error as any)?.context;
      let detail = error.message;
      try {
        if (ctx && typeof ctx.text === 'function') {
          const raw = await ctx.text();
          detail = JSON.parse(raw)?.error || raw || detail;
        }
      } catch { /* garde le message générique */ }
      erreur = detail;
    } else if (data && (data as any).ok !== true && (data as any).error) {
      erreur = String((data as any).error);
    }
  } catch (e: any) {
    erreur = e?.message || "Erreur réseau lors de l'envoi";
  }

  await supabase
    .from('signatures_electroniques')
    .update({
      email_statut: erreur ? 'echec' : 'envoye',
      email_erreur: erreur,
      email_envoye_at: erreur ? null : new Date().toISOString(),
      ...(opts.rappel && !erreur ? { relance_envoyee_at: new Date().toISOString() } : {}),
    } as any)
    .eq('id', row.id);

  if (erreur) throw new Error(erreur);
}

export function useEnvoyerEnSignature() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      if (!user) throw new Error('Non authentifié');

      let documentPath: string | null = null;
      let documentNom = payload.document_nom || null;

      if (payload.file) {
        if (payload.file.type !== 'application/pdf') throw new Error('Le document doit être un PDF');
        documentPath = `sources/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(SIGNATURES_BUCKET)
          .upload(documentPath, payload.file, { contentType: 'application/pdf', upsert: false });
        if (upErr) throw upErr;
      } else if (payload.autoDoc) {
        // Génération automatique du PDF à la charte depuis les champs (éventuellement corrigés)
        const doc = await buildSignatureDocumentPdf(
          payload.autoDoc.type,
          payload.autoDoc.fields,
          { company: payload.autoDoc.company ?? null },
        );
        const blob = doc.output('blob') as Blob;
        const nomFichier = signatureDocFileName(payload.autoDoc.type, payload.autoDoc.fields);
        documentPath = `sources/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(SIGNATURES_BUCKET)
          .upload(documentPath, blob, { contentType: 'application/pdf', upsert: false });
        if (upErr) throw upErr;
        if (!documentNom) documentNom = nomFichier.replace(/\.pdf$/, '');
      }


      const { data, error } = await supabase
        .from('signatures_electroniques')
        .insert({
          dossier_id: payload.dossier_id ?? null,
          mandataire_id: user.id,
          type_document: payload.type_document,
          signataire_nom: payload.signataire_nom,
          signataire_email: payload.signataire_email,
          document_nom: payload.document_nom || null,
          document_url: documentPath,
          email_statut: 'envoi_en_cours',
        } as any)
        .select()
        .single();
      if (error) throw error;

      const row = data as unknown as SignatureElectronique;
      // Rend la ligne visible immédiatement en « Envoi en cours… »
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      await envoyerEmailSignature(row, { numeroDossier: payload.numero_dossier });
      return row;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.success(`Email envoyé à ${row.signataire_email}`);
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.error(`Échec de l'envoi de l'email : ${e.message}`, { duration: 10000 });
    },
  });
}

export function useRelancerSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SignatureElectronique) => {
      await supabase
        .from('signatures_electroniques')
        .update({ email_statut: 'envoi_en_cours', email_erreur: null } as any)
        .eq('id', row.id);
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      await envoyerEmailSignature(row, { rappel: true });
      return row;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.success(`Email renvoyé à ${row.signataire_email}`);
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.error(`Échec du renvoi : ${e.message}`, { duration: 10000 });
    },
  });
}

export function useAnnulerSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('signatures_electroniques').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.success('Demande annulée');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export async function telechargerDocumentSigne(path: string) {
  const { data, error } = await supabase.storage
    .from(SIGNATURES_BUCKET)
    .createSignedUrl(path, 120, { download: true });
  if (error || !data?.signedUrl) {
    toast.error('Téléchargement impossible');
    return;
  }
  window.open(data.signedUrl, '_blank');
}
