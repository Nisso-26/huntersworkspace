import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateVisite, useDeleteVisite, type VisiteChantier } from '@/hooks/use-chantiers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, Image as ImageIcon, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActionItem {
  action: string;
  responsable: string;
  deadline: string;
}

interface Props {
  chantierId: string;
  visites: VisiteChantier[];
}

export default function VisitesTab({ chantierId, visites }: Props) {
  const { user } = useAuth();
  const createVisite = useCreateVisite();
  const deleteVisite = useDeleteVisite();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedVisite, setExpandedVisite] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    date_visite: new Date().toISOString().slice(0, 16),
    personnes_presentes: '',
    observations: '',
    points_vigilance: '',
  });
  const [actions, setActions] = useState<ActionItem[]>([{ action: '', responsable: '', deadline: '' }]);

  const addAction = () => setActions(a => [...a, { action: '', responsable: '', deadline: '' }]);
  const updateAction = (i: number, field: keyof ActionItem, value: string) => {
    setActions(a => a.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };
  const removeAction = (i: number) => setActions(a => a.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!form.observations) { toast.error('Ajoutez au moins des observations'); return; }
    const validActions = actions.filter(a => a.action.trim());
    createVisite.mutate({
      chantier_id: chantierId,
      date_visite: form.date_visite,
      personnes_presentes: form.personnes_presentes,
      observations: form.observations,
      points_vigilance: form.points_vigilance,
      prochaines_actions: validActions,
      created_by: user?.id,
    } as any, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ date_visite: new Date().toISOString().slice(0, 16), personnes_presentes: '', observations: '', points_vigilance: '' });
        setActions([{ action: '', responsable: '', deadline: '' }]);
      },
    });
  };

  const uploadPhotos = async (visiteId: string, files: FileList) => {
    if (files.length > 6) { toast.error('Maximum 6 photos par visite'); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} dépasse 10 MB`); continue; }
        const path = `${chantierId}/${visiteId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('visites-photos').upload(path, file);
        if (uploadError) { toast.error(uploadError.message); continue; }
        await supabase.from('photos_visite').insert({
          visite_id: visiteId,
          file_name: file.name,
          file_path: path,
        } as any);
      }
      qc.invalidateQueries({ queryKey: ['chantiers'] });
      toast.success('Photos ajoutées');
    } finally {
      setUploading(false);
    }
  };

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const getPhotoUrl = (path: string) => signedUrls[path] || '';

  // Generate signed URLs when visites change
  useEffect(() => {
    const allPaths = visites.flatMap(v => (v.photos || []).map((p: any) => p.file_path));
    if (allPaths.length > 0) {
      supabase.storage.from('visites-photos').createSignedUrls(allPaths, 3600).then(({ data }) => {
        if (data) {
          const urls: Record<string, string> = {};
          data.forEach((item) => {
            if (item.signedUrl) urls[item.path || ''] = item.signedUrl;
          });
          setSignedUrls(urls);
        }
      });
    }
  }, [visites]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{visites.length} visite(s) de chantier</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-1" /> Nouvelle visite
        </Button>
      </div>

      {/* New visit form */}
      {showForm && (
        <div className="p-4 rounded-lg border border-dashed space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date et heure</Label>
              <Input type="datetime-local" value={form.date_visite} onChange={e => setForm(f => ({ ...f, date_visite: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Personnes présentes</Label>
              <Input value={form.personnes_presentes} onChange={e => setForm(f => ({ ...f, personnes_presentes: e.target.value }))} placeholder="Jean, Marie, Artisan X..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Observations</Label>
            <Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} rows={3} placeholder="État d'avancement, remarques par lot..." />
          </div>
          <div>
            <Label className="text-xs">Points de vigilance</Label>
            <Textarea value={form.points_vigilance} onChange={e => setForm(f => ({ ...f, points_vigilance: e.target.value }))} rows={2} placeholder="Risques identifiés, retards potentiels..." />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Prochaines actions</Label>
            {actions.map((a, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <Input placeholder="Action" value={a.action} onChange={e => updateAction(i, 'action', e.target.value)} />
                <Input placeholder="Responsable" value={a.responsable} onChange={e => updateAction(i, 'responsable', e.target.value)} />
                <div className="flex gap-1">
                  <Input type="date" value={a.deadline} onChange={e => updateAction(i, 'deadline', e.target.value)} />
                  {actions.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => removeAction(i)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addAction}><Plus className="w-3.5 h-3.5 mr-1" /> Action</Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button size="sm" onClick={handleSubmit}>Enregistrer la visite</Button>
          </div>
        </div>
      )}

      {/* Visit history */}
      {visites.map(v => (
        <div key={v.id} className="rounded-lg border bg-background overflow-hidden">
          <button
            onClick={() => setExpandedVisite(expandedVisite === v.id ? null : v.id)}
            className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors text-left"
          >
            <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {format(new Date(v.date_visite), 'EEEE dd MMMM yyyy · HH:mm', { locale: fr })}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {v.personnes_presentes ? `Présents: ${v.personnes_presentes}` : 'Aucun participant renseigné'}
                {v.photos && v.photos.length > 0 && ` · ${v.photos.length} photo(s)`}
              </p>
            </div>
            {expandedVisite === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedVisite === v.id && (
            <div className="px-4 pb-4 border-t space-y-3 pt-3">
              {v.observations && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Observations</p>
                  <p className="text-sm whitespace-pre-wrap">{v.observations}</p>
                </div>
              )}
              {v.points_vigilance && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Points de vigilance</p>
                  <p className="text-sm whitespace-pre-wrap text-hunters-warning">{v.points_vigilance}</p>
                </div>
              )}

              {v.prochaines_actions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Prochaines actions</p>
                  <div className="space-y-1">
                    {v.prochaines_actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted">
                        <span className="flex-1">{a.action}</span>
                        <span className="text-muted-foreground">{a.responsable}</span>
                        {a.deadline && <span className="text-muted-foreground">{a.deadline}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {v.photos && v.photos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {v.photos.map(p => (
                      <div key={p.id} className="relative group">
                        <img
                          src={getPhotoUrl(p.file_path)}
                          alt={p.legende || p.file_name}
                          className="w-full h-24 object-cover rounded-md"
                        />
                        {p.legende && (
                          <p className="text-[10px] text-center text-muted-foreground mt-0.5 truncate">{p.legende}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload photos */}
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && uploadPhotos(v.id, e.target.files)}
                    disabled={uploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Upload...' : 'Ajouter photos'}</span>
                  </Button>
                </label>
                <Button variant="ghost" size="sm" onClick={() => deleteVisite.mutate(v.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive mr-1" /> Supprimer
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {visites.length === 0 && !showForm && (
        <p className="text-sm text-center text-muted-foreground py-6">Aucune visite de chantier enregistrée</p>
      )}
    </div>
  );
}
