import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type DevisStatut = 'brouillon' | 'envoye' | 'accepte' | 'refuse';

export interface DevisLigne {
  service: 'conseil' | 'chasse' | 'amo' | 'deco';
  label: string;
  base: number;
  detail: string;
  montant_ht: number;
}

export type DevisEmailStatut = 'non_envoye' | 'envoi_en_cours' | 'envoye' | 'echec';

export const DEVIS_EMAIL_LABELS: Record<DevisEmailStatut, string> = {
  non_envoye: 'Non envoyé',
  envoi_en_cours: 'Envoi en cours…',
  envoye: 'Email envoyé',
  echec: "Échec de l'envoi",
};

export interface Devis {
  id: string;
  dossier_id: string;
  numero: string | null;
  date_emission: string;
  montant_ht: number;
  remise_pack: number;
  tva_taux: number;
  montant_ttc: number;
  statut: DevisStatut;
  pack_actif: boolean;
  contenu: { lignes: DevisLigne[] };
  created_at: string;
  email_statut: DevisEmailStatut;
  email_destinataire: string | null;
  email_envoye_at: string | null;
  email_erreur: string | null;
}


export function useDevis(dossierId: string | undefined) {
  return useQuery({
    enabled: !!dossierId,
    queryKey: ['devis', dossierId],
    queryFn: async () => {
      const { data, error } = await (supabase.from('devis' as any) as any)
        .select('*')
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Devis[];
    },
  });
}

export function useSaveDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Devis> & { dossier_id: string }) => {
      const row = {
        ...payload,
        numero: payload.numero || `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      };
      const { data, error } = await (supabase.from('devis' as any) as any)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as Devis;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['devis', d.dossier_id] });
      toast.success('Devis enregistré');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export interface EnvoyerDevisPayload {
  devis: Partial<Devis> & { dossier_id: string };
  destinataire: string;
  client_name: string;
  numero_dossier?: string | null;
  /** PDF du devis encodé en base64 (sans préfixe data:) */
  pdf_base64: string;
  pdf_filename: string;
}

/**
 * Enregistre le devis puis envoie réellement l'email au client avec le PDF joint.
 * L'état d'envoi est persisté (envoi_en_cours → envoye | echec) : aucun faux succès.
 */
async function sendDevisEmail(
  devis: Devis,
  opts: { email: string; client_name: string; numero_dossier?: string | null; pdf_base64: string; pdf_filename: string; rappel?: boolean },
) {
  let erreur: string | null = null;
  try {
    const { data: res, error: fnErr } = await supabase.functions.invoke('send-notification', {
      body: {
        to: opts.email,
        allow_external: true,
        subject: `${opts.rappel ? 'Rappel — votre devis' : 'Votre devis'} HUNTERS Immobilier${devis.numero ? ` — ${devis.numero}` : ''}`,
        numero_dossier: opts.numero_dossier ?? null,
        eyebrow: 'Devis',
        title: opts.rappel ? 'Rappel — votre devis' : 'Votre devis est disponible',
        body: `<p style="margin:0 0 12px;">Bonjour ${opts.client_name},</p>
          <p style="margin:0 0 12px;">Vous trouverez en pièce jointe votre devis
          ${devis.numero ? `<strong style="color:#23291F;">${devis.numero}</strong>` : ''}
          d'un montant de <strong style="color:#23291F;">${Number(devis.montant_ttc).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC</strong>.</p>
          <p style="margin:0;font-size:11px;">Ce devis est valable 30 jours. Nous restons à votre disposition pour toute question.</p>`,
        attachments: [{ filename: opts.pdf_filename, content: opts.pdf_base64 }],
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

  await (supabase.from('devis' as any) as any)
    .update({
      email_statut: erreur ? 'echec' : 'envoye',
      email_erreur: erreur,
      email_envoye_at: erreur ? null : new Date().toISOString(),
      email_destinataire: opts.email,
    })
    .eq('id', devis.id);

  if (erreur) throw new Error(erreur);
}

export function useEnvoyerDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EnvoyerDevisPayload) => {
      const email = payload.destinataire.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Adresse email du client invalide');
      }

      const row = {
        ...payload.devis,
        statut: 'envoye' as DevisStatut,
        numero: payload.devis.numero || `DEV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        email_statut: 'envoi_en_cours',
        email_destinataire: email,
        email_erreur: null,
      };

      const { data, error } = await (supabase.from('devis' as any) as any)
        .insert(row).select().single();
      if (error) throw error;
      const devis = data as Devis;
      // Rend la ligne visible immédiatement en « Envoi en cours… »
      qc.invalidateQueries({ queryKey: ['devis', devis.dossier_id] });

      try {
        await sendDevisEmail(devis, {
          email,
          client_name: payload.client_name,
          numero_dossier: payload.numero_dossier,
          pdf_base64: payload.pdf_base64,
          pdf_filename: payload.pdf_filename,
        });
      } finally {
        qc.invalidateQueries({ queryKey: ['devis', devis.dossier_id] });
      }
      return { ...devis, email_destinataire: email };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['devis', d.dossier_id] });
      toast.success(`Devis envoyé à ${d.email_destinataire}`);
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['devis'] });
      toast.error(`Échec de l'envoi du devis : ${e.message}`, { duration: 10000 });
    },
  });
}

/** Renvoie un devis déjà enregistré (le PDF est reconstruit depuis le devis stocké). */
export function useRenvoyerDevis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      devis: Devis; destinataire: string; client_name: string;
      numero_dossier?: string | null; pdf_base64: string; pdf_filename: string;
    }) => {
      const email = payload.destinataire.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Adresse email du client invalide');
      }
      await (supabase.from('devis' as any) as any)
        .update({ email_statut: 'envoi_en_cours', email_erreur: null })
        .eq('id', payload.devis.id);
      qc.invalidateQueries({ queryKey: ['devis', payload.devis.dossier_id] });

      try {
        await sendDevisEmail(payload.devis, {
          email,
          client_name: payload.client_name,
          numero_dossier: payload.numero_dossier,
          pdf_base64: payload.pdf_base64,
          pdf_filename: payload.pdf_filename,
          rappel: true,
        });
      } finally {
        qc.invalidateQueries({ queryKey: ['devis', payload.devis.dossier_id] });
      }
      return { ...payload.devis, email_destinataire: email };
    },
    onSuccess: (d) => toast.success(`Devis renvoyé à ${d.email_destinataire}`),
    onError: (e: any) => toast.error(`Échec du renvoi : ${e.message}`, { duration: 10000 }),
  });
}

export function useUpdateDevisStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut, dossier_id }: { id: string; statut: DevisStatut; dossier_id: string }) => {
      const { error } = await (supabase.from('devis' as any) as any)
        .update({ statut })
        .eq('id', id);
      if (error) throw error;
      return { id, dossier_id };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['devis', d.dossier_id] });
      toast.success('Statut mis à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
