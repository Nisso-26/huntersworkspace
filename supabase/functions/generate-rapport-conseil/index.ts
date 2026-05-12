import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTIONS = [
  "1. PROFIL CLIENT",
  "2. CAPACITÉ DE FINANCEMENT",
  "3. MONTAGES ET SCÉNARIOS DE FINANCEMENT",
  "4. STRATÉGIE D'INVESTISSEMENT",
  "5. SCÉNARIO COMPARATIF",
  "6. RENTABILITÉ ET CASH-FLOW CIBLES",
  "7. RECOMMANDATIONS",
  "8. PLAN D'INVESTISSEMENT PROGRESSIF",
  "9. ORIENTATION FISCALE",
  "10. CONCLUSION ET FORMULES DE POLITESSE",
];

const COMMON_RULES = `
RÈGLES IMPÉRATIVES — à respecter sans exception :
- Section 2 (Capacité de financement) : tu DOIS calculer ET afficher explicitement le taux d'endettement APRÈS projet (mensualités cumulées du projet + crédits existants / revenus nets mensuels), pas seulement le taux actuel. Présente les deux clairement.
- Sections 4, 5 et 6 : pour toute SCPI, le cash-flow net affiché doit être le cash-flow net APRÈS fiscalité sur revenus fonciers. Calcule explicitement : revenus SCPI bruts × (1 - TMI estimée - 17,2% prélèvements sociaux) − mensualité crédit. Ne JAMAIS présenter un cash-flow positif fictif en ignorant la fiscalité foncière. Indique l'hypothèse de TMI utilisée (par défaut 30% si non précisé).
- Section 9 (Orientation fiscale) : il est INTERDIT de mentionner un quelconque "abattement de 30% sur les charges SCPI" — cette notion est incorrecte pour les SCPI financées à crédit. Reste général et oriente vers un CGP ou expert-comptable.
- Signature finale : utilise EXACTEMENT le nom et le titre du conseiller fournis dans les données ("Conseiller signataire" et "Titre du conseiller"). N'invente JAMAIS un titre comme "Conseillère Senior" si ce n'est pas le titre fourni.
- Format de sortie : Markdown pur. Aucun préambule. Aucun bloc de code englobant.`;

const SYSTEM_PROMPT_FULL = `Tu es un consultant senior en investissement immobilier pour Hunters Immobilier, cabinet premium basé à Tours. Tu rédiges des rapports complets, professionnels, objectifs, ton chaleureux et premium, en français.

Le rapport doit contenir EXACTEMENT ces 10 sections, dans cet ordre, chacune introduite par un titre en MAJUSCULES préfixé par son numéro et un point :

1. PROFIL CLIENT — présentation valorisante, objective, jamais condescendante.
2. CAPACITÉ DE FINANCEMENT — revenus nets, charges, taux d'endettement actuel ET après projet, capacité d'emprunt, apport, conclusion bancaire.
3. MONTAGES ET SCÉNARIOS DE FINANCEMENT — 2 à 3 scénarios (amortissable classique, apport partiel, SCI si pertinent) avec avantages / limites.
4. STRATÉGIE D'INVESTISSEMENT — recommandations adaptées au profil, objectifs et fiscalité.
5. SCÉNARIO COMPARATIF — tableau Markdown comparatif de 2 à 3 options (rendement brut, cash-flow net APRÈS fiscalité, effort d'épargne mensuel, horizon de rentabilité, niveau de risque).
6. RENTABILITÉ ET CASH-FLOW CIBLES — projections chiffrées détaillées sur 10 ans.
7. RECOMMANDATIONS — synthèse priorisée.
8. PLAN D'INVESTISSEMENT PROGRESSIF — 5 phases avec jalons concrets.
9. ORIENTATION FISCALE — 2-3 paragraphes max, non prescriptive, recommander un CGP / expert-comptable.
10. CONCLUSION ET FORMULES DE POLITESSE — synthèse, points forts, formules signées au nom du conseiller avec son titre exact.

${COMMON_RULES}`;

const SYSTEM_PROMPT_SECTION = (sectionTitle: string) => `Tu es un consultant senior en investissement immobilier pour Hunters Immobilier (Tours).
Tu rédiges UNIQUEMENT la section suivante d'un rapport de conseil :

${sectionTitle}

Commence ta réponse directement par le titre exact de la section en MAJUSCULES (ex: "${sectionTitle}"), puis le contenu rédigé en Markdown. Aucun préambule, aucun autre commentaire, aucun autre titre de section.

${COMMON_RULES}`;

function buildPrompt(d: any, sectionTitle?: string): string {
  const ctx = `## DONNÉES DU DOSSIER
- Client : ${d.client_name || "NC"}
- Email : ${d.email || "NC"}
- Ville : ${d.ville || "NC"}
- Budget envisagé : ${(Number(d.budget) || 0).toLocaleString("fr-FR")} €
- Honoraires Hunters : ${(Number(d.honoraires) || 0).toLocaleString("fr-FR")} €
- Statut du dossier : ${d.status || "NC"}
- Notes internes : ${d.notes || "aucune"}

## CONSEILLER SIGNATAIRE
- Nom : ${d.conseiller || "Hunters Immobilier"}
- Titre du conseiller : ${d.conseiller_titre || "Conseiller"}

## STRATÉGIE PATRIMONIALE DÉJÀ ÉTABLIE (référence chiffrée)
${d.strategie ? (typeof d.strategie === "string" ? d.strategie : JSON.stringify(d.strategie)) : "Aucune stratégie pré-établie — bâtis le rapport à partir des données disponibles et des standards du marché français 2025."}`;

  if (sectionTitle) {
    return `Rédige UNIQUEMENT la section "${sectionTitle}" pour le client ci-dessous. Respecte strictement les règles imposées (notamment fiscalité SCPI et taux d'endettement après projet).

${ctx}`;
  }

  return `Rédige le rapport de conseil complet pour le client suivant, en respectant exactement les 10 sections imposées.

${ctx}`;
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

    const sectionIndex: number | undefined = typeof body.section_index === "number" ? body.section_index : undefined;
    const sectionTitle = sectionIndex != null ? SECTIONS[sectionIndex] : undefined;
    if (sectionIndex != null && !sectionTitle) throw new Error("section_index invalide");

    const anthropic = new Anthropic({ apiKey });
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: sectionTitle ? 2500 : 8000,
      system: sectionTitle ? SYSTEM_PROMPT_SECTION(sectionTitle) : SYSTEM_PROMPT_FULL,
      messages: [{ role: "user", content: buildPrompt(body, sectionTitle) }],
    });

    const rapport = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    if (!rapport) throw new Error("Réponse IA vide");

    return new Response(JSON.stringify({ ok: true, rapport, section_index: sectionIndex }), {
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
