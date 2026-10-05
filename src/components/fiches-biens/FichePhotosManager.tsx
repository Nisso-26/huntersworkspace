import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { GripVertical, ImagePlus, Star, Trash2, Camera } from 'lucide-react';
import { FICHES_BIENS_BUCKET, useFichePhotos, type FichePhoto, type RolePhoto } from '@/hooks/use-fiches-biens';

const P = () => supabase.from('fiches_biens_photos' as any) as any;

const ROLE_LABELS: Record<RolePhoto, string> = {
  couverture: 'Couverture', galerie: 'Galerie', avant: 'Avant', apres: 'Après',
};
const ORIGINE_LABELS = { visite: 'Visite', annonce: 'Annonce', televersement: 'Téléversée' } as const;

export default function FichePhotosManager({ ficheId, dossierId }: { ficheId: string; dossierId: string }) {
  const qc = useQueryClient();
  const { data: photos = [] } = useFichePhotos(ficheId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['fiche-photos', ficheId] });
    qc.invalidateQueries({ queryKey: ['fiches-biens', dossierId] });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let ordre = photos.length;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${ficheId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(FICHES_BIENS_BUCKET).upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); continue; }
      await P().insert({ fiche_id: ficheId, storage_path: path, ordre: ordre++, origine: 'televersement', role: photos.length === 0 && ordre === 1 ? 'couverture' : 'galerie' });
    }
    setBusy(false);
    refresh();
  };

  const importerVisites = async () => {
    setBusy(true);
    try {
      const { data: biens } = await supabase.from('biens').select('id').eq('dossier_id', dossierId);
      const bienIds = (biens || []).map(b => b.id);
      if (!bienIds.length) { toast.info('Aucune photo de visite pour ce dossier'); return; }
      const { data: chantiers } = await supabase.from('chantiers').select('id').in('bien_id', bienIds);
      const chIds = (chantiers || []).map(c => c.id);
      if (!chIds.length) { toast.info('Aucune photo de visite pour ce dossier'); return; }
      const { data: visites } = await supabase.from('visites_chantier').select('id').in('chantier_id', chIds);
      const vIds = (visites || []).map(v => v.id);
      if (!vIds.length) { toast.info('Aucune photo de visite pour ce dossier'); return; }
      const { data: src } = await supabase.from('photos_visite').select('file_path, legende').in('visite_id', vIds);
      let ordre = photos.length, n = 0;
      for (const p of src || []) {
        const { data: blob } = await supabase.storage.from('visites-photos').download(p.file_path);
        if (!blob) continue;
        const ext = p.file_path.split('.').pop() || 'jpg';
        const path = `${ficheId}/visite-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(FICHES_BIENS_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg' });
        if (error) continue;
        await P().insert({ fiche_id: ficheId, storage_path: path, ordre: ordre++, origine: 'visite', legende: p.legende, role: 'galerie' });
        n++;
      }
      toast.success(`${n} photo(s) de visite importée(s)`);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const update = async (id: string, patch: Partial<FichePhoto>) => {
    const { error } = await P().update(patch).eq('id', id);
    if (error) toast.error(error.message);
    refresh();
  };

  const setCouverture = async (id: string) => {
    const prev = photos.filter(p => p.role === 'couverture' && p.id !== id);
    for (const p of prev) await P().update({ role: 'galerie' }).eq('id', p.id);
    await update(id, { role: 'couverture' });
  };

  const remove = async (p: FichePhoto) => {
    await supabase.storage.from(FICHES_BIENS_BUCKET).remove([p.storage_path]);
    await P().delete().eq('id', p.id);
    refresh();
  };

  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const list = [...photos];
    const from = list.findIndex(p => p.id === dragId);
    const to = list.findIndex(p => p.id === targetId);
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    qc.setQueryData(['fiche-photos', ficheId], list.map((p, i) => ({ ...p, ordre: i })));
    setDragId(null);
    await Promise.all(list.map((p, i) => P().update({ ordre: i }).eq('id', p.id)));
    refresh();
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        5 à 7 photos recommandées pour la galerie. Préférez vos photos de visite : les photos d'annonce portent souvent un filigrane.
      </p>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />Téléverser des photos
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={busy} onClick={importerVisites}>
          <Camera className="h-4 w-4" />Importer les photos de visite
        </Button>
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map(p => (
            <div
              key={p.id}
              draggable
              onDragStart={() => setDragId(p.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(p.id)}
              className={`border bg-card ${p.role === 'couverture' ? 'border-primary' : 'border-border'} ${dragId === p.id ? 'opacity-50' : ''}`}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {p.url && <img src={p.url} alt={p.legende || 'Photo du bien'} className="h-full w-full object-cover" />}
                <span className="absolute left-1 top-1 cursor-grab bg-background/80 p-1"><GripVertical className="h-4 w-4" /></span>
                <span className="absolute right-1 top-1 bg-background/80 px-1.5 py-0.5 text-[10px]">{ORIGINE_LABELS[p.origine]}</span>
              </div>
              <div className="space-y-2 p-2">
                <Input className="h-8 text-xs" placeholder="Légende" defaultValue={p.legende || ''}
                  onBlur={e => e.target.value !== (p.legende || '') && update(p.id, { legende: e.target.value || null })} />
                <div className="flex items-center gap-1">
                  <Select value={p.role} onValueChange={v => v === 'couverture' ? setCouverture(p.id) : update(p.id, { role: v as RolePhoto })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_LABELS) as RolePhoto[]).map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Photo de couverture" onClick={() => setCouverture(p.id)}>
                    <Star className={`h-4 w-4 ${p.role === 'couverture' ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Supprimer" onClick={() => remove(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
