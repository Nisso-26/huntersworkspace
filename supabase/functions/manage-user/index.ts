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

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: caller.id, _role: "super_admin" });
    if (!isAdmin) throw new Error("Accès réservé au Super Admin");

    const { action, user_id } = await req.json();
    if (!action) throw new Error("action requis");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // ---- Statut d'activation de tous les comptes (last_sign_in_at) ----
    if (action === "list_status") {
      const { data: list, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw error;
      const users = (list?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        banned_until: u.banned_until ?? null,
        created_at: u.created_at ?? null,
      }));
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_id) throw new Error("user_id requis");
    if (user_id === caller.id) throw new Error("Vous ne pouvez pas modifier votre propre compte");

    // ---- Renvoi d'invitation pour un compte jamais activé ----
    if (action === "resend_invite") {
      const { data: target, error: targetErr } = await adminClient.auth.admin.getUserById(user_id);
      if (targetErr || !target?.user) throw new Error("Utilisateur introuvable");
      if (target.user.last_sign_in_at) {
        throw new Error("Ce compte est déjà activé : le renvoi d'invitation est inutile");
      }

      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .maybeSingle();
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user_id)
        .maybeSingle();

      const meta = (target.user.user_metadata || {}) as Record<string, unknown>;
      const fullName =
        (profile?.full_name as string | undefined) ||
        (meta.full_name as string | undefined) ||
        (target.user.email ?? "");

      const result = await inviteUser(adminClient, {
        email: target.user.email!,
        full_name: fullName,
        first_name: (meta.first_name as string | undefined) ?? null,
        last_name: (meta.last_name as string | undefined) ?? null,
        role: (roleRow?.role as string | undefined) ?? null,
        allowResetNeverSignedIn: true,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Invitation renvoyée à ${target.user.email}`,
          ...result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    if (action === "disable") {
      // Ban the user (soft disable)
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876000h", // ~100 years
      });
      if (error) throw error;
      // Update profile status
      await adminClient.from("profiles").update({ status: "suspendu" }).eq("id", user_id);
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
