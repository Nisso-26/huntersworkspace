import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabase-pagination';
import type { CompanySettings } from './use-company-settings';
import { fmtPdfEur } from '@/lib/pdf-utils';
import {
  assertEmail, markEnvoiEnCours, pdfToBase64, safePdfFilename, sendDocumentEmail,
  type DocEmailStatut,
} from '@/lib/document-email';


export interface FactureLigne {
  service_key?: string;
  label: string;
  tarif_base: number;
  remise_pct: number;
  remise_montant: number;
  montant_ht: number;
  tva_taux: number;
}

export interface Facture {
  id: string;
  numero_facture: string | null;
  mandataire_id: string | null;
  dossier_id: string | null;
  montant: number;
  tva_taux: number;
  montant_ttc: number;
  type: string;
  statut: string;
  date_emission: string;
  date_paiement: string | null;
  date_echeance: string | null;
  reference: string | null;
  client_name: string | null;
  dossier_client_name: string | null;
  created_at: string;
  remise_pct?: number | null;
  remise_montant?: number | null;
  lignes?: FactureLigne[] | null;
  jalon_id?: string | null;
  mode_facturation?: string | null;
  mandataire_name?: string;
  mandataire_zone?: string;
  dossier_numero?: string | null;
  dossier_email?: string | null;

  email_statut?: DocEmailStatut | null;
  email_destinataire?: string | null;
  email_envoye_at?: string | null;
  email_erreur?: string | null;
}


export function useFactures() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['factures'],
    queryFn: async () => {
      const data = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from('factures')
          .select('*')
          .order('date_emission', { ascending: false })
          .range(from, to),
      );

      const mandataireIds = [...new Set((data || []).map((f: any) => f.mandataire_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (mandataireIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, zone')
          .in('id', mandataireIds);
        (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
      }

      const dossierIds = [...new Set((data || []).map((f: any) => f.dossier_id).filter(Boolean))];
      let dossierMap: Record<string, { numero: string | null; email: string | null }> = {};
      if (dossierIds.length > 0) {
        const { data: dossiers } = await (supabase.from('dossiers') as any)
          .select('id, numero_dossier, email')
          .in('id', dossierIds);
        (dossiers || []).forEach((d: any) => {
          dossierMap[d.id] = { numero: d.numero_dossier, email: d.email };
        });
      }

      return (data || []).map((f: any) => ({
        ...f,
        montant: Number(f.montant) || 0,
        tva_taux: Number(f.tva_taux) || 20,
        montant_ttc: Number(f.montant_ttc) || 0,
        mandataire_name: profilesMap[f.mandataire_id]?.full_name || 'N/A',
        mandataire_zone: profilesMap[f.mandataire_id]?.zone || '',
        dossier_numero: f.dossier_id ? dossierMap[f.dossier_id]?.numero || null : null,
        dossier_email: f.dossier_id ? dossierMap[f.dossier_id]?.email || null : null,
      })) as Facture[];

    },
    enabled: !!user,
  });
}

export function useCreateFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (facture: Partial<Facture>) => {
      const montantHT = Number(facture.montant) || 0;
      const tva = Number(facture.tva_taux) || 20;
      const montantTTC = montantHT * (1 + tva / 100);
      const dateEmission = facture.date_emission || new Date().toISOString();
      const dateEcheance = facture.date_echeance || new Date(Date.now() + 30 * 86400000).toISOString();

      const { data, error } = await supabase.from('factures').insert({
        ...facture,
        montant: montantHT,
        tva_taux: tva,
        montant_ttc: Math.round(montantTTC * 100) / 100,
        date_emission: dateEmission,
        date_echeance: dateEcheance,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture créée');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFacture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Facture> & { id: string }) => {
      const { error } = await supabase.from('factures').update(updates as any).eq('id', id).select().single();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture mise à jour');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

const typeLabels: Record<string, string> = {
  honoraires: 'Honoraires de chasse immobilière',
  abonnement: 'Pack mandataire mensuel',
  commission: 'Commission mandataire',
  avoir: 'Avoir / Remboursement',
};


export async function generateFacturePDF(
  facture: Facture,
  settings?: Partial<CompanySettings> | null,
  opts?: { mode?: 'save' | 'base64' },
): Promise<string | void> {

  // Lazy-load jsPDF (≈ 350 kB) uniquement à la demande pour alléger le bundle initial
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const s = settings || {};

  // Récupère les coordonnées du client depuis le dossier (email / téléphone / ville)
  let clientEmail = '';
  let clientPhone = '';
  let clientVille = '';
  if (facture.dossier_id) {
    try {
      const { data: dRow } = await (supabase.from('dossiers') as any)
        .select('email, phone, ville')
        .eq('id', facture.dossier_id)
        .maybeSingle();
      if (dRow) {
        clientEmail = dRow.email || '';
        clientPhone = dRow.phone || '';
        clientVille = dRow.ville || '';
      }
    } catch { /* ignore */ }
  }

  const {
    C, FONT, LAYOUT, drawHeader, drawFooter, drawSectionTitle,
    drawIvoryBox, drawTableHeader, drawTableRow, ensureSpace, sanitizePdfText,
  } = await import('@/lib/pdf-design-system');
  const { marginL, marginR, pageW, contentW, footerY } = LAYOUT;

  const raisonSociale = (s.raison_sociale || 'HUNTERS Immobilier').toUpperCase();
  const formeJuridique = s.forme_juridique || '';
  const capital = s.capital_social ? `au capital de ${s.capital_social}` : '';
  const siret = s.siret || '';
  const rcs = s.rcs || '';
  const tvaIntra = s.numero_tva_intra || '';
  const adresse = s.adresse_siege || '';
  const tel = s.telephone || '';
  const email = s.email_contact || '';
  const site = s.site_web || '';
  const carteT = s.carte_t_numero ? `Carte T n° ${s.carte_t_numero}${s.carte_t_organisme ? ` (${s.carte_t_organisme})` : ''}` : '';
  const rcp = s.assureur_rcp ? `RCP : ${s.assureur_rcp}${s.assureur_police ? ` — Police ${s.assureur_police}` : ''}` : '';
  const iban = s.iban || '';
  const bic = s.bic || '';

  const montantHT = facture.montant;
  const tvaTaux = facture.tva_taux || 20;

  const numero = facture.numero_facture || facture.reference || '—';
  const ctx = { refDossier: facture.dossier_numero || numero, titrePage: 'Facture' };

  // ───── En-tête charte ─────
  drawHeader(doc, ctx.refDossier, ctx.titrePage);
  let y = LAYOUT.headerH + 8;

  y = drawSectionTitle(doc, 'Facture', y);

  // ───── Bloc identités : émetteur (gauche) / client (droite) ─────
  const colW = contentW / 2 - 4;
  const rightX = marginL + contentW / 2 + 4;

  const emetteurLines = [
    raisonSociale,
    [formeJuridique, capital].filter(Boolean).join(' '),
    ...adresse.split('\n').slice(0, 3),
    tel ? `Tel. ${tel}` : '',
    email,
  ].filter(Boolean);

  const clientLines = [
    facture.dossier_client_name || facture.client_name || '—',
    clientEmail,
    clientPhone ? `Tel. ${clientPhone}` : '',
    clientVille,
    facture.mandataire_name ? `Suivi par ${facture.mandataire_name}` : '',
  ].filter(Boolean);

  const blocH = Math.max(emetteurLines.length, clientLines.length) * 5 + 14;
  drawIvoryBox(doc, y, blocH);
  // Deuxième encadré crème pour la colonne client
  doc.setFillColor(...C.cream);
  doc.rect(rightX, y, colW, blocH, 'F');
  doc.setFillColor(...C.green);
  doc.rect(rightX, y, 1.06, blocH, 'F');

  const drawBloc = (x: number, label: string, lines: string[]) => {
    doc.setFont(FONT.body, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.green);
    doc.text(label.toUpperCase(), x + 5.6, y + 6.5);
    doc.setFont(FONT.body, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    lines.forEach((l, i) => {
      doc.text(sanitizePdfText(l), x + 5.6, y + 12.5 + i * 5, { maxWidth: colW - 10 });
    });
  };
  drawBloc(marginL, 'Emetteur', emetteurLines);
  drawBloc(rightX, 'Facture a', clientLines);
  y += blocH + 8;

  // ───── Références de la facture ─────
  const refs: Array<[string, string]> = [
    ['N° de facture', numero],
    ["Date d'émission", new Date(facture.date_emission).toLocaleDateString('fr-FR')],
    ["Date d'échéance", facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : 'J+30'],
  ];
  if (facture.dossier_numero) refs.push(['Réf. dossier', facture.dossier_numero]);
  doc.setFontSize(9);
  refs.forEach(([label, val]) => {
    doc.setFont(FONT.body, 'normal');
    doc.setTextColor(...C.textMuted);
    doc.text(sanitizePdfText(label), marginL, y);
    doc.setFont(FONT.body, 'bold');
    doc.setTextColor(...C.ink);
    doc.text(sanitizePdfText(val), marginL + 40, y);
    y += 5.5;
  });
  y += 6;

  // ───── Tableau des prestations ─────
  const lignes: FactureLigne[] = (facture as any).lignes && (facture as any).lignes.length
    ? (facture as any).lignes
    : [{
        label: typeLabels[facture.type] || facture.type,
        tarif_base: montantHT,
        remise_pct: 0,
        remise_montant: 0,
        montant_ht: montantHT,
        tva_taux: tvaTaux,
      }];

  const xDes = marginL + 3;
  const xTarif = marginL + 104;
  const xRemise = marginL + 126;
  const xTva = marginL + 144;
  const xNet = pageW - marginR - 3;

  y = ensureSpace(doc, y, 22, ctx);
  y = drawTableHeader(doc, y, [
    { label: 'Désignation', x: xDes },
    { label: 'Tarif HT', x: xTarif, align: 'right' },
    { label: 'Remise', x: xRemise, align: 'right' },
    { label: 'TVA', x: xTva, align: 'right' },
    { label: 'Net HT', x: xNet, align: 'right' },
  ]);

  lignes.forEach((l, idx) => {
    const isCleEnMain = l.service_key === 'cle_en_main' || /clé en main/i.test(l.label || '');
    y = ensureSpace(doc, y, isCleEnMain ? 14 : 7.5, ctx);
    y = drawTableRow(doc, y, [
      { value: l.label, x: xDes },
      { value: fmtPdfEur(l.tarif_base), x: xTarif, align: 'right' },
      { value: l.remise_pct > 0 ? `-${l.remise_pct} %` : '-', x: xRemise, align: 'right' },
      { value: `${l.tva_taux} %`, x: xTva, align: 'right' },
      { value: fmtPdfEur(l.montant_ht), x: xNet, align: 'right', bold: true },
    ], idx, 7.5);
    if (isCleEnMain) {
      // Ligne de détail des prestations incluses, sur sa propre ligne
      doc.setFillColor(...(idx % 2 === 0 ? C.white : C.creamLight));
      doc.rect(marginL, y, contentW, 6, 'F');
      doc.setFont(FONT.body, 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textMuted);
      doc.text(
        sanitizePdfText('Inclus : Conseil en investissement · Chasse immobilière · AMO · Décoration / Ameublement'),
        xDes,
        y + 4,
      );
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.18);
      doc.line(marginL, y + 6, marginL + contentW, y + 6);
      y += 6;
    }
  });


  const totalHTReel = lignes.reduce((acc, l) => acc + l.montant_ht, 0);
  const totalTVAReel = lignes.reduce((acc, l) => acc + l.montant_ht * (l.tva_taux / 100), 0);
  const totalRemise = lignes.reduce((acc, l) => acc + l.remise_montant, 0);
  const ttcReel = totalHTReel + totalTVAReel;

  // ───── Totaux ─────
  y = ensureSpace(doc, y, 40, ctx) + 8;
  if (totalRemise > 0) {
    doc.setFont(FONT.body, 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...C.green);
    doc.text(sanitizePdfText(`Remise commerciale accordée : -${fmtPdfEur(totalRemise)}`), marginL, y + 4);
  }

  const totBoxX = marginL + contentW - 78;
  doc.setFillColor(...C.cream);
  doc.rect(totBoxX, y, 78, 16, 'F');
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.ink);
  doc.text('Total HT', totBoxX + 4, y + 6);
  doc.text(fmtPdfEur(totalHTReel), totBoxX + 74, y + 6, { align: 'right' });
  doc.text('TVA', totBoxX + 4, y + 12);
  doc.text(fmtPdfEur(totalTVAReel), totBoxX + 74, y + 12, { align: 'right' });
  y += 16;

  // Total TTC — bandeau vert limité à la colonne des totaux
  doc.setFillColor(...C.green);
  doc.rect(totBoxX, y, 78, 11, 'F');
  doc.setFont(FONT.body, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...C.cream);
  doc.text('Total TTC', totBoxX + 4, y + 7.2);
  doc.text(fmtPdfEur(ttcReel), totBoxX + 74, y + 7.2, { align: 'right' });
  y += 20;

  // ───── Règlement ─────
  y = ensureSpace(doc, y, 30, ctx);
  doc.setFont(FONT.body, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...C.green);
  doc.text('Règlement', marginL, y);
  y += 6;
  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...C.ink);
  if (iban) { doc.text(`IBAN : ${iban}`, marginL, y); y += 5; }
  if (bic) { doc.text(`BIC : ${bic}`, marginL, y); y += 5; }
  doc.text('Paiement par virement bancaire sous 30 jours.', marginL, y);
  y += 10;

  // ───── Mentions légales ─────
  const legalLine = [raisonSociale, formeJuridique, capital, siret && `SIRET ${siret}`, rcs && `RCS ${rcs}`, tvaIntra && `TVA Intra ${tvaIntra}`].filter(Boolean).join(' — ');
  const mentions = [
    legalLine,
    carteT,
    rcp,
    site,
    "En cas de retard de paiement : pénalité de 3× le taux d'intérêt légal + indemnité forfaitaire de 40 € (art. L441-10 C. com.).",
    "Pas d'escompte pour paiement anticipé. TVA acquittée d'après les débits.",
  ].filter(Boolean) as string[];

  doc.setFont(FONT.body, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  const wrapped: string[] = [];
  mentions.forEach((m) => {
    (doc.splitTextToSize(sanitizePdfText(m), contentW) as string[]).forEach((l) => wrapped.push(l));
  });
  const mentionsH = wrapped.length * 4;
  if (y + mentionsH > footerY - 8) {
    y = ensureSpace(doc, y, mentionsH + 6, ctx);
  } else {
    y = Math.max(y, footerY - 8 - mentionsH);
  }
  wrapped.forEach((l) => { doc.text(l, marginL, y); y += 4; });

  // ───── Pieds de page ─────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages, `HUNTERS · Facture ${numero}`);
  }

  const filename = `${facture.numero_facture || facture.reference || 'facture'}.pdf`;
  if (opts?.mode === 'base64') return pdfToBase64(doc as any);
  doc.save(filename);
}

/** Envoi réel de la facture au client (PDF joint + statut persisté). */
export function useEnvoyerFacture() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      facture,
      settings,
      email,
    }: { facture: Facture; settings?: Partial<CompanySettings> | null; email: string }) => {
      const to = assertEmail(email);
      const tracking = { table: 'factures', id: facture.id };
      const numero = facture.numero_facture || facture.reference || 'facture';

      const base64 = (await generateFacturePDF(facture, settings, { mode: 'base64' })) as string;
      await markEnvoiEnCours(tracking, to);
      qc.invalidateQueries({ queryKey: ['factures'] });

      const montant = fmtPdfEur(facture.montant_ttc || facture.montant);
      const echeance = facture.date_echeance
        ? new Date(facture.date_echeance).toLocaleDateString('fr-FR')
        : null;

      await sendDocumentEmail({
        to,
        tracking,
        subject: `Votre facture ${numero} — HUNTERS Immobilier`,
        eyebrow: 'Facturation',
        title: `Facture ${numero}`,
        numeroDossier: facture.dossier_numero || null,
        pdf: { filename: safePdfFilename(numero), base64 },
        bodyHtml: `
          <p>Bonjour,</p>
          <p>Vous trouverez ci-joint votre facture <strong>${numero}</strong>
          d'un montant de <strong>${montant} TTC</strong>${echeance ? `, à régler avant le <strong>${echeance}</strong>` : ''}.</p>
          <p>Nous restons à votre disposition pour toute question.</p>
          <p>Bien à vous,<br/>L'équipe HUNTERS Immobilier</p>`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.success('Facture envoyée au client');
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ['factures'] });
      toast.error(e?.message || "Échec de l'envoi de la facture");
    },
  });
}


