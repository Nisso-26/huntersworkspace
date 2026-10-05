// Accès public (sans compte) à une fiche de présentation du bien, via son token.
// Ne renvoie jamais source_url ni description_source.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ token: z.string().min(32).max(128).regex(/^[A-Za-z0-9_-]+$/) });

const FICHE_COLS = [
  "id", "type_projet", "type_bien", "statut", "titre", "ville", "code_postal", "quartier", "prix_affiche",
  "surface_habitable", "surface_terrain", "nb_pieces", "nb_chambres", "etage", "ascenseur", "niveaux",
  "exposition", "chauffage", "annee_construction", "exterieur", "stationnement", "annexes", "sanitaires",
  "dpe_classe", "dpe_kwh", "ges_classe", "cout_energie_min", "cout_energie_max", "charges_copro_annuelles",
  "taxe_fonciere", "lecture_bien", "phrase_cle", "points_forts", "points_vigilance", "projet_texte", "travaux",
  "duree_detention_mois", "prix_revente_vise", "interet_constate", "bilan", "criteres_eval", "hypotheses",
  "recommandation", "prochaines_etapes", "risques", "envoyee_at", "dossier_id", "mandataire_id", "token_expires_at",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ erreur: "lien_invalide" }, 404);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: fiche } = await admin.from("fiches_biens").select(FICHE_COLS).eq("token_public", parsed.data.token).maybeSingle();
    const f = fiche as Record<string, any> | null;
    if (!f || !f.token_expires_at || new Date(f.token_expires_at) <= new Date()) return json({ erreur: "lien_expire" }, 404);

    await admin.from("fiches_biens").update({ derniere_consultation_at: new Date().toISOString() }).eq("id", f.id);

    const [{ data: photos }, { data: dossier }, { data: conseiller }, { data: societe }] = await Promise.all([
      admin.from("fiches_biens_photos").select("id,storage_path,ordre,legende,role").eq("fiche_id", f.id).order("ordre"),
      admin.from("dossiers").select("client_name,email,budget,contraintes_geographiques,type_bien_souhaite,surface_min,dpe_min,exterieur_souhaite").eq("id", f.dossier_id).maybeSingle(),
      admin.from("profiles").select("full_name,telephone,email,avatar_url,rsac_numero,rsac_greffe").eq("id", f.mandataire_id).maybeSingle(),
      admin.from("company_settings").select("raison_sociale,carte_t_numero,carte_t_organisme,site_web,mediateur").limit(1).maybeSingle(),
    ]);

    const list = (photos || []) as any[];
    let signed: { path: string | null; signedUrl: string }[] = [];
    if (list.length) {
      const r = await admin.storage.from("fiches-biens-photos").createSignedUrls(list.map(p => p.storage_path), 7200);
      signed = (r.data || []) as any;
    }
    const outPhotos = list.map(p => ({
      id: p.id, ordre: p.ordre, legende: p.legende, role: p.role,
      url: signed.find(s => s.path === p.storage_path)?.signedUrl ?? null,
    }));

    const d = dossier as any;
    const { dossier_id: _d, mandataire_id: _m, token_expires_at: _t, ...ficheOut } = f;
    return json({
      fiche: ficheOut,
      photos: outPhotos,
      client: { prenom: d?.client_name ?? "" },
      // Critères du dossier strictement nécessaires au tableau « Pourquoi ce bien »
      demande: d ? {
        budget: d.budget, contraintes_geographiques: d.contraintes_geographiques, type_bien_souhaite: d.type_bien_souhaite,
        surface_min: d.surface_min, dpe_min: d.dpe_min, exterieur_souhaite: d.exterieur_souhaite,
      } : null,
      conseiller: conseiller ?? null,
      societe: societe ?? null,
    });
  } catch (e) {
    console.error("fiche-publique error", e);
    return json({ erreur: "erreur_interne" }, 500);
  }
});
