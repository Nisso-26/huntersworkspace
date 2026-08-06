// Logique d'invitation partagée entre `create-user` (mode invite) et
// `manage-user` (action resend_invite). Source de vérité unique.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Les liens d'activation pointent toujours vers le domaine de production.
export const APP_URL = "https://workspace.huntersimmobilier.fr";

export interface InviteParams {
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  /** Si true, supprime aussi un compte existant jamais connecté (renvoi d'invitation). */
  allowResetNeverSignedIn?: boolean;
}

export interface InviteResult {
  id: string | undefined;
  email: string;
  invitation_link: string | null;
}

export async function inviteUser(
  adminClient: SupabaseClient,
  params: InviteParams,
): Promise<InviteResult> {
  const { email, full_name, first_name, last_name, role } = params;
  if (!email) throw new Error("Email requis");

  const composedName = full_name || [first_name, last_name].filter(Boolean).join(" ").trim();
  if (!composedName) throw new Error("Prénom et nom requis");

  const redirectTo = `${APP_URL}/reset-password`;

  // Un compte existant est réinitialisé s'il est banni, orphelin, inactif,
  // ou (pour un renvoi d'invitation) s'il ne s'est jamais connecté.
  const { data: existingList } = await adminClient.auth.admin.listUsers();
  const existing = existingList?.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, status")
      .eq("id", existing.id)
      .maybeSingle();
    const isBanned = !!(existing as any).banned_until;
    const isOrphan = !profile;
    const isInactive = profile?.status === "inactif";
    const neverSignedIn = !(existing as any).last_sign_in_at;
    const resettable =
      isBanned || isOrphan || isInactive ||
      (params.allowResetNeverSignedIn === true && neverSignedIn);

    if (resettable) {
      console.log(
        `[invite] Suppression utilisateur existant (banned=${isBanned}, orphan=${isOrphan}, inactif=${isInactive}, jamais_connecte=${neverSignedIn}) pour réinvitation: ${email}`,
      );
      const { error: delError } = await adminClient.auth.admin.deleteUser(existing.id);
      if (delError) {
        console.error("[invite] deleteUser error:", delError);
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
    console.error("[invite] generateLink error:", error);
    throw new Error(`Erreur invitation: ${error.message}`);
  }

  const invitedUserId = data.user?.id;
  if (role && invitedUserId && role !== "mandataire") {
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: invitedUserId, role }, { onConflict: "user_id" });
    if (roleError) console.error("[invite] role upsert error:", roleError);
  }

  const invitationLink = data.properties?.action_link ?? null;

  if (invitationLink) {
    try {
      await adminClient.functions.invoke("send-notification", {
        body: {
          to: email,
          subject: "Bienvenue chez Hunters Immobilier — Activez votre compte",
          eyebrow: "Invitation",
          title: `Bienvenue ${composedName} !`,
          cta: { label: "Activer mon compte", url: invitationLink },
          body: `<p style="margin:0 0 12px;">Vous avez été invité(e) à rejoindre l'espace de travail Hunters Immobilier.</p>
            <p style="margin:0 0 12px;">Cliquez sur le bouton ci-dessous pour activer votre compte et définir votre mot de passe.</p>
            <p style="margin:0;font-size:11px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/><span style="word-break:break-all;">${invitationLink}</span></p>`,
        },
      });
    } catch (e) {
      console.error("[invite] send-notification error:", e);
    }
  }

  return { id: invitedUserId, email, invitation_link: invitationLink };
}
