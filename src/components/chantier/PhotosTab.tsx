import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PHASES = ['avant', 'pendant', 'apres'] as const;
const PHASE_LABELS: Record<string, string> = { avant: 'Avant', pendant: 'Pendant', apres: 'Après' };
const PHASE_COLORS: Record<string, string> = {
  avant: 'bg-hunters-info/10 text-hunters-info border-hunters-info/30',
  pendant: 'bg-hunters-warning/10 text-hunters-warning border-hunters-warning/30',
  apres: 'bg-hunters-success/10 text-hunters-success border-hunters-success/30',
};

const PIECES = ['Salon', 'Chambre 1', 'Chambre 2', 'Chambre 3', 'Cuisine', 'Salle de bain', 'WC', 'Entrée', 'Bureau', 'Extérieur'];

interface Photo {
  id: string;
  chantier_id: string;
  file_name: string;
  file_path: string;
  tag: string | null;
  piece: string | null;
  legende: string | null;
  created_at: string;
}

interface Props {
  chantierId: string;
  photos: Photo[];
}

export default function PhotosTab({ chantierId, photos }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadTag, setUploadTag] = useState('pendant');
  const [uploadPiece, setUploadPiece] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterPiece, setFilterPiece] = useState<string>('all');

  const uploadPhotos = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} dépasse 10 MB`); continue; }
        const path = `${chantierId}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('chantier-photos').upload(path, file);
        if (error) { toast.error(error.message); continue; }
        await supabase.from('photos_chantier').insert({
          chantier_id: chantierId,
          file_name: file.name,
          file_path: path,
          tag: uploadTag,
          piece: uploadPiece || null,
          uploaded_by: user?.id,
        } as any);
      }
      qc.invalidateQueries({ queryKey: ['chantiers'] });
      toast.success('Photos ajoutées');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
    await supabase.storage.from('chantier-photos').remove([photo.file_path]);
    await supabase.from('photos_chantier').delete().eq('id', photo.id);
    qc.invalidateQueries({ queryKey: ['chantiers'] });
    toast.success('Photo supprimée');
  };

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getUrl = (path: string) => signedUrls[path] || '';

  // Generate signed URLs for all photos
  useEffect(() => {
    const paths = photos.map(p => p.file_path);
    if (paths.length > 0) {
      supabase.storage.from('chantier-photos').createSignedUrls(paths, 3600).then(({ data }) => {
        if (data) {
          const urls: Record<string, string> = {};
          data.forEach((item) => {
            if (item.signedUrl) urls[item.path || ''] = item.signedUrl;
          });
          setSignedUrls(urls);
        }
      });
    }
  }, [photos]);

  const filtered = photos.filter(p => {
    if (filterPhase !== 'all' && p.tag !== filterPhase) return false;
    if (filterPiece !== 'all' && p.piece !== filterPiece) return false;
    return true;
  });

  // Group by piece
  const grouped = filtered.reduce((acc, p) => {
    const piece = p.piece || 'Non assigné';
    if (!acc[piece]) acc[piece] = [];
    acc[piece].push(p);
    return acc;
  }, {} as Record<string, Photo[]>);

  return (
    <div className="space-y-4">
      {/* Filters & Upload */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterPhase} onValueChange={setFilterPhase}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPiece} onValueChange={setFilterPiece}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Pièce" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes pièces</SelectItem>
            {PIECES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Select value={uploadTag} onValueChange={setUploadTag}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PHASES.map(p => <SelectItem key={p} value={p}>{PHASE_LABELS[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={uploadPiece} onValueChange={setUploadPiece}>
          <SelectTrigger className="w-28"><SelectValue placeholder="Pièce" /></SelectTrigger>
          <SelectContent>
            {PIECES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && uploadPhotos(e.target.files)} disabled={uploading} />
          <Button variant="outline" size="sm" asChild disabled={uploading}>
            <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Upload...' : 'Ajouter'}</span>
          </Button>
        </label>
      </div>

      {/* Photos grid */}
      {Object.entries(grouped).map(([piece, items]) => (
        <div key={piece}>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{piece}</h4>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {items.map(p => (
              <div key={p.id} className="relative group">
                <img src={getUrl(p.file_path)} alt={p.legende || p.file_name} className="w-full h-24 object-cover rounded-md" />
                <span className={cn('absolute top-1 left-1 text-[9px] px-1 rounded border', PHASE_COLORS[p.tag || 'pendant'])}>
                  {PHASE_LABELS[p.tag || 'pendant']}
                </span>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deletePhoto(p)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
                {p.legende && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{p.legende}</p>}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Aucune photo</p>
        </div>
      )}
    </div>
  );
}
