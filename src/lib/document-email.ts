// Envoi réel de documents PDF par email — mécanique générique partagée par
// tous les modules (devis, factures, rapports de conseil, documents
// contractuels, rapports de chantier).
//
// Principe (identique au module Signature) : aucun faux succès.
//   non_envoye → envoi_en_cours → envoye | echec
// Le statut est persisté en base sur la ligne du document concerné.
import { supabase } from '@/integrations/supabase/client';

export type DocEmailStatut = 'non_envoye' | 'envoi_en_cours' | 'envoye' | 'echec';

export const DOC_EMAIL_LABELS: Record<DocEmailStatut, string> = {
  non_envoye: 'Non envoyé',
  envoi_en_cours: 'Envoi en cours…',
  envoye: 'Email envoyé',
  echec: "Échec de l'envoi",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valide et normalise une adresse email destinataire. */
export function assertEmail(value: string | null | undefined): string {
  const email = (value || '').trim();
  if (!EMAIL_RE.test(email)) throw new Error('Adresse email du client invalide');
  return email;
}

/** Extrait le contenu base64 (sans préfixe data:) d'un document jsPDF. */
export function pdfToBase64(doc: { output: (t: string) => string }): string {
  const uri = doc.output('datauristring');
  return uri.slice(uri.indexOf(',') + 1);
}

export interface DocumentEmailTracking {
  /** Table portant les colonnes email_statut / email_destinataire / email_envoye_at / email_erreur */
  table: string;
  id: string;
  /** Certaines tables n'ont pas de colonne destinataire dédiée */
  withDestinataire?: boolean;
}

export interface SendDocumentEmailOptions {
  to: string;
  subject: string;
  eyebrow?: string | null;
  title?: string | null;
  /** HTML interne (le gabarit HUNTERS — bandeau vert, eyebrow or — est appliqué côté Edge Function) */
  bodyHtml: string;
  numeroDossier?: string | null;
  cta?: { label: string; url: string } | null;
  pdf?: { filename: string; base64: string } | null;
  tracking?: DocumentEmailTracking | null;
}

async function updateTracking(
  tracking: DocumentEmailTracking | null | undefined,
  patch: Record<string, unknown>,
) {
  if (!tracking) return;
  await (supabase.from(tracking.table as any) as any).update(patch).eq('id', tracking.id);
}

/** Passe la ligne en « Envoi en cours… » avant l'appel réseau. */
export async function markEnvoiEnCours(tracking: DocumentEmailTracking, email: string) {
  await updateTracking(tracking, {
    email_statut: 'envoi_en_cours',
    email_erreur: null,
    ...(tracking.withDestinataire === false ? {} : { email_destinataire: email }),
  });
}

/**
 * Envoie réellement l'email (avec PDF joint) via l'Edge Function send-notification
 * et persiste le statut final. Lève une erreur détaillée en cas d'échec.
 */
export async function sendDocumentEmail(opts: SendDocumentEmailOptions): Promise<void> {
  const email = assertEmail(opts.to);
  let erreur: string | null = null;

  try {
    const { data: res, error: fnErr } = await supabase.functions.invoke('send-notification', {
      body: {
        to: email,
        allow_external: true,
        subject: opts.subject,
        numero_dossier: opts.numeroDossier ?? null,
        eyebrow: opts.eyebrow ?? null,
        title: opts.title ?? null,
        cta: opts.cta ?? null,
        body: opts.bodyHtml,
        ...(opts.pdf
          ? { attachments: [{ filename: opts.pdf.filename, content: opts.pdf.base64 }] }
          : {}),
      },
    });

    if (fnErr) {
      const ctx = (fnErr as any)?.context;
      let detail = fnErr.message;
      try {
        if (ctx && typeof ctx.text === 'function') {
          const raw = await ctx.text();
          detail = JSON.parse(raw)?.error || raw || detail;
        }
      } catch { /* garde le message générique */ }
      erreur = detail;
    } else if (res && (res as any).ok !== true && (res as any).error) {
      erreur = String((res as any).error);
    }
  } catch (e: any) {
    erreur = e?.message || "Erreur réseau lors de l'envoi";
  }

  await updateTracking(opts.tracking, {
    email_statut: erreur ? 'echec' : 'envoye',
    email_erreur: erreur,
    email_envoye_at: erreur ? null : new Date().toISOString(),
    ...(opts.tracking?.withDestinataire === false ? {} : { email_destinataire: email }),
  });

  if (erreur) throw new Error(erreur);
}

/** Nom de fichier PDF sûr (pièce jointe Resend). */
export function safePdfFilename(base: string): string {
  const clean = base.replace(/[^\w .()-]+/g, '_').replace(/_+/g, '_').slice(0, 100);
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
}
