import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const decisionId = typeof body?.decision_id === 'string' ? body.decision_id.trim() : '';
    if (!token || token.length > 300 || !/^[0-9a-f-]{36}$/i.test(decisionId)) {
      return json({ error: "Paramètres invalides" }, 400);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    const { data: access } = await supabase
      .from('acces_portail')
      .select('id, dossier_id, partenaire_id, token')
      .eq('token', token)
      .maybeSingle();
    if (!access) return json({ error: "Décision introuvable" }, 404);

    const { data: decision } = await supabase
      .from('decisions_partenaire')
      .select('id, verdict, proposition, date_decision')
      .eq('id', decisionId)
      .eq('acces_portail_id', access.id)
      .maybeSingle();
    if (!decision?.date_decision || decision.verdict !== 'invalidation') {
      return json({ ok: true, sent: false });
    }

    const { data: priorLog } = await supabase
      .from('log_acces_portail')
      .select('id')
      .eq('acces_portail_id', access.id)
      .eq('evenement', 'notification_invalidation')
      .limit(1)
      .maybeSingle();
    if (priorLog) return json({ ok: true, sent: false, duplicate: true });

    const [{ data: dossier }, { data: partenaire }, { data: settings }] = await Promise.all([
      supabase.from('dossiers').select('numero_dossier, mandataire_id').eq('id', access.dossier_id).maybeSingle(),
      supabase.from('partenaires').select('nom').eq('id', access.partenaire_id).maybeSingle(),
      supabase.from('company_settings').select('email_alertes_dirigeant').limit(1).maybeSingle(),
    ]);

    const recipients = new Set<string>();
    let mandataireName = '';
    if (dossier?.mandataire_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', dossier.mandataire_id)
        .maybeSingle();
      if (profile?.email) recipients.add(profile.email);
      mandataireName = profile?.full_name || '';
    }
    if (settings?.email_alertes_dirigeant) recipients.add(settings.email_alertes_dirigeant);
    if (recipients.size === 0) return json({ ok: true, sent: false });

    const numero = dossier?.numero_dossier || 'DOSSIER';
    const proposalNotice = decision.proposition
      ? '<p style="margin:0 0 12px;"><strong>Le partenaire a joint une proposition — consultez le dossier pour la voir.</strong></p>'
      : '';
    const { error: mailError } = await supabase.functions.invoke('send-notification', {
      headers: { Authorization: `Bearer ${serviceRoleKey}` },
      body: {
        to: [...recipients],
        subject: `Invalidation partenaire — dossier ${numero}`,
        numero_dossier: numero,
        eyebrow: 'Portail partenaire',
        title: 'Une révision du dossier est demandée',
        body: `<p style="margin:0 0 12px;">Bonjour ${escapeHtml(mandataireName)},</p>
          <p style="margin:0 0 12px;">${escapeHtml(partenaire?.nom || 'Le partenaire')} a invalidé le dossier ${escapeHtml(numero)}.</p>
          ${proposalNotice}
          <p style="margin:0;">Consultez le dossier dans HUNTERS Workspace pour prendre connaissance de sa décision.</p>`,
      },
    });
    if (mailError) throw mailError;

    const { error: logError } = await supabase.from('log_acces_portail').insert({
      acces_portail_id: access.id,
      evenement: 'notification_invalidation',
      detail: { proposition_jointe: Boolean(decision.proposition), destinataires: recipients.size },
    });
    if (logError) throw logError;
    return json({ ok: true, sent: true });
  } catch (error) {
    console.error('[notify-partner-decision]', error);
    return json({ error: 'Notification impossible' }, 500);
  }
});