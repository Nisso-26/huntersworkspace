import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OUTPUT_SCHEMA = `{
  "synthese": "3 à 4 phrases résumant le profil et les recommandations principales",
  "profil_investisseur": "description synthétique du profil (ex: Cadre 42 ans, TMI 30%, profil équilibré orienté revenus complémentaires)",
  "indicateurs_cles": {
    "revenus_nets_totaux_mensuels": 0,
    "taux_effort_actuel_pct": 0,
    "capacite_emprunt_estimee": 0,
    "mensualite_max_supplementaire": 0,
    "cash_flow_mensuel_libre": 0
  },
  "recommandations": [
    {
      "rang": 1,
      "titre": "nom court de la stratégie",
      "dispositif": "dispositif fiscal principal",
      "description": "2 à 3 phrases expliquant la stratégie",
      "budget_acquisition_total": 0,
      "apport_recommande": 0,
      "mensualite_credit_estimee": 0,
      "loyer_brut_mensuel_estime": 0,
      "cash_flow_net_mensuel_estime": 0,
      "rendement_brut_estime_pct": 0,
      "economie_fiscale_annuelle_estimee": 0,
      "avantages": ["string"],
      "points_vigilance": ["string"],
      "horizon_recommande": "string",
      "zones_suggerees": ["string"]
    }
  ],
  "plan_action": [
    {
      "etape": 1,
      "titre": "string",
      "description": "string",
      "delai": "Semaine 1-2"
    }
  ],
  "points_attention": ["string"],
  "disclaimer": "Cette analyse est fournie à titre indicatif par Hunters Immobilier dans le cadre d'un accompagnement personnalisé. Elle ne constitue pas un conseil en investissement au sens juridique du terme."
}`;

function buildPrompt(data: any): string {
  const fmt = (v: number) => v.toLocaleString("fr-FR");

  const revenus = Number(data.revenus_nets_mensuels || 0) + Number(data.revenus_conjoint_mensuels || 0) + Number(data.autres_revenus_mensuels || 0);
  const charges = Number(data.charges_mensuelles || 0) + Number(data.mensualites_credits || 0) + Number(data.loyer_mensuel || 0);
  const cashFlow = revenus - charges;
  const tauxEffort = revenus > 0 ? ((Number(data.mensualites_credits || 0) / revenus) * 100).toFixed(1) : "0";
  const tauxCredit = Number(data.taux_credit || 3.8);
  const duree = Number(data.duree_credit || 20);
  const mensualiteMax = revenus * 0.35 - Number(data.mensualites_credits || 0);
  const r = tauxCredit / 100 / 12;
  const n = duree * 12;
  const capaciteEmprunt = r > 0 ? Math.round(mensualiteMax * (1 - Math.pow(1 + r, -n)) / r) : Math.round(mensualiteMax * n);

  return `Tu es un expert-conseil en investissement immobilier français travaillant pour Hunters Immobilier, une agence de conseil basée à Tours. Analyse ce profil client et génère une stratégie d'investissement personnalisée, structurée et chiffrée.

## PROFIL CLIENT
- Nom : ${data.client_name || "NC"}
- Âge : ${data.age || "NC"} ans
- Situation : ${data.situation_familiale || "NC"}, ${data.enfants || 0} enfant(s)
- Profession : ${data.profession || "NC"} (${data.statut_pro || "NC"})
- Résidence : ${data.ville || "NC"}

## SITUATION FINANCIÈRE
- Revenus nets client : ${fmt(Number(data.revenus_nets_mensuels || 0))} €/mois
${data.revenus_conjoint_mensuels ? `- Revenus conjoint : ${fmt(Number(data.revenus_conjoint_mensuels))} €/mois` : ""}
- **Total revenus : ${fmt(revenus)} €/mois**
- TMI : ${data.tmi || "NC"} %
- Charges courantes : ${fmt(Number(data.charges_mensuelles || 0))} €/mois
${data.mensualites_credits ? `- Mensualités crédits : ${fmt(Number(data.mensualites_credits))} €/mois` : ""}
- **Cash flow libre : ${fmt(cashFlow)} €/mois**
- **Taux d'endettement actuel : ${tauxEffort} %**
- Épargne disponible : ${fmt(Number(data.epargne_disponible || 0))} €
- Capacité d'épargne mensuelle : ${fmt(Number(data.capacite_epargne || 0))} €
- Patrimoine immobilier : ${fmt(Number(data.patrimoine_immo || 0))} €
- **Capacité d'emprunt estimée : ~${fmt(capaciteEmprunt)} € (taux ${tauxCredit}%, ${duree} ans)**

## OBJECTIFS
- Objectifs : ${data.objectifs || "NC"}
- Horizon : ${data.horizon || "NC"}
- Budget total envisagé : ${fmt(Number(data.budget || 0))} €
- Revenu complémentaire cible : ${fmt(Number(data.revenu_cible || 0))} €/mois
- Niveau d'implication : ${data.implication || "NC"}

## CONTRAINTES
- Tolérance au risque : ${data.tolerance_risque || "NC"}
- Zones souhaitées : ${data.zones_souhaitees || "non précisé"}
- Types de biens : ${data.types_biens || "non précisé"}
- Délai de décision : ${data.delai_decision || "NC"}
${data.notes ? `- Notes : ${data.notes}` : ""}

## INSTRUCTIONS
Génère une stratégie immobilière personnalisée avec :
1. **2 à 3 recommandations concrètes et chiffrées** adaptées au profil fiscal (TMI ${data.tmi || "NC"}%)
2. Respect de la réglementation française 2025 : LMNP réel/micro-BIC, déficit foncier, SCPI (Pinel terminé fin 2024)
3. Taux d'endettement post-investissement ≤ 35%
4. Plan d'action séquentiel avec délais concrets

**Règle absolue** : réponds UNIQUEMENT avec un objet JSON valide, sans backticks, sans markdown. Format exact :
${OUTPUT_SCHEMA}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");

    const body = await req.json();
    if (!body.client_name) throw new Error("client_name requis");

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    let strategie;
    try {
      strategie = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse IA invalide");
      strategie = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ ok: true, strategie }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-strategie error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
