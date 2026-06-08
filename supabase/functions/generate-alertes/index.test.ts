import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectExpiringAlurAttestations } from "./index.ts";

type Row = Record<string, any>;

/** Mini mock Postgrest query builder pour simuler supabase-js. */
function createMockClient(tables: Record<string, Row[]>) {
  const calls: { table: string; filters: Array<[string, string, any]> }[] = [];

  function query(table: string) {
    const filters: Array<[string, string, any]> = [];
    let rows = tables[table] ?? [];
    const call = { table, filters };
    calls.push(call);

    const builder: any = {
      select: () => builder,
      eq: (col: string, val: any) => { filters.push(["eq", col, val]); rows = rows.filter(r => r[col] === val); return builder; },
      lte: (col: string, val: any) => { filters.push(["lte", col, val]); rows = rows.filter(r => r[col] <= val); return builder; },
      gte: (col: string, val: any) => { filters.push(["gte", col, val]); rows = rows.filter(r => r[col] >= val); return builder; },
      ilike: (col: string, pattern: string) => {
        filters.push(["ilike", col, pattern]);
        const needle = pattern.replace(/%/g, "").toLowerCase();
        rows = rows.filter(r => String(r[col] ?? "").toLowerCase().includes(needle));
        return builder;
      },
      limit: (n: number) => { rows = rows.slice(0, n); return builder; },
      then: (resolve: any) => resolve({ data: rows, error: null }),
    };
    return builder;
  }

  return {
    from: (table: string) => query(table),
    _calls: calls,
  };
}

const NOW = new Date("2026-06-08T00:00:00.000Z");
const iso = (daysFromNow: number) =>
  new Date(NOW.getTime() + daysFromNow * 86400000).toISOString().slice(0, 10);

Deno.test("ALUR: crée une alerte pour une attestation expirant sous 30 jours", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(10), statut_attestation: "valide" },
    ],
    alertes: [],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 1);
  assertEquals(alerts[0].user_id, "user-1");
  assertEquals(alerts[0].type, "warning");
  assertEquals(alerts[0].title, "Attestation ALUR — renouvellement requis");
});

Deno.test("ALUR: ignore les attestations expirant au-delà de 30 jours", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(90), statut_attestation: "valide" },
    ],
    alertes: [],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 0);
});

Deno.test("ALUR: ignore les attestations déjà expirées", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(-5), statut_attestation: "valide" },
    ],
    alertes: [],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 0);
});

Deno.test("ALUR: ignore les attestations dont le statut n'est pas 'valide'", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(10), statut_attestation: "expiree" },
    ],
    alertes: [],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 0);
});

Deno.test("ALUR: pas de doublon si une alerte non lue existe déjà pour ce mandataire", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(10), statut_attestation: "valide" },
    ],
    alertes: [
      { id: "a1", user_id: "user-1", title: "Attestation ALUR — renouvellement requis", is_read: false },
    ],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 0);
});

Deno.test("ALUR: recrée une alerte si l'alerte existante a été lue", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(10), statut_attestation: "valide" },
    ],
    alertes: [
      { id: "a1", user_id: "user-1", title: "Attestation ALUR — renouvellement requis", is_read: true },
    ],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  assertEquals(alerts.length, 1);
});

Deno.test("ALUR: traite plusieurs mandataires indépendamment", async () => {
  const client = createMockClient({
    conformite_mandataires: [
      { id: "c1", mandataire_id: "user-1", attestation_fin: iso(5), statut_attestation: "valide" },
      { id: "c2", mandataire_id: "user-2", attestation_fin: iso(20), statut_attestation: "valide" },
      { id: "c3", mandataire_id: "user-3", attestation_fin: iso(60), statut_attestation: "valide" },
    ],
    alertes: [
      { id: "a1", user_id: "user-2", title: "Attestation ALUR — renouvellement requis", is_read: false },
    ],
  });
  const alerts = await detectExpiringAlurAttestations(client, NOW);
  // user-1 → alerte ; user-2 → doublon ignoré ; user-3 → hors fenêtre
  assertEquals(alerts.length, 1);
  assertEquals(alerts[0].user_id, "user-1");
});
