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

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: caller.id, _role: "super_admin" });
    if (!isAdmin) throw new Error("Accès réservé au Super Admin");

    const { action, user_id } = await req.json();
    if (!user_id || !action) throw new Error("action et user_id requis");
    if (user_id === caller.id) throw new Error("Vous ne pouvez pas modifier votre propre compte");

    const adminClient = createClient(supabaseUrl, serviceKey);

    if (action === "disable") {
      // Ban the user (soft disable)
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
      });
      if (error) throw error;
      // Update profile status
      await adminClient.from("profiles").update({ status: "inactif" }).eq("id", user_id);
      return new Response(JSON.stringify({ success: true, message: "Utilisateur désactivé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enable") {
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (error) throw error;
      await adminClient.from("profiles").update({ status: "actif" }).eq("id", user_id);
      return new Response(JSON.stringify({ success: true, message: "Utilisateur réactivé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Utilisateur supprimé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Action inconnue: " + action);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
