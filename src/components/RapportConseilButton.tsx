import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dossier } from '@/hooks/use-dossiers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Loader2, Download } from 'lucide-react';

interface Props {
  dossier: Dossier;
}

export default function RapportConseilButton({ dossier }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rapport, setRapport] = useState<string>('');

  const conseiller =
    (user?.user_metadata as any)?.full_name || user?.email || 'Hunters Immobilier';

  const generate = async () => {
    setLoading(true);
    setRapport('');
    setOpen(true);
    try {
      const res = await supabase.functions.invoke('generate-rapport-conseil', {
        body: {
          client_name: dossier.client_name,
          email: dossier.email,
          ville: dossier.ville,
          budget: dossier.budget,
          honoraires: dossier.honoraires,
          status: dossier.status,
          notes: dossier.notes,
          strategie: dossier.strategie,
          conseiller,
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data?.ok) throw new Error(res.data?.error || 'Erreur de génération');
      setRapport(res.data.rapport);
      toast.success('Rapport de conseil généré');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la génération');
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!rapport) return;
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const M = 18;
    const CW = W - M * 2;
    const GREEN: [number, number, number] = [26, 77, 46];
    const GOLD: [number, number, number] = [245, 168, 0];
    const TEXT: [number, number, number] = [17, 17, 17];

    // Couverture
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 60, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 58, W, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text("RAPPORT DE CONSEIL", M, 24);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text("INVESTISSEMENT IMMOBILIER", M, 32);
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text("HUNTERS IMMOBILIER · TOURS", M, 44);
    doc.setTextColor(255, 255, 255);
    doc.text(`Préparé pour : ${dossier.client_name}`, M, 50);
    doc.text(
      `Conseiller : ${conseiller}  ·  ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      M,
      56,
    );

    let y = 72;
    const lines = rapport.split('\n');

    const ensure = (h: number) => {
      if (y + h > 275) {
        doc.addPage();
        y = M;
      }
    };

    for (const raw of lines) {
      const line = raw.replace(/\*\*/g, '').replace(/^#+\s*/, '');
      if (!line.trim()) {
        y += 3;
        continue;
      }
      const isSection = /^\d{1,2}\.\s+[A-ZÀ-Ü]/.test(line.trim());
      if (isSection) {
        ensure(14);
        y += 4;
        doc.setFillColor(...GREEN);
        doc.rect(M, y, CW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(line.trim(), M + 3, y + 5.5);
        y += 12;
        continue;
      }
      const isBullet = /^[-•*]\s+/.test(line.trim());
      const text = isBullet ? '• ' + line.trim().replace(/^[-•*]\s+/, '') : line.trim();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...TEXT);
      const wrapped = doc.splitTextToSize(text, CW - (isBullet ? 4 : 0));
      ensure(wrapped.length * 5);
      doc.text(wrapped, M + (isBullet ? 4 : 0), y);
      y += wrapped.length * 5 + 1;
    }

    // Pied de page
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFillColor(...GREEN);
      doc.rect(0, 285, W, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...GOLD);
      doc.text('HUNTERS IMMOBILIER', M, 292);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.text('Cabinet de conseil en investissement immobilier · Tours', W / 2, 292, { align: 'center' });
      doc.text(`Page ${i} / ${total}`, W - M, 292, { align: 'right' });
    }

    doc.save(`Rapport_Conseil_${dossier.client_name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`);
  };

  return (
    <>
      <Button
        size="sm"
        onClick={generate}
        disabled={loading}
        className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {loading ? 'Génération...' : 'Générer le rapport de conseil'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Rapport de conseil — {dossier.client_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            {loading && !rapport ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Rédaction du rapport en cours…
              </div>
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {rapport}
              </pre>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button
              onClick={downloadPdf}
              disabled={!rapport}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Download className="w-4 h-4" />
              Télécharger en PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
