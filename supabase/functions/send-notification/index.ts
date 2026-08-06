// Envoi d'email transactionnel via Resend.
// Body: { to: string|string[], subject: string, body: string (HTML inner) }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Hunters Workspace <noreply@workspace.huntersimmobilier.fr>";
// Charte HUNTERS V2.0
const HUNTERS_GREEN = "#004621";
const HUNTERS_GREEN_DEEP = "#06381E";
const HUNTERS_GOLD = "#C8962F";
const HUNTERS_CREAM = "#F4ECD8";
const HUNTERS_INK = "#23291F";
const HUNTERS_MUTED = "#6B7566";
const HUNTERS_BORDER = "#ECE6D8";
// Marcellus n'est pas supporté par les clients mail : fallback serif (Georgia).
const FONT_HEADING = "Marcellus, Georgia, 'Times New Roman', Times, serif";
const FONT_BODY = "Jost, 'Helvetica Neue', Arial, Helvetica, sans-serif";

export interface WrapOptions {
  eyebrow?: string | null;
  title?: string | null;
  cta?: { label: string; url: string } | null;
  numeroDossier?: string | null;
}

// Gabarit unique HUNTERS — 600px, styles inline, compatible Outlook
export function wrap(subject: string, innerHtml: string, opts: WrapOptions = {}): string {
  const { eyebrow, title, cta, numeroDossier } = opts;

  const eyebrowHtml = eyebrow
    ? `<div style="font-family:${FONT_BODY};font-size:11px;font-weight:500;letter-spacing:1.76px;text-transform:uppercase;color:${HUNTERS_GOLD};">${eyebrow}</div>`
    : '';

  const titleHtml = title
    ? `<div style="font-family:${FONT_HEADING};font-size:21px;line-height:1.3;color:${HUNTERS_INK};margin-top:8px;">${title}</div>`
    : '';

  const refChip = numeroDossier
    ? `<div style="font-family:${FONT_BODY};font-size:11px;letter-spacing:1px;color:${HUNTERS_GOLD};margin-top:6px;">RÉF. ${numeroDossier}</div>`
    : '';

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
          <tr><td align="center" bgcolor="${HUNTERS_GREEN}" style="border-radius:3px;">
            <a href="${cta.url}" style="display:inline-block;background:${HUNTERS_GREEN};color:#ffffff;font-family:${FONT_BODY};font-size:13px;font-weight:500;text-decoration:none;padding:12px 28px;border-radius:3px;">${cta.label}</a>
          </td></tr>
        </table>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:${FONT_BODY};color:${HUNTERS_INK};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#ffffff;border-radius:3px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td bgcolor="${HUNTERS_GREEN_DEEP}" style="background:${HUNTERS_GREEN_DEEP};padding:22px 26px;">
          <div style="font-family:${FONT_HEADING};color:${HUNTERS_CREAM};font-size:15px;font-weight:400;letter-spacing:3px;">HUNTERS<span style="color:${HUNTERS_GOLD};">&nbsp;·&nbsp;</span>IMMOBILIER</div>
          ${refChip}
        </td></tr>
        <tr><td style="padding:36px 32px;background:#ffffff;">
          ${eyebrowHtml}
          ${titleHtml}
          <div style="font-family:${FONT_BODY};font-size:13px;line-height:1.65;color:${HUNTERS_MUTED};margin-top:12px;">
            ${innerHtml}
          </div>
          ${ctaHtml}
        </td></tr>
        <tr><td style="border-top:1px solid ${HUNTERS_BORDER};padding:16px 32px;font-family:${FONT_BODY};font-size:10px;line-height:1.6;color:${HUNTERS_MUTED};text-align:left;">
          HUNTERS Immobilier — Cabinet de conseil en investissement immobilier<br/>
          hunters-immobilier.fr · contact@huntersimmobilier.fr${numeroDossier ? `<br/>Réf. dossier ${numeroDossier}` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth guard: accept service-role (internal invocations) OR a valid authenticated JWT
    const authHeader = req.headers.get("Authorization") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const isService = authHeader === `Bearer ${serviceRoleKey}`;
    let userClient: ReturnType<typeof createClient> | null = null;
    if (!isService) {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: aErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
      if (aErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY non configurée");

    const { to, subject, body, numero_dossier, eyebrow, title, cta, allow_external, attachments } = await req.json();
    if (!to || !subject || !body) throw new Error("Paramètres requis: to, subject, body");

    // Basic input validation
    const recipients = Array.isArray(to) ? to : [to];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (recipients.length === 0 || recipients.length > 50) throw new Error("Nombre de destinataires invalide");
    if (!recipients.every((e: unknown) => typeof e === "string" && emailRe.test(e))) {
      throw new Error("Adresse email invalide");
    }
    if (typeof subject !== "string" || subject.length > 300) throw new Error("Sujet invalide");
    if (typeof body !== "string" || body.length > 100000) throw new Error("Corps invalide");

    // Pièces jointes (optionnel) : [{ filename, content (base64) }]
    let safeAttachments: { filename: string; content: string }[] | undefined;
    if (attachments !== undefined && attachments !== null) {
      if (!Array.isArray(attachments) || attachments.length > 3) {
        throw new Error("Pièces jointes invalides");
      }
      safeAttachments = attachments.map((a: any) => {
        if (!a || typeof a.filename !== "string" || typeof a.content !== "string") {
          throw new Error("Pièce jointe invalide");
        }
        if (!/^[\w .()\-]{1,120}$/.test(a.filename)) throw new Error("Nom de fichier invalide");
        // ~6 Mo max en base64
        if (a.content.length > 8_000_000) throw new Error("Pièce jointe trop volumineuse");
        if (!/^[A-Za-z0-9+/=\s]+$/.test(a.content)) throw new Error("Pièce jointe non encodée en base64");
        return { filename: a.filename, content: a.content.replace(/\s+/g, "") };
      });
    }


    // Anti-phishing guard (intentionnel) : un appelant authentifié ne peut pas viser
    // une adresse arbitraire depuis le domaine du cabinet.
    // - par défaut : uniquement les utilisateurs internes (profiles)
    // - avec allow_external: true : autorise aussi les contacts externes déjà connus
    //   de l'application (client d'un dossier, signataire, contact portail, partenaire,
    //   prospect). Une adresse totalement inconnue reste refusée dans tous les cas.
    if (!isService) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const lowered = recipients.map((e: string) => e.toLowerCase());

      const knownSet = new Set<string>();
      const collect = (rows: any[] | null, field: string) => {
        for (const r of rows || []) {
          const v = (r?.[field] || "").toLowerCase();
          if (v) knownSet.add(v);
        }
      };

      const { data: knownProfiles, error: pErr } = await adminClient
        .from("profiles").select("email").in("email", lowered);
      if (pErr) throw new Error("Vérification destinataires impossible");
      collect(knownProfiles, "email");

      if (allow_external === true) {
        const [dossiers, signatures, tokens, partenaires, prospects] = await Promise.all([
          adminClient.from("dossiers").select("email").in("email", lowered),
          adminClient.from("signatures_electroniques").select("signataire_email").in("signataire_email", lowered),
          adminClient.from("client_tokens").select("client_email").in("client_email", lowered),
          adminClient.from("partenaires").select("email").in("email", lowered),
          adminClient.from("prospects").select("email").in("email", lowered),
        ]);
        collect(dossiers.data, "email");
        collect(signatures.data, "signataire_email");
        collect(tokens.data, "client_email");
        collect(partenaires.data, "email");
        collect(prospects.data, "email");
      }

      const unknown = lowered.filter((e: string) => !knownSet.has(e));
      if (unknown.length > 0) {
        return new Response(JSON.stringify({
          error: allow_external === true
            ? "Destinataire non autorisé : cette adresse n'est rattachée à aucun dossier, signataire, partenaire ou prospect enregistré."
            : "Destinataire non autorisé : seuls les utilisateurs internes peuvent être contactés via cette fonction.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }



    const html = wrap(subject, body, {
      numeroDossier: numero_dossier || null,
      eyebrow: typeof eyebrow === "string" ? eyebrow : null,
      title: typeof title === "string" ? title : null,
      cta: cta && typeof cta.url === "string" && typeof cta.label === "string" ? cta : null,
    });



    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: recipients, subject, html }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[send-notification] Resend error:", data);
      throw new Error(data?.message || `Resend ${res.status}`);
    }

    return new Response(JSON.stringify({ id: data.id, ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[send-notification] FAIL:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
