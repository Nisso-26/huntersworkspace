import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  file?: File | null;
  numero_dossier?: string | null;
}

export function useEnvoyerEnSignature() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreatePayload) => {
      if (!user) throw new Error('Non authentifié');

      let documentPath: string | null = null;
      if (payload.file) {
        if (payload.file.type !== 'application/pdf') throw new Error('Le document doit être un PDF');
        documentPath = `sources/${crypto.randomUUID()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from(SIGNATURES_BUCKET)
          .upload(documentPath, payload.file, { contentType: 'application/pdf', upsert: false });
        if (upErr) throw upErr;
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
        } as any)
        .select()
        .single();
      if (error) throw error;

      const row = data as unknown as SignatureElectronique;
      const label =
        TYPES_DOCUMENT_SIGNATURE.find(t => t.value === payload.type_document)?.label ??
        payload.type_document;
      const lien = `${window.location.origin}/signer/${row.token}`;
      const echeance = new Date(row.expires_at).toLocaleDateString('fr-FR');

      const { error: mailErr } = await supabase.functions.invoke('send-notification', {
        body: {
          to: payload.signataire_email,
          subject: `Document à signer — ${label}`,
          numero_dossier: payload.numero_dossier ?? null,
          eyebrow: 'Signature électronique',
          title: 'Document à signer',
          cta: { label: 'Signer le document', url: lien },
          body: `<p style="margin:0 0 12px;">Bonjour ${payload.signataire_nom},</p>
            <p style="margin:0 0 12px;">Un document vous est adressé pour signature électronique :
            <strong style="color:#23291F;">${label}</strong>${payload.document_nom ? ` — ${payload.document_nom}` : ''}.</p>
            <p style="margin:0;font-size:11px;">Ce lien personnel est valable jusqu'au <strong>${echeance}</strong>. Ne le transmettez à personne.</p>`,

        },
      });
      if (mailErr) throw new Error("Demande créée mais l'email n'a pas pu être envoyé");

      return row;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.success(`Demande de signature envoyée à ${row.signataire_email}`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRelancerSignature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: SignatureElectronique) => {
      const label =
        TYPES_DOCUMENT_SIGNATURE.find(t => t.value === row.type_document)?.label ?? row.type_document;
      const lien = `${window.location.origin}/signer/${row.token}`;
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          to: row.signataire_email,
          subject: `Rappel — document à signer : ${label}`,
          eyebrow: 'Signature électronique',
          title: 'Rappel de signature',
          cta: { label: 'Signer le document', url: lien },
          body: `<p style="margin:0 0 12px;">Bonjour ${row.signataire_nom},</p>
            <p style="margin:0 0 12px;">Le document <strong style="color:#23291F;">${label}</strong> attend toujours votre signature.</p>
            <p style="margin:0;font-size:11px;">Valable jusqu'au ${new Date(row.expires_at).toLocaleDateString('fr-FR')}.</p>`,

        },
      });
      if (error) throw error;
      await supabase
        .from('signatures_electroniques')
        .update({ relance_envoyee_at: new Date().toISOString() } as any)
        .eq('id', row.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures-electroniques'] });
      toast.success('Relance envoyée');
    },
    onError: (e: any) => toast.error(e.message),
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
