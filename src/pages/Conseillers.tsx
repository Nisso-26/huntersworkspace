import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, UserPlus, ShieldOff, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name?: string;
  last_name?: string;
  role: 'super_admin' | 'mandataire' | 'decoratrice' | null;
  created_at: string;
}

const roleLabels: Record<string, string> = {
  super_admin: 'Directeur',
  mandataire: 'Conseiller',
  decoratrice: 'Décoratrice',
};
const roleBadge: Record<string, string> = {
  super_admin: 'bg-[#F5A800]/15 text-[#F5A800] border border-[#F5A800]/30',
  mandataire: 'bg-[#1A4D2E]/10 text-[#1A4D2E] border border-[#1A4D2E]/20',
  decoratrice: 'bg-muted text-muted-foreground border',
};

function splitName(full: string | null | undefined): { first: string; last: string } {
  if (!full) return { first: '', last: '' };
  const parts = full.trim().split(/\s+/);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

export default function Conseillers() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '' });
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
    ]);
    if (pErr || rErr) {
      toast.error('Erreur de chargement', { description: (pErr || rErr)?.message });
      setLoading(false);
      return;
    }
    const byUser = new Map((roles || []).map((r: any) => [r.user_id, r.role]));
    const merged: UserRow[] = (profiles || []).map((p: any) => {
      const { first, last } = splitName(p.full_name);
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        first_name: first,
        last_name: last,
        role: (byUser.get(p.id) as UserRow['role']) ?? null,
        created_at: p.created_at,
      };
    });
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('Tous les champs sont requis');
      return;
    }
    setSubmitting(true);
    setInviteLink(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          mode: 'invite',
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          full_name: `${form.first_name.trim()} ${form.last_name.trim()}`,
          role: 'mandataire',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const link = (data as any)?.invitation_link as string | null;
      setInviteLink(link);
      toast.success('Invitation envoyée avec succès', { description: link ? 'Lien d\'activation prêt à copier.' : 'L\'utilisateur recevra un email.' });
      setForm({ first_name: '', last_name: '', email: '' });
      load();
    } catch (err: any) {
      toast.error('Échec de l\'invitation', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Lien copié');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (row: UserRow) => {
    if (row.role === 'super_admin') return;
    if (row.id === me?.id) return;
    if (!confirm(`Révoquer l'accès de ${row.full_name || row.email} ?`)) return;
    const { error } = await supabase.from('user_roles').delete().eq('user_id', row.id);
    if (error) {
      toast.error('Erreur', { description: error.message });
      return;
    }
    toast.success('Accès client révoqué avec succès');
    load();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Conseillers</h1>
            <p className="text-muted-foreground mt-1">
              Gestion des accès — {rows.length} utilisateur{rows.length > 1 ? 's' : ''}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setInviteLink(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 text-white">
                <UserPlus className="w-4 h-4 mr-2" />
                Inviter un conseiller
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nouvelle invitation</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input id="first_name" value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} disabled={submitting} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input id="last_name" value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} disabled={submitting} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} disabled={submitting} />
                </div>

                {inviteLink && (
                  <div className="rounded-lg border-2 border-[#F5A800]/40 bg-[#F5A800]/5 p-3 space-y-2">
                    <p className="text-xs font-semibold text-[#1A4D2E] flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Lien d'activation
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 truncate">{inviteLink}</code>
                      <Button type="button" size="sm" variant="outline" onClick={copyLink} className="shrink-0">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Transmettez ce lien au conseiller pour activer son compte.</p>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Fermer</Button>
                  <Button type="submit" disabled={submitting} className="bg-[#1A4D2E] hover:bg-[#1A4D2E]/90 text-white">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Inviter
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="px-4 py-3">Prénom</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Créé le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full max-w-[140px]" /></td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur</td></tr>
                ) : rows.map((u, idx) => {
                  const isDirector = u.role === 'super_admin';
                  const isSelf = u.id === me?.id;
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{u.first_name || '—'}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{u.last_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', roleBadge[u.role || ''] || 'bg-muted text-muted-foreground')}>
                          {u.role ? roleLabels[u.role] : 'Aucun'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right">
                        {!isDirector && !isSelf && u.role && (
                          <Button variant="outline" size="sm" onClick={() => handleRevoke(u)} className="text-destructive hover:bg-destructive/10 border-destructive/30">
                            <ShieldOff className="w-3.5 h-3.5 mr-1.5" />
                            Révoquer
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
