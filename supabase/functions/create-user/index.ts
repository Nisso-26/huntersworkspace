import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { inviteUser } from "../_shared/invite.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Non autorisé");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Non autorisé");

    const { data: roleData } = await userClient.rpc("has_role", { _user_id: caller.id, _role: "super_admin" });
    if (!roleData) throw new Error("Accès réservé au Super Admin");

    const body = await req.json();
    const { mode, email, password, full_name, first_name, last_name, role, app_url } = body;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // URL de redirection forcée vers le domaine de production (voir _shared/invite.ts).
    // app_url est ignoré pour garantir que les liens d'invitation pointent
    // toujours vers https://workspace.huntersimmobilier.fr/reset-password.
    void app_url;

    // ---- Invite mode : génère un lien d'activation, pas de mot de passe ----
    if (mode === "invite") {
      const result = await inviteUser(adminClient, {
        email,
        full_name,
        first_name,
        last_name,
        role,
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // ---- Création directe avec mot de passe (legacy) ----
    if (!email || !password || !full_name) throw new Error("Email, mot de passe et nom requis");

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) {
      console.error("[create-user] createUser error:", createError);
      throw new Error(`Erreur création: ${createError.message}`);
    }

    if (role && role !== "mandataire" && newUser.user) {
      await adminClient.from("user_roles").upsert({ user_id: newUser.user.id, role }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ id: newUser.user?.id, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[create-user] FAIL:", error?.message || error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
