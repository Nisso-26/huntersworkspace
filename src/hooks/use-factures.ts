import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { fetchAllPaginated } from '@/lib/supabase-pagination';
import type { CompanySettings } from './use-company-settings';
import { fmtPdfEur } from '@/lib/pdf-utils';

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
      let dossierMap: Record<string, string | null> = {};
      if (dossierIds.length > 0) {
        const { data: dossiers } = await (supabase.from('dossiers') as any)
          .select('id, numero_dossier')
          .in('id', dossierIds);
        (dossiers || []).forEach((d: any) => { dossierMap[d.id] = d.numero_dossier; });
      }

      return (data || []).map((f: any) => ({
        ...f,
        montant: Number(f.montant) || 0,
        tva_taux: Number(f.tva_taux) || 20,
        montant_ttc: Number(f.montant_ttc) || 0,
        mandataire_name: profilesMap[f.mandataire_id]?.full_name || 'N/A',
        mandataire_zone: profilesMap[f.mandataire_id]?.zone || '',
        dossier_numero: f.dossier_id ? dossierMap[f.dossier_id] || null : null,
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

// Helper: hex (#RRGGBB) -> [r, g, b]
function hexToRgb(hex: string | null | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const typeLabels: Record<string, string> = {
  honoraires: 'Honoraires de chasse immobilière',
  abonnement: 'Pack mandataire mensuel',
  commission: 'Commission mandataire',
  avoir: 'Avoir / Remboursement',
};

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function generateFacturePDF(facture: Facture, settings?: Partial<CompanySettings> | null) {
  // Lazy-load jsPDF (≈ 350 kB) uniquement à la demande pour alléger le bundle initial
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const s = settings || {};

  const green = hexToRgb(s.couleur_primaire, [26, 77, 46]);
  const gold = hexToRgb(s.couleur_secondaire, [245, 168, 0]);

  // Charge le logo (s'il existe) sous forme dataURL pour jsPDF
  const logoData = s.logo_url ? await loadImageAsDataUrl(s.logo_url) : null;

  const raisonSociale = (s.raison_sociale || 'Votre société').toUpperCase();
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
  const tvaAmount = montantHT * (tvaTaux / 100);
  const ttc = facture.montant_ttc || montantHT + tvaAmount;

  // ───── Header band ─────
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);

  // Logo (si dispo) en haut à droite, sinon header texte sur toute la largeur
  if (logoData) {
    try {
      const fmt = logoData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoData, fmt, 170, 6, 28, 28, undefined, 'FAST');
    } catch { /* ignore image errors */ }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(raisonSociale, 15, 19);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const headerLine2 = [formeJuridique, capital].filter(Boolean).join(' ');
  if (headerLine2) doc.text(headerLine2, 15, 27);
  const headerLine3 = [siret && `SIRET ${siret}`, rcs && `RCS ${rcs}`, tvaIntra && `TVA ${tvaIntra}`].filter(Boolean).join(' — ');
  if (headerLine3) doc.text(headerLine3, 15, 33);

  // Gold accent
  doc.setFillColor(...gold);
  doc.rect(0, 40, 210, 3, 'F');

  // ───── Facture info (left) ─────
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 15, 58);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`N° facture : ${facture.numero_facture || facture.reference || '—'}`, 15, 67);
  doc.text(`Date d'émission : ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, 15, 73);
  doc.text(`Date d'échéance : ${facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : 'J+30'}`, 15, 79);
  if (facture.dossier_numero) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(green[0], green[1], green[2]);
    doc.text(`Réf. dossier : ${facture.dossier_numero}`, 15, 85);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
  }

  // ───── Émetteur (right) ─────
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Émetteur', 130, 58);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  let yE = 64;
  if (adresse) {
    adresse.split('\n').slice(0, 3).forEach((l) => { doc.text(l, 130, yE); yE += 5; });
  }
  if (tel) { doc.text(`Tél. ${tel}`, 130, yE); yE += 5; }
  if (email) { doc.text(email, 130, yE); yE += 5; }

  // ───── Client ─────
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Facturé à', 15, 95);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(facture.dossier_client_name || facture.client_name || '—', 15, 102);
  if (facture.mandataire_name) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Suivi par ${facture.mandataire_name}`, 15, 108);
  }

  // ───── Table (multi-lignes si fourni) ─────
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

  const tableTop = 122;
  doc.setFillColor(green[0], green[1], green[2]);
  doc.rect(15, tableTop - 6, 180, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Désignation', 18, tableTop);
  doc.text('Tarif HT', 105, tableTop, { align: 'right' });
  doc.text('Remise', 135, tableTop, { align: 'right' });
  doc.text('TVA', 158, tableTop, { align: 'right' });
  doc.text('Net HT', 192, tableTop, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  let yT = tableTop + 9;
  lignes.forEach((l, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(15, yT - 5, 180, 7, 'F');
    }
    const labelLines = doc.splitTextToSize(l.label, 80);
    doc.text(labelLines, 18, yT);
    doc.text(fmtPdfEur(l.tarif_base), 105, yT, { align: 'right' });
    doc.text(l.remise_pct > 0 ? `-${l.remise_pct}% (-${fmtPdfEur(l.remise_montant)})` : '—', 135, yT, { align: 'right' });
    doc.text(`${l.tva_taux}%`, 158, yT, { align: 'right' });
    doc.text(fmtPdfEur(l.montant_ht), 192, yT, { align: 'right' });
    yT += Math.max(7, labelLines.length * 5);
  });

  doc.setDrawColor(220, 220, 220);
  doc.line(15, yT + 1, 195, yT + 1);

  const totalHTReel = lignes.reduce((s, l) => s + l.montant_ht, 0);
  const totalTVAReel = lignes.reduce((s, l) => s + l.montant_ht * (l.tva_taux / 100), 0);
  const totalRemise = lignes.reduce((s, l) => s + l.remise_montant, 0);
  const ttcReel = totalHTReel + totalTVAReel;

  // ───── Totaux ─────
  const totalsTop = yT + 10;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(10);
  if (totalRemise > 0) {
    doc.setTextColor(green[0], green[1], green[2]);
    doc.setFont('helvetica', 'italic');
    doc.text(`Remise commerciale accordée : -${totalRemise.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 15, totalsTop);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
  }
  doc.text('Total HT', 130, totalsTop);
  doc.text(`${totalHTReel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 192, totalsTop, { align: 'right' });
  doc.text(`TVA`, 130, totalsTop + 7);
  doc.text(`${totalTVAReel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 192, totalsTop + 7, { align: 'right' });

  doc.setFillColor(green[0], green[1], green[2]);
  doc.rect(125, totalsTop + 11, 70, 11, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Total TTC', 130, totalsTop + 18);
  doc.text(`${ttcReel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 192, totalsTop + 18, { align: 'right' });

  // ───── Règlement ─────
  const payTop = totalsTop + 36;
  doc.setTextColor(green[0], green[1], green[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Règlement', 15, payTop);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  let yPay = payTop + 6;
  if (iban) { doc.text(`IBAN : ${iban}`, 15, yPay); yPay += 5; }
  if (bic) { doc.text(`BIC : ${bic}`, 15, yPay); yPay += 5; }
  doc.text('Paiement par virement bancaire sous 30 jours.', 15, yPay);

  // ───── Footer (mentions légales) ─────
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 255, 210, 42, 'F');
  doc.setFillColor(...gold);
  doc.rect(0, 255, 210, 1, 'F');

  doc.setTextColor(90, 90, 90);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  let yF = 261;
  const footerLines: string[] = [];
  const legalLine = [raisonSociale, formeJuridique, capital, siret && `SIRET ${siret}`, rcs && `RCS ${rcs}`, tvaIntra && `TVA Intra ${tvaIntra}`].filter(Boolean).join(' — ');
  if (legalLine) footerLines.push(legalLine);
  if (carteT) footerLines.push(carteT);
  if (rcp) footerLines.push(rcp);
  if (site) footerLines.push(site);
  footerLines.push("En cas de retard de paiement : pénalité de 3× le taux d'intérêt légal + indemnité forfaitaire de 40 € (art. L441-10 C. com.).");
  footerLines.push("Pas d'escompte pour paiement anticipé. TVA acquittée d'après les débits.");

  footerLines.forEach((l) => {
    doc.text(l, 105, yF, { align: 'center', maxWidth: 195 });
    yF += 4.5;
  });

  doc.save(`${facture.numero_facture || facture.reference || 'facture'}.pdf`);
}
