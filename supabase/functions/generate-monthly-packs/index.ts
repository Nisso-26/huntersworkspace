// Génère les factures pack mensuelles (125€ HT par défaut) le 1er du mois
// pour tous les mandataires actifs avec pack_status='actif'.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Récupère les paramètres entreprise (montant + TVA)
    const { data: settings } = await supabase
      .from("company_settings")
      .select("tarif_abonnement_defaut, tva_taux_defaut")
      .limit(1)
      .single();

    const montantHT = Number(settings?.tarif_abonnement_defaut ?? 125);
    const tvaTaux = Number(settings?.tva_taux_defaut ?? 20);
    const montantTTC = Math.round(montantHT * (1 + tvaTaux / 100) * 100) / 100;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const periodStart = new Date(Date.UTC(year, now.getMonth(), 1));
    const periodEnd = new Date(Date.UTC(year, now.getMonth() + 1, 0, 23, 59, 59));
    const echeance = new Date(periodStart.getTime() + 30 * 86400000);

    // Mandataires actifs
    const { data: mandataires } = await supabase
      .from("profiles")
      .select("id, full_name, pack_montant, pack_status, status")
      .eq("status", "actif")
      .eq("pack_status", "actif");

    const created: string[] = [];
    const skipped: string[] = [];

    for (const m of mandataires || []) {
      // Évite les doublons (un seul pack par mandataire & par mois)
      const { data: existing } = await supabase
        .from("factures")
        .select("id")
        .eq("mandataire_id", m.id)
        .eq("type", "abonnement")
        .gte("date_emission", periodStart.toISOString())
        .lte("date_emission", periodEnd.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        skipped.push(m.id);
        continue;
      }

      const personnalMontant = m.pack_montant ? Number(m.pack_montant) : montantHT;
      const personnalTTC = Math.round(personnalMontant * (1 + tvaTaux / 100) * 100) / 100;
      const reference = `PACK-${year}${month}-${m.id.slice(0, 6).toUpperCase()}`;

      const { error } = await supabase.from("factures").insert({
        mandataire_id: m.id,
        type: "abonnement",
        statut: "en_attente",
        montant: personnalMontant,
        tva_taux: tvaTaux,
        montant_ttc: personnalTTC,
        date_emission: periodStart.toISOString(),
        date_echeance: echeance.toISOString(),
        reference,
        client_name: m.full_name || "Mandataire",
      } as any);

      if (!error) created.push(m.id);
    }

    return new Response(
      JSON.stringify({ created: created.length, skipped: skipped.length, period: `${year}-${month}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
