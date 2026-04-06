import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export interface Facture {
  id: string;
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
  mandataire_name?: string;
  mandataire_zone?: string;
}

export function useFactures() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['factures'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factures')
        .select('*')
        .order('date_emission', { ascending: false });

      if (error) throw error;

      // Fetch mandataire names
      const mandataireIds = [...new Set((data || []).map((f: any) => f.mandataire_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (mandataireIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, zone')
          .in('id', mandataireIds);
        (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
      }

      return (data || []).map((f: any) => ({
        ...f,
        montant: Number(f.montant) || 0,
        tva_taux: Number(f.tva_taux) || 20,
        montant_ttc: Number(f.montant_ttc) || 0,
        mandataire_name: profilesMap[f.mandataire_id]?.full_name || 'N/A',
        mandataire_zone: profilesMap[f.mandataire_id]?.zone || '',
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

export function generateFacturePDF(facture: Facture) {
  const doc = new jsPDF();
  const green = [26, 77, 46] as [number, number, number];
  const gold = [245, 168, 0] as [number, number, number];
  const montantHT = facture.montant;
  const tvaTaux = facture.tva_taux || 20;
  const tvaAmount = montantHT * (tvaTaux / 100);
  const ttc = facture.montant_ttc || montantHT + tvaAmount;

  // Header band
  doc.setFillColor(...green);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('HUNTERS IMMOBILIER', 15, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SASU au capital de 1 000 € — SIREN 123 456 789', 15, 30);

  // Gold accent line
  doc.setFillColor(...gold);
  doc.rect(0, 40, 210, 3, 'F');

  // Facture info
  doc.setTextColor(26, 77, 46);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 15, 58);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Référence : ${facture.reference || '—'}`, 15, 67);
  doc.text(`Date d'émission : ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, 15, 74);
  doc.text(`Date d'échéance : ${facture.date_echeance ? new Date(facture.date_echeance).toLocaleDateString('fr-FR') : 'J+30'}`, 15, 81);

  // Client info
  doc.setTextColor(26, 77, 46);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client', 130, 58);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(facture.dossier_client_name || facture.client_name || '—', 130, 67);
  doc.text(`Mandataire : ${facture.mandataire_name || '—'}`, 130, 74);

  // Table header
  const tableTop = 100;
  doc.setFillColor(240, 240, 240);
  doc.rect(15, tableTop - 6, 180, 10, 'F');
  doc.setTextColor(26, 77, 46);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Désignation', 18, tableTop);
  doc.text('Qté', 110, tableTop);
  doc.text('P.U. HT', 130, tableTop);
  doc.text('Montant HT', 160, tableTop);

  // Table row
  const typeLabels: Record<string, string> = {
    honoraires: 'Honoraires de chasse immobilière',
    abonnement: 'Pack mandataire mensuel',
    commission: 'Commission mandataire',
    avoir: 'Avoir / Remboursement',
  };
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(typeLabels[facture.type] || facture.type, 18, tableTop + 12);
  doc.text('1', 110, tableTop + 12);
  doc.text(`${montantHT.toLocaleString('fr-FR')} €`, 130, tableTop + 12);
  doc.text(`${montantHT.toLocaleString('fr-FR')} €`, 160, tableTop + 12);

  // Totals
  const totalsTop = tableTop + 30;
  doc.setDrawColor(200, 200, 200);
  doc.line(120, totalsTop, 195, totalsTop);
  doc.setTextColor(80, 80, 80);
  doc.text('Total HT :', 125, totalsTop + 8);
  doc.text(`${montantHT.toLocaleString('fr-FR')} €`, 165, totalsTop + 8);
  doc.text(`TVA (${tvaTaux}%) :`, 125, totalsTop + 16);
  doc.text(`${tvaAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 165, totalsTop + 16);
  doc.setFillColor(...green);
  doc.rect(120, totalsTop + 20, 75, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Total TTC :', 125, totalsTop + 27);
  doc.text(`${ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`, 165, totalsTop + 27);

  // Footer
  doc.setFillColor(240, 240, 240);
  doc.rect(0, 260, 210, 37, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SASU Hunters Immobilier — SIREN 123 456 789 — TVA FR12 123456789', 105, 268, { align: 'center' });
  doc.text('RIB : FR76 XXXX XXXX XXXX XXXX XXXX XXX — BIC : XXXXXXXX', 105, 274, { align: 'center' });
  doc.text('En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée.', 105, 280, { align: 'center' });
  doc.text('Indemnité forfaitaire de recouvrement : 40 €. Pas d\'escompte pour paiement anticipé.', 105, 286, { align: 'center' });

  doc.save(`${facture.reference || 'facture'}.pdf`);
}
