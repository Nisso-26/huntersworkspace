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

export default function JournalAudit() {
  const { data: logs = [] } = useAuditLog();
  const sectionLabels: Record<string, string> = {
    identite_societe: 'Identité', honoraires: 'Honoraires', modele_economique: 'Éco. réseau',
    modeles_documents: 'Documents', notifications: 'Notifications',
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-accent" />
        <h2 className="font-heading font-semibold">Journal des modifications</h2>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune modification enregistrée</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0 text-sm">
              <Badge variant="secondary" className="text-[10px] shrink-0">{sectionLabels[log.section] || log.section}</Badge>
              <div className="min-w-0">
                <p className="font-medium">{log.user_name || 'Inconnu'} — {log.action}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

