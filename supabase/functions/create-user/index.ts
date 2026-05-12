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
    const { mode, email, password, full_name, first_name, last_name, role, app_url } = body;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // URL de redirection forcée vers le domaine de production.
    // app_url est ignoré pour garantir que les liens d'invitation pointent
    // toujours vers https://workspace.huntersimmobilier.fr/reset-password.
    const APP_URL = "https://workspace.huntersimmobilier.fr";
    void app_url;

    // ---- Invite mode : génère un lien d'activation, pas de mot de passe ----
    if (mode === "invite") {
      if (!email) throw new Error("Email requis");
      const composedName = full_name || [first_name, last_name].filter(Boolean).join(" ").trim();
      if (!composedName) throw new Error("Prénom et nom requis");

      const redirectTo = `${APP_URL}/reset-password`;

      // Vérifie si l'email existe déjà. Si l'utilisateur est désactivé (banned)
      // ou orphelin (pas de profil), on le supprime pour permettre la réinvitation.
      const { data: existingList } = await adminClient.auth.admin.listUsers();
      const existing = existingList?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("id, status")
          .eq("id", existing.id)
          .maybeSingle();
        const isBanned = !!(existing as any).banned_until;
        const isOrphan = !profile;
        const isInactive = profile?.status === "inactif";
        if (isBanned || isOrphan || isInactive) {
          console.log(`[create-user] Suppression utilisateur existant (banned=${isBanned}, orphan=${isOrphan}, inactif=${isInactive}) pour réinvitation: ${email}`);
          const { error: delError } = await adminClient.auth.admin.deleteUser(existing.id);
          if (delError) {
            console.error("[create-user] deleteUser error:", delError);
            throw new Error(`Impossible de réinitialiser le compte existant: ${delError.message}`);
          }
        } else {
          throw new Error(`Un utilisateur actif avec l'email ${email} existe déjà`);
        }
      }

      const { data, error } = await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: {
          data: { full_name: composedName, first_name, last_name },
          redirectTo,
        },
      });
      if (error) {
        console.error("[create-user] generateLink error:", error);
        throw new Error(`Erreur invitation: ${error.message}`);
      }

      const invitedUserId = data.user?.id;
      if (role && invitedUserId && role !== "mandataire") {
        const { error: roleError } = await adminClient
          .from("user_roles")
          .upsert({ user_id: invitedUserId, role }, { onConflict: "user_id" });
        if (roleError) console.error("[create-user] role upsert error:", roleError);
      }

      const invitationLink = data.properties?.action_link ?? null;

      // Notification email d'invitation
      if (invitationLink) {
        try {
          await adminClient.functions.invoke("send-notification", {
            body: {
              to: email,
              subject: "Bienvenue chez Hunters Immobilier — Activez votre compte",
              body: `<h2 style="color:#1A4D2E;margin:0 0 16px;">Bienvenue ${composedName} !</h2>
                <p>Vous avez été invité(e) à rejoindre l'espace de travail Hunters Immobilier.</p>
                <p>Cliquez sur le bouton ci-dessous pour activer votre compte et définir votre mot de passe :</p>
                <p style="text-align:center;margin:28px 0;">
                  <a href="${invitationLink}" style="background:#1A4D2E;color:#fff;text-decoration:none;padding:12px 28px;border-radius:2px;display:inline-block;font-weight:600;">Activer mon compte</a>
                </p>
                <p style="font-size:12px;color:#888;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/><span style="word-break:break-all;">${invitationLink}</span></p>`,
            },
          });
        } catch (e) {
          console.error("[create-user] send-notification error:", e);
        }
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
