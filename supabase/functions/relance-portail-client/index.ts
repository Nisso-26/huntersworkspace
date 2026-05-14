// Cron quotidien: vérifie les portails clients non consultés depuis +5 jours
// et envoie une relance email au conseiller assigné.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const fiveDaysAgoISO = new Date(Date.now() - 5 * 86400_000).toISOString();
    const oneDayAgoISO = new Date(Date.now() - 1 * 86400_000).toISOString();

    // Tokens actifs : créés il y a +5j, jamais ouverts OU non consultés depuis +5j,
    // et pas encore relancés (ou relancés il y a +1j pour éviter le spam).
    const { data: tokens, error: tErr } = await supabase
      .from("client_tokens")
      .select("id, dossier_id, client_name, created_at, last_viewed_at, last_relance_at")
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString());

    if (tErr) throw tErr;

    const candidates = (tokens || []).filter((t: any) => {
      const ref = t.last_viewed_at || t.created_at;
      if (new Date(ref).toISOString() > fiveDaysAgoISO) return false;
      if (t.last_relance_at && new Date(t.last_relance_at).toISOString() > oneDayAgoISO) return false;
      return true;
    });

    let sent = 0;
    for (const t of candidates) {
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("id, client_name, mandataire_id, numero_dossier")
        .eq("id", t.dossier_id)
        .maybeSingle();

      if (!dossier?.mandataire_id) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", dossier.mandataire_id)
        .maybeSingle();

      if (!profile?.email) continue;

      const numero = (dossier as any).numero_dossier || '';
      const refLabel = numero ? ` (réf. ${numero})` : '';
      const html = `<h2 style="color:#1A4D2E;margin:0 0 16px;">Portail client non consulté</h2>
        <p>Bonjour ${profile.full_name || ''},</p>
        <p>Le portail client de <strong>${dossier.client_name}</strong>${refLabel} n'a pas été consulté depuis 5 jours.</p>
        <p>Pensez à relancer votre client pour l'inviter à suivre l'avancement de son dossier.</p>`;

      const { error: invErr } = await supabase.functions.invoke("send-notification", {
        body: {
          to: profile.email,
          subject: `Relance portail client : ${dossier.client_name}${numero ? ` (${numero})` : ''}`,
          numero_dossier: numero || null,
          body: html,
        },
      });

      if (!invErr) {
        await supabase.from("client_tokens").update({ last_relance_at: new Date().toISOString() }).eq("id", t.id);
        sent++;
      } else {
        console.error("send-notification failed:", invErr);
      }
    }

    return new Response(JSON.stringify({ ok: true, candidates: candidates.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[relance-portail-client] FAIL:", e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
