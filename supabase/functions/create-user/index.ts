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

    // Verify caller is super_admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Non autorisé");

    // Check role
    const { data: roleData } = await userClient.rpc("has_role", { _user_id: caller.id, _role: "super_admin" });
    if (!roleData) throw new Error("Accès réservé au Super Admin");

    const { email, password, full_name, role } = await req.json();
    if (!email || !password || !full_name) throw new Error("Email, mot de passe et nom requis");

    // Create user with service role
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) throw createError;

    // Set role if specified (default is 'mandataire' via trigger)
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
