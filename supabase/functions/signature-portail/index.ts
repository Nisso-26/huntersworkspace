// Portail public de signature électronique "Signature Hunters".
// Accès sans compte : uniquement via le token de la demande.
// Actions : get | sign | refuse
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "signatures";
const GREEN = rgb(0, 0.275, 0.129); // #004621
const GOLD = rgb(0.784, 0.588, 0.184); // #C8962F
const TEXT = rgb(0.173, 0.173, 0.173);

const TYPE_LABELS: Record<string, string> = {
  convention_cadre: "Convention de Mission Cadre",
  bon_commande: "Bon de Commande de Mission",
  mandat_recherche: "Mandat de Recherche",
  contrat_mandataire: "Contrat de Mandataire",
  offre_achat: "Offre d'Achat",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  return fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "inconnue";
}

async function buildSignedPdf(
  sourceBytes: Uint8Array | null,
  proof: {
    titre: string;
    nom: string;
    email: string;
    date: string;
    ip: string;
    methode: string;
    userAgent: string;
    reference: string;
  },
  signatureDataUrl: string | null,
  signatureType: string,
): Promise<Uint8Array> {
  const pdf = sourceBytes ? await PDFDocument.load(sourceBytes) : await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const page = pdf.addPage([595.28, 841.89]); // A4
  const W = 595.28;
  const H = 841.89;
  const M = 51; // ~18mm

  // Header vert (autorisé : bandeau d'en-tête)
  page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: GREEN });
  page.drawText("HUNTERS · IMMOBILIER", {
    x: M, y: H - 26, size: 13, font: bold, color: rgb(1, 1, 1),
  });
  page.drawRectangle({ x: 0, y: H - 43, width: W, height: 3, color: GOLD });

  let y = H - 90;
  page.drawText("CERTIFICAT DE SIGNATURE ÉLECTRONIQUE", { x: M, y, size: 15, font: bold, color: GREEN });
  y -= 12;
  page.drawRectangle({ x: M, y, width: 120, height: 2, color: GOLD });
  y -= 34;

  page.drawText(proof.titre, { x: M, y, size: 11, font: bold, color: TEXT });
  y -= 26;

  const rows: Array<[string, string]> = [
    ["Référence", proof.reference],
    ["Signataire", proof.nom],
    ["Adresse email", proof.email],
    ["Date et heure (UTC)", proof.date],
    ["Adresse IP", proof.ip],
    ["Méthode de signature", proof.methode],
    ["Navigateur", proof.userAgent.slice(0, 90)],
  ];

  rows.forEach(([label, value], i) => {
    const rowY = y - i * 24;
    if (i % 2 === 0) {
      page.drawRectangle({ x: M, y: rowY - 7, width: W - 2 * M, height: 22, color: rgb(0.98, 0.97, 0.94) });
    }
    page.drawText(label, { x: M + 6, y: rowY, size: 9.5, font: body, color: rgb(0.45, 0.45, 0.45) });
    page.drawText(value, { x: M + 190, y: rowY, size: 9.5, font: bold, color: TEXT });
    page.drawLine({
      start: { x: M, y: rowY - 8 },
      end: { x: W - M, y: rowY - 8 },
      thickness: 0.4,
      color: rgb(0.86, 0.86, 0.86),
    });
  });

  y -= rows.length * 24 + 30;

  page.drawText("Signature apposée", { x: M, y, size: 10, font: bold, color: GREEN });
  y -= 100;
  page.drawRectangle({
    x: M, y, width: 240, height: 90,
    borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.6, color: rgb(1, 1, 1),
  });

  if (signatureDataUrl && signatureType === "dessinee" && signatureDataUrl.startsWith("data:image/png")) {
    try {
      const b64 = signatureDataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const img = await pdf.embedPng(bytes);
      const scale = Math.min(220 / img.width, 74 / img.height);
      page.drawImage(img, {
        x: M + 10 + (220 - img.width * scale) / 2,
        y: y + 8 + (74 - img.height * scale) / 2,
        width: img.width * scale,
        height: img.height * scale,
      });
    } catch (_e) {
      page.drawText(proof.nom, { x: M + 16, y: y + 40, size: 18, font: italic, color: TEXT });
    }
  } else {
    page.drawText((signatureDataUrl || proof.nom).slice(0, 32), {
      x: M + 16, y: y + 40, size: 18, font: italic, color: TEXT,
    });
  }

  y -= 40;
  page.drawText(
    "Signature électronique simple au sens du règlement (UE) n° 910/2014 (eIDAS).",
    { x: M, y, size: 8, font: italic, color: rgb(0.45, 0.45, 0.45) },
  );
  y -= 12;
  page.drawText(
    "Les données de preuve ci-dessus sont conservées par Hunters Immobilier.",
    { x: M, y, size: 8, font: italic, color: rgb(0.45, 0.45, 0.45) },
  );

  page.drawRectangle({ x: 0, y: 0, width: W, height: 26, color: GREEN });
  page.drawText("Hunters Immobilier — Certificat généré automatiquement", {
    x: M, y: 9, size: 8, font: body, color: rgb(1, 1, 1),
  });

  return await pdf.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || "get");
    const token = String(payload.token || "");
    if (!UUID_RE.test(token)) return json({ error: "Lien invalide" }, 400);
    if (!["get", "sign", "refuse"].includes(action)) return json({ error: "Action invalide" }, 400);

    const { data: row, error } = await supabase
      .from("signatures_electroniques")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!row) return json({ error: "Lien invalide", code: "invalid" }, 404);

    const expired = new Date(row.expires_at).getTime() < Date.now();
    if (expired && row.statut === "en_attente") {
      await supabase.from("signatures_electroniques")
        .update({ statut: "expire" }).eq("id", row.id);
      row.statut = "expire";
    }

    // Document source (URL signée courte)
    let documentUrl: string | null = null;
    if (row.document_url) {
      const { data: signed } = await supabase.storage
        .from(BUCKET).createSignedUrl(row.document_url, 600);
      documentUrl = signed?.signedUrl ?? null;
    }

    const publicRow = {
      id: row.id,
      signataire_nom: row.signataire_nom,
      signataire_email: row.signataire_email,
      type_document: row.type_document,
      type_label: TYPE_LABELS[row.type_document] || row.type_document,
      document_nom: row.document_nom,
      statut: row.statut,
      expires_at: row.expires_at,
      signed_at: row.signed_at,
      document_url: documentUrl,
    };

    if (action === "get") return json({ signature: publicRow });

    if (row.statut !== "en_attente") {
      return json({ error: "Cette demande n'est plus en attente", code: row.statut }, 409);
    }

    if (action === "refuse") {
      const motif = String(payload.motif || "").slice(0, 500);
      if (!motif.trim()) return json({ error: "Motif requis" }, 400);
      await supabase.from("signatures_electroniques").update({
        statut: "refuse",
        motif_refus: motif,
        ip_address: clientIp(req),
        user_agent: (req.headers.get("user-agent") || "").slice(0, 400),
      }).eq("id", row.id);
      return json({ ok: true, statut: "refuse" });
    }

    // action === "sign"
    const signatureType = payload.signature_type === "tapee" ? "tapee" : "dessinee";
    const signatureData = String(payload.signature_data || "");
    if (!signatureData || signatureData.length > 2_000_000) {
      return json({ error: "Signature invalide" }, 400);
    }
    if (signatureType === "dessinee" && !signatureData.startsWith("data:image/png")) {
      return json({ error: "Signature invalide" }, 400);
    }

    const ip = clientIp(req);
    const ua = (req.headers.get("user-agent") || "").slice(0, 400);
    const signedAt = new Date();

    let sourceBytes: Uint8Array | null = null;
    if (row.document_url) {
      const { data: file } = await supabase.storage.from(BUCKET).download(row.document_url);
      if (file) sourceBytes = new Uint8Array(await file.arrayBuffer());
    }

    const finalPdf = await buildSignedPdf(
      sourceBytes,
      {
        titre: `${TYPE_LABELS[row.type_document] || row.type_document}${row.document_nom ? ` — ${row.document_nom}` : ""}`,
        nom: row.signataire_nom,
        email: row.signataire_email,
        date: signedAt.toISOString().replace("T", " ").slice(0, 19),
        ip,
        methode: signatureType === "dessinee" ? "Signature manuscrite numérique" : "Signature tapée (saisie du nom)",
        userAgent: ua,
        reference: row.id,
      },
      signatureData,
      signatureType,
    );

    const path = `signes/${row.id}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, finalPdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { error: updErr } = await supabase.from("signatures_electroniques").update({
      statut: "signe",
      signature_data: signatureData,
      signature_type: signatureType,
      ip_address: ip,
      user_agent: ua,
      signed_at: signedAt.toISOString(),
      document_signe_url: path,
    }).eq("id", row.id);
    if (updErr) throw updErr;

    // Notification au mandataire émetteur
    try {
      const { data: profile } = await supabase
        .from("profiles").select("full_name, email").eq("id", row.mandataire_id).maybeSingle();
      if (profile?.email) {
        await supabase.functions.invoke("send-notification", {
          body: {
            to: profile.email,
            subject: `Document signé — ${row.signataire_nom}`,
            body: `<h2 style="color:#004621;margin:0 0 16px;">Document signé</h2>
              <p>Bonjour ${profile.full_name || ""},</p>
              <p><strong>${row.signataire_nom}</strong> a signé le document
              « ${TYPE_LABELS[row.type_document] || row.type_document} » le
              ${signedAt.toLocaleDateString("fr-FR")} à ${signedAt.toLocaleTimeString("fr-FR")}.</p>
              <p>Le document signé et son certificat de preuves sont disponibles dans votre espace Hunters.</p>`,
          },
        });
      }
    } catch (e) {
      console.error("notification mandataire", e);
    }

    const { data: dl } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600, {
      download: `document-signe-${row.id}.pdf`,
    });

    return json({ ok: true, statut: "signe", document_signe_url: dl?.signedUrl ?? null });
  } catch (e) {
    console.error("signature-portail", e);
    return json({ error: (e as Error).message || "Erreur serveur" }, 500);
  }
});
