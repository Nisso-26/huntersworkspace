import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const alerts: Array<{
    user_id: string | null;
    type: string;
    title: string;
    detail: string;
    target_date?: string;
    dossier_id?: string;
  }> = [];

  // Fetch settings to know which alert types are enabled
  // We store settings as alertes with type='setting' — but better to just run all and let frontend filter
  // For now generate all types; frontend settings will hide disabled ones

  // 1. Dossier créé il y a 3 jours sans changement de statut → relance
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
  const { data: newDossiers } = await supabase
    .from("dossiers")
    .select("id, client_name, mandataire_id")
    .eq("status", "nouveau")
    .lt("created_at", threeDaysAgo);

  for (const d of newDossiers || []) {
    // Check if alert already exists
    const { data: existing } = await supabase
      .from("alertes")
      .select("id")
      .eq("dossier_id", d.id)
      .eq("type", "warning")
      .ilike("title", "%Relancer%")
      .limit(1);
    if (!existing?.length) {
      alerts.push({
        user_id: d.mandataire_id,
        type: "warning",
        title: `Relancer le client ${d.client_name}`,
        detail: "Dossier créé il y a plus de 3 jours sans progression",
        dossier_id: d.id,
      });
    }
  }

  // 2. Dossier en "Chasse" depuis plus de 30 jours
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
  const { data: chasseDossiers } = await supabase
    .from("dossiers")
    .select("id, client_name, mandataire_id")
    .eq("status", "chasse")
    .lt("updated_at", thirtyDaysAgo);

  for (const d of chasseDossiers || []) {
    const { data: existing } = await supabase
      .from("alertes")
      .select("id")
      .eq("dossier_id", d.id)
      .ilike("title", "%point chasse%")
      .eq("is_read", false)
      .limit(1);
    if (!existing?.length) {
      alerts.push({
        user_id: d.mandataire_id,
        type: "warning",
        title: `Faire le point chasse avec le mandataire`,
        detail: `Dossier ${d.client_name} en chasse depuis plus de 30 jours`,
        dossier_id: d.id,
      });
    }
  }

  // 3. Commission due depuis plus de 30 jours
  const { data: dueCommissions } = await supabase
    .from("commissions")
    .select("id, mandataire_id, montant")
    .eq("statut", "due")
    .lt("created_at", thirtyDaysAgo);

  for (const c of dueCommissions || []) {
    const { data: existing } = await supabase
      .from("alertes")
      .select("id")
      .eq("user_id", c.mandataire_id)
      .ilike("title", "%Commission en attente%")
      .eq("is_read", false)
      .limit(1);
    if (!existing?.length) {
      // Get mandataire name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", c.mandataire_id)
        .single();
      alerts.push({
        user_id: null, // admin alert
        type: "urgente",
        title: `Commission en attente ${profile?.full_name || ""}`,
        detail: `${c.montant}€ de commission due depuis plus de 30 jours`,
      });
    }
  }

  // 4. Mandataire inactif depuis 60 jours (no dossier updated)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString();
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("status", "actif");

  for (const p of allProfiles || []) {
    const { data: recentDossiers } = await supabase
      .from("dossiers")
      .select("id")
      .eq("mandataire_id", p.id)
      .gt("updated_at", sixtyDaysAgo)
      .limit(1);
    if (!recentDossiers?.length) {
      const { data: existing } = await supabase
        .from("alertes")
        .select("id")
        .ilike("title", `%Mandataire inactif%${p.full_name || ""}%`)
        .eq("is_read", false)
        .limit(1);
      if (!existing?.length && p.full_name) {
        alerts.push({
          user_id: null,
          type: "warning",
          title: `Mandataire inactif : ${p.full_name}`,
          detail: "Aucune activité depuis plus de 60 jours",
        });
      }
    }
  }

  // 5. Factures pack impayées (type abonnement, en_attente, émise il y a plus de 5 jours)
  const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString();
  const { data: unpaidPacks } = await supabase
    .from("factures")
    .select("id, mandataire_id, reference")
    .eq("type", "abonnement")
    .eq("statut", "en_attente")
    .lt("date_emission", fiveDaysAgo);

  for (const f of unpaidPacks || []) {
    const { data: existing } = await supabase
      .from("alertes")
      .select("id")
      .ilike("title", "%Impayé pack%")
      .eq("user_id", f.mandataire_id)
      .eq("is_read", false)
      .limit(1);
    if (!existing?.length) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", f.mandataire_id || "")
        .single();
      alerts.push({
        user_id: null,
        type: "urgente",
        title: `Impayé pack ${profile?.full_name || ""}`,
        detail: `Facture pack non réglée depuis plus de 5 jours`,
      });
    }
  }

  // Insert all alerts
  if (alerts.length > 0) {
    await supabase.from("alertes").insert(alerts);
  }

  return new Response(JSON.stringify({ generated: alerts.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
