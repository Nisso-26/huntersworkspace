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
const HUNTERS_GOLD = "#C8962F";
// Marcellus n'est pas supporté par les clients mail : fallback serif (Georgia).
const FONT_HEADING = "Georgia, 'Times New Roman', Times, serif";

function wrap(subject: string, innerHtml: string, numeroDossier?: string | null): string {
  const refChip = numeroDossier
    ? `<div style="display:inline-block;background:${HUNTERS_GOLD};color:#004621;font-weight:700;font-size:11px;padding:3px 10px;border-radius:2px;margin-top:6px;letter-spacing:0.5px;">RÉF. ${numeroDossier}</div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#2C2C2C;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:2px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:${HUNTERS_GREEN};padding:20px 24px;">
          <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">HUNTERS<span style="color:${HUNTERS_GOLD};">·</span>IMMOBILIER</div>
          ${refChip}
        </td></tr>
        <tr><td style="padding:28px 24px;font-size:15px;line-height:1.6;color:#2C2C2C;">
          ${innerHtml}
        </td></tr>
        <tr><td style="background:#fafafa;padding:16px 24px;font-size:12px;color:#888;border-top:3px solid ${HUNTERS_GOLD};">
          Hunters Immobilier — Ce message est envoyé automatiquement depuis votre espace de travail.${numeroDossier ? ` · Réf. dossier ${numeroDossier}` : ''}
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
      const { data, error: aErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (aErr || !data?.claims) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY non configurée");

    const { to, subject, body, numero_dossier } = await req.json();
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

    // Restrict recipients: non-service callers can only target internal users (existing profiles)
    // to prevent abuse of the company domain for phishing arbitrary external addresses.
    if (!isService) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const lowered = recipients.map((e: string) => e.toLowerCase());
      const { data: knownProfiles, error: pErr } = await adminClient
        .from("profiles")
        .select("email")
        .in("email", lowered);
      if (pErr) throw new Error("Vérification destinataires impossible");
      const knownSet = new Set((knownProfiles || []).map((p: any) => (p.email || "").toLowerCase()));
      const unknown = lowered.filter((e: string) => !knownSet.has(e));
      if (unknown.length > 0) {
        return new Response(JSON.stringify({
          error: "Destinataire non autorisé : seuls les utilisateurs internes peuvent être contactés via cette fonction.",
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    const html = wrap(subject, body, numero_dossier || null);


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
