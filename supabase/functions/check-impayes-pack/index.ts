import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Nombre de jours entre deux dates (arrondi bas) */
export function daysSince(date: string | Date, now: Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

/**
 * Détermine l'étape de relance cible selon l'ancienneté de la facture.
 * 0 = rien, 1 = mise en demeure (J+15), 2 = suspension (J+30), 3 = résiliation à examiner (J+45)
 * Exporté pour tests unitaires.
 */
export function etapeCible(joursEcoules: number): 0 | 1 | 2 | 3 {
  if (joursEcoules >= 45) return 3;
  if (joursEcoules >= 30) return 2;
  if (joursEcoules >= 15) return 1;
  return 0;
}

const euro = (n: number) => `${Number(n || 0).toLocaleString("fr-FR")} €`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") || "";

  // Accès : cron interne (service role ou appel pg_cron avec la clé publique)
  // ou super_admin authentifié. Le traitement est de toute façon borné par les
  // dates d'émission des factures et idempotent via `relance_etape`.
  const isCron = authHeader === `Bearer ${serviceRoleKey}`;
  if (!isCron) {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (user) {
      const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "super_admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Accès réservé au Super Admin" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();

  const { data: factures, error } = await supabase
    .from("factures")
    .select("id, mandataire_id, montant, montant_ttc, reference, numero_facture, date_emission, relance_etape")
    .eq("type", "abonnement")
    .eq("statut", "en_attente");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = { mises_en_demeure: 0, suspensions: 0, resiliations: 0 };

  for (const f of factures || []) {
    if (!f.mandataire_id || !f.date_emission) continue;
    const jours = daysSince(f.date_emission, now);
    const cible = etapeCible(jours);
    const actuelle = (f.relance_etape ?? 0) as number;
    if (cible === 0 || cible <= actuelle) continue;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", f.mandataire_id)
      .single();
    const nom = profile?.full_name || "Mandataire";
    const ref = f.numero_facture || f.reference || "";
    const montant = euro(Number(f.montant_ttc ?? f.montant));
    const dateEmission = new Date(f.date_emission).toLocaleDateString("fr-FR");

    const sendMail = async (subject: string, body: string, title?: string) => {
      if (!profile?.email) return;
      try {
        await supabase.functions.invoke("send-notification", {
          // functions.invoke n'ajoute pas d'en-tête Authorization : on force la clé
          // service_role pour que send-notification reconnaisse un appel interne.
          headers: { Authorization: `Bearer ${serviceRoleKey}` },
          body: { to: profile.email, subject, body, eyebrow: "Facturation pack mensuel", title: title ?? null },
        });
      } catch (e) { console.error("email impayé", e); }
    };


    // On traite chaque palier manqué séquentiellement pour ne rien sauter
    for (let etape = actuelle + 1; etape <= cible; etape++) {
      if (etape === 1) {
        await sendMail(
          `Mise en demeure — pack mensuel impayé (${ref})`,
          `<p>Bonjour ${nom},</p>
           <p>Nous constatons que la facture d'abonnement <strong>${ref}</strong>, émise le ${dateEmission}
           pour un montant de <strong>${montant}</strong>, demeure impayée à ce jour.</p>
           <p>Conformément à l'<strong>article 7.2</strong> de votre contrat de collaboration, nous vous mettons
           formellement en demeure de régulariser cette situation dans un délai de <strong>quinze (15) jours</strong>
           à compter de la présente notification.</p>
           <p>À défaut de règlement dans ce délai, l'accès aux outils et services HUNTERS sera
           <strong>suspendu de plein droit</strong>. En l'absence de régularisation dans les trente (30) jours suivant
           cette suspension, la résiliation du contrat pourra être prononcée.</p>
           <p>Nous vous invitons à procéder au règlement sans délai depuis votre espace HUNTERS.</p>
           <p style="font-size:11px;">Cette notification constitue une mise en demeure au sens de l'article 7.2 du contrat.</p>`,
          "Mise en demeure de payer"
        );
        await supabase.from("alertes").insert({
          user_id: null,
          type: "urgente",
          title: `Mise en demeure envoyée — ${nom}`,
          detail: `Pack impayé ${ref} — ${montant} — émis le ${dateEmission} (J+${jours}). Art. 7.2 : suspension sous 15 jours à défaut de règlement.`,
        });
        result.mises_en_demeure++;
      }

      if (etape === 2) {
        await supabase.from("profiles").update({ suspendu: true }).eq("id", f.mandataire_id);
        await sendMail(
          `Suspension de votre accès HUNTERS — pack impayé (${ref})`,
          `<p>Bonjour ${nom},</p>
           <p>La mise en demeure relative à la facture <strong>${ref}</strong> (${montant}, émise le ${dateEmission})
           étant restée sans effet pendant quinze (15) jours, votre accès aux outils et services HUNTERS est
           <strong>suspendu</strong> à compter de ce jour, en application de l'<strong>article 7.2</strong> du contrat.</p>
           <p>À défaut de régularisation dans un délai de <strong>trente (30) jours</strong>, la résiliation du contrat
           pourra être prononcée.</p>
           <p>La levée de la suspension est immédiate dès réception du règlement intégral.</p>`,
          "Suspension de l'accès aux outils"
        );
        await supabase.from("alertes").insert({
          user_id: null,
          type: "urgente",
          title: `Suspension appliquée — ${nom}`,
          detail: `Accès suspendu (Art. 7.2) — pack ${ref} impayé de ${montant} depuis le ${dateEmission} (J+${jours}).`,
        });
        result.suspensions++;
      }

      if (etape === 3) {
        await supabase.from("alertes").insert({
          user_id: null,
          type: "urgente",
          title: `Résiliation à examiner — ${nom}`,
          detail: `Pack ${ref} — ${montant} dû depuis le ${dateEmission} (J+${jours}). Historique : mise en demeure J+15, suspension J+30 appliquée, aucune régularisation à J+45. Décision de résiliation à prendre par la direction (Art. 7.2).`,
        });
        result.resiliations++;
      }
    }

    await supabase.from("factures").update({ relance_etape: cible }).eq("id", f.id);
  }

  return new Response(JSON.stringify({ traitees: (factures || []).length, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
