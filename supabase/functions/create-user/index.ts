import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { mode, email, password, full_name, first_name, last_name, role } = body;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // ---- Invite mode : génère un lien d'activation, pas de mot de passe ----
    if (mode === "invite") {
      if (!email) throw new Error("Email requis");
      const composedName = full_name || [first_name, last_name].filter(Boolean).join(" ").trim();
      if (!composedName) throw new Error("Prénom et nom requis");

      const APP_URL = "https://huntersworkspace.lovable.app";
      const redirectTo = `${APP_URL}/reset-password`;

      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { full_name: composedName, first_name, last_name },
          redirectTo,
        },
      });
      if (error) throw error;

      const invitedUserId = data.user?.id;
      if (role && invitedUserId && role !== "mandataire") {
        await adminClient.from("user_roles").update({ role }).eq("user_id", invitedUserId);
      }

      return new Response(
        JSON.stringify({
          id: invitedUserId,
          email,
          invitation_link: data.properties?.action_link ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Création directe avec mot de passe (legacy) ----
    if (!email || !password || !full_name) throw new Error("Email, mot de passe et nom requis");

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    if (role && role !== "mandataire" && newUser.user) {
      await adminClient.from("user_roles").update({ role }).eq("user_id", newUser.user.id);
    }

    return new Response(JSON.stringify({ id: newUser.user?.id, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
