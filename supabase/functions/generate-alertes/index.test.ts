import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function callFunction() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-alertes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

Deno.test("generate-alertes: détecte attestations ALUR expirant sous 30j sans doublon", async () => {
  assert(SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY required");

  // 1) Create test user
  const email = `alur-test-${crypto.randomUUID()}@example.com`;
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password: "TestPass!" + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: "ALUR Test" },
  });
  assertEquals(userErr, null);
  const userId = created.user!.id;

  try {
    // handle_new_user trigger creates profile + role; ensure mandataire role
    await admin.from("user_roles").upsert({ user_id: userId, role: "mandataire" }, {
      onConflict: "user_id,role",
    });

    // 2) Insert conformite row with attestation_fin in 10 days
    const in10Days = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    const { error: confErr } = await admin.from("conformite_mandataires").insert({
      mandataire_id: userId,
      attestation_fin: in10Days,
      statut_attestation: "valide",
    });
    assertEquals(confErr, null);

    // Cleanup any prior matching alerts
    await admin.from("alertes").delete()
      .eq("user_id", userId).ilike("title", "%Attestation ALUR%");

    // 3) First call → should create exactly one alert
    const r1 = await callFunction();
    assertEquals(r1.status, 200);

    const { data: alerts1 } = await admin.from("alertes")
      .select("id, title, detail, type")
      .eq("user_id", userId).ilike("title", "%Attestation ALUR%");
    assertEquals(alerts1?.length, 1, "Une alerte ALUR doit être créée");
    assertEquals(alerts1![0].type, "warning");
    assert(alerts1![0].detail.includes("expire"), "Detail doit mentionner l'expiration");

    // 4) Second call → no duplicate (alert non lue existante)
    const r2 = await callFunction();
    assertEquals(r2.status, 200);

    const { data: alerts2 } = await admin.from("alertes")
      .select("id").eq("user_id", userId).ilike("title", "%Attestation ALUR%");
    assertEquals(alerts2?.length, 1, "Aucun doublon ne doit être créé");

    // 5) Attestation expirée hors fenêtre (>30j) → pas d'alerte pour ce cas
    // Crée un 2e user pour valider la borne
    const email2 = `alur-far-${crypto.randomUUID()}@example.com`;
    const { data: u2 } = await admin.auth.admin.createUser({
      email: email2, password: "TestPass!x" + crypto.randomUUID(), email_confirm: true,
    });
    const userId2 = u2.user!.id;
    try {
      await admin.from("user_roles").upsert({ user_id: userId2, role: "mandataire" }, {
        onConflict: "user_id,role",
      });
      const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      await admin.from("conformite_mandataires").insert({
        mandataire_id: userId2, attestation_fin: in90Days, statut_attestation: "valide",
      });
      await admin.from("alertes").delete()
        .eq("user_id", userId2).ilike("title", "%Attestation ALUR%");

      const r3 = await callFunction();
      assertEquals(r3.status, 200);

      const { data: alerts3 } = await admin.from("alertes")
        .select("id").eq("user_id", userId2).ilike("title", "%Attestation ALUR%");
      assertEquals(alerts3?.length, 0, "Pas d'alerte hors fenêtre 30 jours");
    } finally {
      await admin.from("alertes").delete().eq("user_id", userId2);
      await admin.from("conformite_mandataires").delete().eq("mandataire_id", userId2);
      await admin.auth.admin.deleteUser(userId2);
    }
  } finally {
    // Cleanup
    await admin.from("alertes").delete().eq("user_id", userId);
    await admin.from("conformite_mandataires").delete().eq("mandataire_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
});
