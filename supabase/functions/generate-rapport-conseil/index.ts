import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un consultant senior en investissement immobilier pour Hunters Immobilier, cabinet premium basé à Tours. Tu rédiges des rapports de conseil complets, professionnels et objectifs, ton chaleureux et premium, en français.

Le rapport doit contenir EXACTEMENT ces 10 sections, dans cet ordre, chacune introduite par un titre en MAJUSCULES préfixé par son numéro et un point (ex: "1. PROFIL CLIENT") :

1. PROFIL CLIENT — présentation valorisante, objective et professionnelle du client. Jamais condescendant, toujours respectueux quel que soit le niveau de revenus.
2. CAPACITÉ DE FINANCEMENT — analyse détaillée : revenus nets, charges, taux d'endettement actuel et après projet, capacité d'emprunt maximale, apport disponible, conclusion sur la solidité du dossier bancaire.
3. MONTAGES ET SCÉNARIOS DE FINANCEMENT — 2 à 3 scénarios (crédit amortissable classique, apport partiel, SCI si pertinent…) avec avantages et limites.
4. STRATÉGIE D'INVESTISSEMENT — recommandations détaillées adaptées au profil, aux objectifs et à la fiscalité.
5. SCÉNARIO COMPARATIF — tableau comparatif de 2 à 3 options (rendement brut, cash-flow net, effort d'épargne mensuel, horizon de rentabilité, niveau de risque). Présente le tableau en Markdown.
6. RENTABILITÉ ET CASH-FLOW CIBLES — projections chiffrées selon les objectifs déclarés.
7. RECOMMANDATIONS — synthèse des recommandations prioritaires, classées par ordre d'importance.
8. PLAN D'INVESTISSEMENT PROGRESSIF — phasé sur l'horizon, étapes concrètes et jalons.
9. ORIENTATION FISCALE — brève orientation (2-3 paragraphes max), non prescriptive. Recommander un CGP ou expert-comptable.
10. CONCLUSION ET FORMULES DE POLITESSE — synthèse analytique, points forts du projet, formules de politesse signées au nom du conseiller Hunters Immobilier.

Chaque section doit être substantielle et apporter une vraie valeur ajoutée. Format de sortie : Markdown pur, sans préambule, sans bloc de code englobant.`;

function buildPrompt(d: any): string {
  return `Rédige un rapport de conseil complet pour le client suivant.

## DONNÉES DU DOSSIER
- Nom du client : ${d.client_name || "NC"}
- Email : ${d.email || "NC"}
- Ville : ${d.ville || "NC"}
- Budget envisagé : ${(Number(d.budget) || 0).toLocaleString("fr-FR")} €
- Honoraires Hunters : ${(Number(d.honoraires) || 0).toLocaleString("fr-FR")} €
- Statut du dossier : ${d.status || "NC"}
- Notes internes : ${d.notes || "aucune"}

## CONSEILLER SIGNATAIRE
${d.conseiller || "Hunters Immobilier"}

## STRATÉGIE PATRIMONIALE DÉJÀ ÉTABLIE (référence)
${d.strategie ? (typeof d.strategie === "string" ? d.strategie : JSON.stringify(d.strategie)) : "Aucune stratégie pré-établie — bâtis le rapport à partir des données disponibles et des standards du marché français 2025."}

Génère le rapport maintenant en respectant exactement les 10 sections imposées.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Non authentifié" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("Clé API Anthropic non configurée");

    const body = await req.json();
    if (!body.client_name) throw new Error("client_name requis");

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const rapport = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    if (!rapport) throw new Error("Réponse IA vide");

    return new Response(JSON.stringify({ ok: true, rapport }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-rapport-conseil error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
