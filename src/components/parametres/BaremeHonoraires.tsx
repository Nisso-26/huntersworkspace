import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User, Lock, MapPin, Shield, Bell, Building2, Receipt, Network, FileText,
  History, Plus, Trash2, Save, AlertTriangle, UserPlus,
} from 'lucide-react';
import {
  useCompanySettings, useUpdateCompanySettings,
  useHonorairesTranches, useSaveHonorairesTranches,
  useAuditLog, type CompanySettings, type HonorairesTranche,
} from '@/hooks/use-company-settings';
import { useAlertSettings, type AlertSettings } from '@/hooks/use-alert-settings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function BaremeHonoraires() {
  const { data: tranches = [] } = useHonorairesTranches();
  const saveMut = useSaveHonorairesTranches();
  const [rows, setRows] = useState<Omit<HonorairesTranche, 'id'>[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (tranches.length) setRows(tranches.map(({ id, ...t }) => t));
  }, [tranches]);

  const updateRow = (i: number, k: string, v: any) => {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, [k]: v } : r));
  };

  const addRow = () => setRows(prev => [...prev, { prix_min: 0, prix_max: null, taux: 3, montant_minimum: 0, ordre: prev.length + 1 }]);
  const removeRow = (i: number) => { if (rows.length > 1) setRows(prev => prev.filter((_, j) => j !== i)); };

  const handleSave = () => setConfirmOpen(true);
  const confirmSave = () => {
    saveMut.mutate(rows);
    setConfirmOpen(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold">Barème Honoraires Clients</h2>
        </div>
        <Button size="sm" variant="outline" onClick={addRow}><Plus className="w-4 h-4 mr-1" />Tranche</Button>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground uppercase">
          <span>Prix min (€)</span><span>Prix max (€)</span><span>Taux (%)</span><span>Min. garanti (€)</span><span></span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-5 gap-2 items-center">
            <Input type="number" value={row.prix_min} onChange={e => updateRow(i, 'prix_min', Number(e.target.value))} />
            <Input type="number" value={row.prix_max ?? ''} onChange={e => updateRow(i, 'prix_max', e.target.value ? Number(e.target.value) : null)} placeholder="∞" />
            <Input type="number" step="0.1" value={row.taux} onChange={e => updateRow(i, 'taux', Number(e.target.value))} />
            <Input type="number" value={row.montant_minimum} onChange={e => updateRow(i, 'montant_minimum', Number(e.target.value))} />
            <Button size="icon" variant="ghost" onClick={() => removeRow(i)} disabled={rows.length <= 1}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-2" />Enregistrer le barème</Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le barème</AlertDialogTitle>
            <AlertDialogDescription>Le barème mis à jour sera appliqué aux nouveaux calculs d'honoraires.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

