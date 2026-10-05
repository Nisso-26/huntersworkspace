import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const BUCKET = "fiches-biens-photos";

const Body = z.object({
  url: z.string().url().max(2000).optional(),
  texte: z.string().max(60000).optional(),
  fiche_id: z.string().uuid().optional(),
}).refine((b) => !!b.url || !!b.texte, { message: "url ou texte requis" });

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|p|div|li|h\d|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function extractImages(html: string, base: string): string[] {
  const out = new Set<string>();
  const add = (u: string) => {
    try {
      const abs = new URL(u.replace(/&amp;/g, "&"), base).href;
      if (!/^https?:/.test(abs)) return;
      if (/\.(svg|gif)(\?|$)/i.test(abs) || /logo|icon|sprite|avatar|pixel|tracking/i.test(abs)) return;
      out.add(abs);
    } catch { /* ignore */ }
  };
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["']/gi)) add(m[1]);
  for (const m of html.matchAll(/https?:\/\/[^"'\s)]+\.(?:jpe?g|webp|png)(?:\?[^"'\s)]*)?/gi)) add(m[0]);
  return [...out];
}

const FIELDS = `{
  "titre": string|null, "ville": string|null, "code_postal": string|null, "quartier": string|null,
  "prix_affiche": number|null, "surface_habitable": number|null, "surface_terrain": number|null,
  "nb_pieces": integer|null, "nb_chambres": integer|null, "etage": string|null, "ascenseur": boolean|null,
  "niveaux": integer|null, "exposition": string|null, "chauffage": string|null, "annee_construction": integer|null,
  "exterieur": string|null (balcon, terrasse, jardin uniquement),
  "stationnement": string|null (garage, parking, box uniquement),
  "annexes": string|null (cave, grenier, cellier, dependance uniquement),
  "sanitaires": string|null,
  "dpe_classe": "A".."G"|null, "dpe_kwh": number|null, "ges_classe": "A".."G"|null,
  "cout_energie_min": number|null, "cout_energie_max": number|null,
  "charges_copro_annuelles": number|null, "taxe_fonciere": number|null,
  "lecture_bien": string, "phrase_cle": string,
  "points_forts": string[] (4 max), "points_vigilance": string[] (4 max)
}`;

const SYSTEM = `Tu es conseiller chez HUNTERS Immobilier, cabinet de conseil en investissement immobilier.
A partir d'une annonce immobiliere, tu extrais les caracteristiques du bien et tu rediges une lecture du bien.
Regles strictes :
- Toute information absente de l'annonce vaut null. N'invente aucune valeur, aucun chiffre.
- Les montants sont des nombres en euros, sans symbole. Les surfaces en m2.
- Une cave n'est pas un stationnement : exterieur, stationnement et annexes sont distincts.
- lecture_bien : 120 a 160 mots, ton HUNTERS (sobre, elegant, factuel, aucun superlatif non justifie), jamais une copie de l'annonce.
- phrase_cle : une seule phrase.
- points_forts et points_vigilance : 4 au maximum chacun, factuels.
- Ne mentionne JAMAIS le nom de l'agence, du portail, du site, ni aucun lien, ni aucune reference d'annonce, dans aucun champ.
Reponds UNIQUEMENT avec un objet JSON valide, sans markdown, au format :
${FIELDS}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ erreur: "non_authentifie" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ erreur: "non_authentifie" }, 401);

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ erreur: "requete_invalide", details: parsed.error.flatten() }, 400);
    const { url, texte, fiche_id } = parsed.data;

    let contenu = (texte || "").trim();
    let images: string[] = [];
    if (!contenu && url) {
      try {
        const r = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
        const html = r.ok ? await r.text() : "";
        if (!r.ok) await r.body?.cancel().catch(() => {});
        contenu = htmlToText(html).slice(0, 40000);
        images = extractImages(html, url);
        const blocked = /captcha|access denied|are you a robot|cloudflare|datadome|enable javascript/i.test(contenu.slice(0, 2000));
        if (!r.ok || contenu.length < 300 || blocked) return json({ erreur: "lecture_impossible" });
      } catch {
        return json({ erreur: "lecture_impossible" });
      }
    }
    if (!contenu) return json({ erreur: "lecture_impossible" });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Clé IA non configurée");
    const provider = createOpenAI({
      baseURL: GATEWAY, apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const result = streamText({
      model: provider.responses(MODEL),
      system: SYSTEM,
      prompt: `ANNONCE :\n${contenu}`,
      abortSignal: req.signal,
      providerOptions: {
        openai: {
          forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto",
          store: false, include: ["reasoning.encrypted_content"],
        },
      },
    });
    const raw = (await result.text).trim();
    let data: Record<string, unknown>;
    try { data = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Réponse IA invalide");
      data = JSON.parse(m[0]);
    }
    data.points_forts = (Array.isArray(data.points_forts) ? data.points_forts : []).slice(0, 4);
    data.points_vigilance = (Array.isArray(data.points_vigilance) ? data.points_vigilance : []).slice(0, 4);

    // Photos de l'annonce (12 max), uniquement si la fiche est accessible à l'utilisateur
    let photos = 0;
    if (fiche_id && images.length) {
      const { data: fiche } = await userClient.from("fiches_biens").select("id").eq("id", fiche_id).maybeSingle();
      if (fiche) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { count } = await admin.from("fiches_biens_photos").select("id", { count: "exact", head: true }).eq("fiche_id", fiche_id);
        let ordre = count ?? 0;
        for (const img of images.slice(0, 24)) {
          if (photos >= 12) break;
          try {
            const r = await fetch(img, { headers: { ...BROWSER_HEADERS, Referer: url ?? "" } });
            const type = r.headers.get("content-type") || "";
            if (!r.ok || !type.startsWith("image/")) { await r.body?.cancel().catch(() => {}); continue; }
            const buf = new Uint8Array(await r.arrayBuffer());
            if (buf.byteLength < 15000) continue; // vignettes / icônes
            const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
            const path = `${fiche_id}/annonce-${crypto.randomUUID()}.${ext}`;
            const up = await admin.storage.from(BUCKET).upload(path, buf, { contentType: type });
            if (up.error) continue;
            await admin.from("fiches_biens_photos").insert({
              fiche_id, storage_path: path, ordre: ordre++, origine: "annonce",
              role: ordre === 1 ? "couverture" : "galerie",
            });
            photos++;
          } catch { /* ignorée silencieusement */ }
        }
      }
    }

    return json({ ok: true, fiche: data, description_source: contenu, photos_importees: photos });
  } catch (e) {
    console.error("extract-annonce error", e);
    return json({ erreur: "erreur_interne", message: (e as Error).message }, 500);
  }
});
