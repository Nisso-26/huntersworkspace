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
  "10. CONCLUSION",
];

const COMMON_RULES = `
RÈGLES IMPÉRATIVES — à respecter sans exception :

1. TAUX D'ENDETTEMENT :
   - Section 2 : afficher OBLIGATOIREMENT les deux taux :
     a) Taux actuel = (charges mensuelles existantes / revenus nets) × 100
     b) Taux après projet = (charges existantes + mensualités du/des nouveaux crédits) / revenus nets × 100
   - Utiliser UNIQUEMENT les mensualités des nouveaux crédits liés au projet, PAS l'épargne ou le cash-flow libre.
   - Conclure sur la conformité HCSF (seuil 35%).

2. CASH-FLOW SCPI :
   - Pour toute SCPI financée à crédit, calculer le cash-flow net RÉEL après fiscalité :
     Cash-flow net = (Revenus SCPI bruts) × (1 - TMI - 0.172) - mensualité crédit
   - Indiquer l'hypothèse de TMI utilisée entre parenthèses.
   - Si le résultat est négatif, l'afficher tel quel — ne JAMAIS arrondir à 0 ou inverser le signe.
   - Ne JAMAIS mentionner un "abattement forfaitaire de 30% sur les charges SCPI" — cette notion est FAUSSE pour les SCPI via crédit.

3. SCPI — FISCALITÉ :
   - Les revenus de SCPI sont des revenus fonciers soumis au barème progressif de l'IR + 17,2% de prélèvements sociaux.
   - Les intérêts d'emprunt sont déductibles des revenus fonciers SCPI.
   - Ne JAMAIS confondre avec le régime micro-foncier (abattement 30%) qui ne s'applique pas aux SCPI financées à crédit.

4. SIGNATURE :
   - Utiliser EXACTEMENT le nom et le titre fournis dans les données.
   - Ne JAMAIS inventer ou modifier le titre (ex: ne pas écrire "Conseillère Senior" si le titre fourni est "Directeur").

5. FORMAT :
   - Markdown pur. Aucun préambule. Aucun bloc de code englobant.
   - Chaque section commence par son titre en MAJUSCULES précédé de son numéro.

6. FORMULES DE POLITESSE (section 10) :
   - Utiliser des formules distinguées et raffinées, dignes d'un cabinet de conseil premium.
   - Exemple : "Nous vous prions d'agréer, [Civilité] [Nom], l'expression de notre considération distinguée et de notre entier dévouement à la réussite de votre projet patrimonial."
   - Signer avec le nom complet, le titre exact et "Hunters Immobilier · Tours".
   - Ajouter une phrase de conclusion analytique synthétisant les 3 points forts du profil avant les formules.`;

const SYSTEM_PROMPT_FULL = `Tu es un consultant senior en investissement immobilier pour Hunters Immobilier, cabinet premium basé à Tours. Tu rédiges des rapports de conseil complets, professionnels et objectifs, avec un ton chaleureux, précis et premium, en français.

Le rapport doit contenir EXACTEMENT ces 10 sections, dans cet ordre, chacune introduite par son titre en MAJUSCULES précédé de son numéro :

1. PROFIL CLIENT
   — Présentation valorisante, objective, professionnelle. Mettre en lumière les atouts financiers et personnels sans condescendance, quel que soit le niveau de revenus. Tone : cabinet de conseil premium.

2. CAPACITÉ DE FINANCEMENT
   — Tableau structuré des revenus nets, charges existantes, taux d'endettement ACTUEL et taux d'endettement APRÈS PROJET (calculé sur les nouvelles mensualités uniquement), capacité d'emprunt maximale, apport disponible, mensualité maximale supportable. Conclusion sur la solidité du dossier bancaire et conformité HCSF.

3. MONTAGES ET SCÉNARIOS DE FINANCEMENT
   — 2 à 3 scénarios concrets (amortissable classique, apport optimisé, SCI IS si pertinent) avec avantages et limites de chacun. Recommandation argumentée.

4. STRATÉGIE D'INVESTISSEMENT
   — Recommandations détaillées adaptées au profil, aux objectifs déclarés et à la fiscalité du client. Argumenter chaque recommandation.

5. SCÉNARIO COMPARATIF
   — Tableau Markdown comparatif de 2 à 3 options sur : rendement brut, cash-flow net RÉEL après fiscalité, effort d'épargne mensuel, horizon de rentabilité, niveau de risque, liquidité, contraintes de gestion.
   — Note obligatoire sous le tableau précisant la méthode de calcul du cash-flow net (TMI + prélèvements sociaux).

6. RENTABILITÉ ET CASH-FLOW CIBLES
   — Projections chiffrées sur 3 horizons (années 1-3, 4-7, 8-10) : revenus locatifs bruts annuels, cash-flow net mensuel, capital remboursé, plus-value estimée. Rentabilité globale annualisée à 10 ans.

7. RECOMMANDATIONS
   — 5 priorités concrètes et actionnables, classées par ordre d'importance avec justification.

8. PLAN D'INVESTISSEMENT PROGRESSIF
   — 5 phases avec intitulés, actions concrètes et jalons temporels précis.

9. ORIENTATION FISCALE
   — 2 à 3 paragraphes maximum. Orientation générale sur les régimes pertinents (LMNP réel, SCI IS, revenus fonciers SCPI). Non prescriptif. Recommander explicitement un CGP ou expert-comptable pour toute décision fiscale.

10. CONCLUSION
    — Synthèse analytique du profil (3 points forts du projet), perspective patrimoniale à long terme, puis formules de politesse distinguées et raffinées signées au nom du conseiller avec son titre exact.

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
- Nom complet : ${d.conseiller || "Hunters Immobilier"}
- Titre exact : ${d.conseiller_titre || "Conseiller"}
- Cabinet : Hunters Immobilier · Tours

## STRATÉGIE PATRIMONIALE DÉJÀ ÉTABLIE (référence chiffrée — à intégrer dans le rapport)
${d.strategie ? (typeof d.strategie === "string" ? d.strategie : JSON.stringify(d.strategie)) : "Aucune stratégie pré-établie — construire le rapport à partir des données disponibles et des standards du marché français 2026."}

## INSTRUCTION CRITIQUE
Pour le calcul du taux d'endettement après projet : utiliser UNIQUEMENT les mensualités des nouveaux crédits liés au projet (issues de la stratégie ci-dessus). Ne pas inclure l'épargne mensuelle ou le cash-flow libre dans ce calcul.`;

  if (sectionTitle) {
    return `Rédige UNIQUEMENT la section "${sectionTitle}" pour le client ci-dessous. Respecte strictement toutes les règles impératives.\n\n${ctx}`;
  }
  return `Rédige le rapport de conseil complet pour le client suivant, en respectant exactement les 10 sections imposées et toutes les règles impératives.\n\n${ctx}`;
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
