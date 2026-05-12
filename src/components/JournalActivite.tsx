import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Home, Mail, FileSignature, StickyNote, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

type ActiviteType = 'appel' | 'visite' | 'email' | 'offre' | 'note';

interface Activite {
  id: string;
  dossier_id: string;
  auteur_id: string;
  type: ActiviteType;
  commentaire: string;
  created_at: string;
  auteur_name?: string;
}

const TYPES: { value: ActiviteType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'appel', label: 'Appel', icon: Phone },
  { value: 'visite', label: 'Visite', icon: Home },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'offre', label: 'Offre', icon: FileSignature },
  { value: 'note', label: 'Note', icon: StickyNote },
];

const HUNTERS_GREEN = '#1A4D2E';
const HUNTERS_GOLD = '#F5A800';

export default function JournalActivite({ dossierId }: { dossierId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<ActiviteType>('note');
  const [commentaire, setCommentaire] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activites')
      .select('*')
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      toast.error('Impossible de charger le journal');
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Activite[];
    const ids = Array.from(new Set(list.map(a => a.auteur_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name as string]));
      list.forEach(a => { a.auteur_name = map.get(a.auteur_id) || 'Utilisateur'; });
    }
    setItems(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dossierId]);

  const handleAdd = async () => {
    if (!commentaire.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from('activites').insert({
      dossier_id: dossierId,
      auteur_id: user.id,
      type,
      commentaire: commentaire.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCommentaire('');
    setType('note');
    toast.success('Activité ajoutée');
    load();
  };

  return (
    <div className="bg-card border rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: HUNTERS_GREEN }}>
        <span className="inline-block w-1 h-5 rounded-sm" style={{ background: HUNTERS_GOLD }} />
        Journal d'activité
      </h3>

      {/* Formulaire d'ajout rapide */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 items-start">
        <Select value={type} onValueChange={(v) => setType(v as ActiviteType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2"><t.icon className="w-4 h-4" /> {t.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          rows={2}
          placeholder="Décrire l'activité…"
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
        />
        <Button
          onClick={handleAdd}
          disabled={saving || !commentaire.trim()}
          style={{ background: HUNTERS_GREEN, color: '#fff' }}
          className="hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucune activité enregistrée pour le moment.</p>
      ) : (
        <ol className="relative border-l-2 pl-6 space-y-5" style={{ borderColor: `${HUNTERS_GREEN}33` }}>
          {items.map(a => {
            const def = TYPES.find(t => t.value === a.type) ?? TYPES[4];
            const Icon = def.icon;
            return (
              <li key={a.id} className="relative">
                <span
                  className="absolute -left-[34px] flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-card"
                  style={{ background: HUNTERS_GREEN, color: '#fff' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold" style={{ color: HUNTERS_GREEN }}>{def.label}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-foreground">{a.auteur_name}</span>
                  <span className="text-muted-foreground text-xs">
                    · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{a.commentaire}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
