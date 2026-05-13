// Envoi d'email transactionnel via Resend.
// Body: { to: string|string[], subject: string, body: string (HTML inner) }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TODO: rebasculer sur "Hunters Workspace <noreply@workspace.huntersimmobilier.fr>" une fois le domaine vérifié dans Resend.
const FROM = "Hunters Workspace <onboarding@resend.dev>";
const HUNTERS_GREEN = "#1A4D2E";
const HUNTERS_GOLD = "#F5A800";

function wrap(subject: string, innerHtml: string, numeroDossier?: string | null): string {
  const refChip = numeroDossier
    ? `<div style="display:inline-block;background:${HUNTERS_GOLD};color:#1A4D2E;font-weight:700;font-size:11px;padding:3px 10px;border-radius:2px;margin-top:6px;letter-spacing:0.5px;">RÉF. ${numeroDossier}</div>`
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
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY non configurée");

    const { to, subject, body, numero_dossier } = await req.json();
    if (!to || !subject || !body) throw new Error("Paramètres requis: to, subject, body");

    const recipients = Array.isArray(to) ? to : [to];
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
