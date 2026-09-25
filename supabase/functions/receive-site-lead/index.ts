import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function parseBudget(text: string): number {
  try {
    const m = text.match(/\d[\d\s\u00a0\u202f.,]*/);
    if (!m) return 0;
    let raw = m[0].replace(/[\s\u00a0\u202f]/g, '').replace(/[.,]\d{1,2}$/, '').replace(/[.,]/g, '');
    let n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    const after = text.slice((m.index ?? 0) + m[0].length).trim().toLowerCase();
    if (/^(k|k€|000)/.test(after) && n < 10000) n *= 1000;
    else if (/^(m|m€|million)/.test(after) && n < 1000) n *= 1_000_000;
    return n;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('SITE_SYNC_SECRET') ?? '';
  const provided = req.headers.get('x-sync-secret') ?? '';
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return json({ success: false, error: 'Unauthorized' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    body = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json({ success: false, error: 'Invalid JSON payload' }, 400);
  }

  const siteLeadIdRaw = str(body.site_lead_id);
  const siteLeadId = UUID_RE.test(siteLeadIdRaw) ? siteLeadIdRaw : null;
  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  const email = str(body.email);
  const phone = str(body.phone);
  const projectType = str(body.project_type);
  const budgetText = str(body.budget);
  const message = str(body.message);
  const city = str(body.city);
  const motifEcarte = str(body.motif_ecarte);

  const today = new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
  const nom = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim() || `Prospect site du ${today}`;

  const noteLines = ['Demande reçue via huntersimmobilier.fr'];
  if (budgetText) noteLines.push(`Tranche de budget : ${budgetText}`);
  if (city) noteLines.push(`Ville : ${city}`);
  if (message) noteLines.push(`Message du client :\n${message}`);
  if (siteLeadIdRaw && !siteLeadId) noteLines.push(`Référence site (non standard) : ${siteLeadIdRaw}`);

  const payload: Record<string, unknown> = {
    nom,
    telephone: phone || null,
    email: email || null,
    source: 'site_web',
    objectif: projectType || null,
    budget_estime: parseBudget(budgetText),
    notes: noteLines.join('\n'),
    statut: motifEcarte ? 'perdu' : 'contact_entrant',
    motif_perte: motifEcarte || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (siteLeadId) {
      const { data: existing, error: findErr } = await supabase
        .from('prospects').select('id').eq('site_lead_id', siteLeadId).maybeSingle();
      if (findErr) throw findErr;
      if (existing) {
        const { error } = await supabase.from('prospects').update(payload).eq('id', existing.id);
        if (error) throw error;
        return json({ success: true, prospect_id: existing.id, updated: true });
      }
    }

    const { data, error } = await supabase
      .from('prospects')
      .insert({ ...payload, site_lead_id: siteLeadId, mandataire_id: null })
      .select('id').single();
    if (error) {
      // Course entre deux envois simultanés : on bascule en mise à jour
      if (error.code === '23505' && siteLeadId) {
        const { data: row, error: e2 } = await supabase
          .from('prospects').update(payload).eq('site_lead_id', siteLeadId).select('id').single();
        if (e2) throw e2;
        return json({ success: true, prospect_id: row.id, updated: true });
      }
      throw error;
    }
    return json({ success: true, prospect_id: data.id });
  } catch (e) {
    console.error('receive-site-lead error', e);
    return json({ success: false, error: 'Database unavailable' }, 500);
  }
});
