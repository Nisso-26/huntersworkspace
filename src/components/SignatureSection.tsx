import { useState } from 'react';
import { useSignatureRequests, useCreateSignatureRequest, useUpdateSignatureStatus, DOC_TYPES, STATUS_LABELS } from '@/hooks/use-signature';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PenTool, Plus, Loader2, Send, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  dossierId: string;
  clientName: string;
  clientEmail: string;
}

const statusIcons: Record<string, any> = {
  brouillon: Clock,
  envoye: Send,
  en_attente: Clock,
  signe: CheckCircle2,
  refuse: XCircle,
  expire: XCircle,
};

const statusColors: Record<string, string> = {
  brouillon: 'bg-muted text-muted-foreground',
  envoye: 'bg-accent/10 text-accent-foreground',
  en_attente: 'bg-accent/20 text-accent-foreground',
  signe: 'bg-hunters-success/10 text-hunters-success',
  refuse: 'bg-destructive/10 text-destructive',
  expire: 'bg-muted text-muted-foreground',
};

export default function SignatureSection({ dossierId, clientName, clientEmail }: Props) {
  const { user } = useAuth();
  const { data: requests = [] } = useSignatureRequests(dossierId);
  const createMut = useCreateSignatureRequest();
  const updateMut = useUpdateSignatureStatus();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    document_type: 'mandat_recherche',
    document_name: '',
    signer_name: clientName,
    signer_email: clientEmail,
  });

  const handleCreate = () => {
    if (!form.document_name || !form.signer_email || !user) {
      toast.error('Remplissez tous les champs');
      return;
    }
    createMut.mutate({
      dossier_id: dossierId,
      document_type: form.document_type,
      document_name: form.document_name,
      signer_name: form.signer_name,
      signer_email: form.signer_email,
      created_by: user.id,
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  const handleSimulateSend = (id: string) => {
    updateMut.mutate({ id, status: 'envoye', dossierId });
    toast.info('Simulation : envoi Yousign (clé API non configurée)');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <PenTool className="w-4 h-4 text-accent" />
          Signatures électroniques
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nouvelle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Demande de signature</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Type de document</Label>
                <Select value={form.document_type} onValueChange={v => setForm(f => ({ ...f, document_type: v }))}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Nom du document</Label>
                <Input value={form.document_name} onChange={e => setForm(f => ({ ...f, document_name: e.target.value }))} className="h-8 text-sm" placeholder="Ex: Mandat M. Dupont" />
              </div>
              <div>
                <Label className="text-xs">Nom du signataire</Label>
                <Input value={form.signer_name} onChange={e => setForm(f => ({ ...f, signer_name: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Email du signataire</Label>
                <Input type="email" value={form.signer_email} onChange={e => setForm(f => ({ ...f, signer_email: e.target.value }))} className="h-8 text-sm" />
              </div>
              <Button onClick={handleCreate} disabled={createMut.isPending} className="w-full gap-2">
                {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                Créer la demande
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Mode simulation — L'envoi réel nécessite une clé API Yousign
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {requests.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Aucune demande de signature</p>
      ) : (
        <div className="space-y-1.5">
          {requests.map(r => {
            const Icon = statusIcons[r.status] || Clock;
            return (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/50 group">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{r.document_name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.signer_name} — {r.signer_email}</p>
                </div>
                <Badge className={`text-[10px] ${statusColors[r.status] || ''}`}>
                  {STATUS_LABELS[r.status] || r.status}
                </Badge>
                {r.status === 'brouillon' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs opacity-0 group-hover:opacity-100"
                    onClick={() => handleSimulateSend(r.id)}
                  >
                    <Send className="w-3 h-3 mr-1" /> Envoyer
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
