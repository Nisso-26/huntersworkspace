import { useRef } from 'react';
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Image, Trash2, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileIcon({ type }: { type: string | null }) {
  if (type?.startsWith('image/')) return <Image className="w-4 h-4 text-accent" />;
  return <FileText className="w-4 h-4 text-primary" />;
}

export default function DocumentsSection({ dossierId }: { dossierId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: docs = [], isLoading } = useDocuments(dossierId);
  const uploadMut = useUploadDocument();
  const deleteMut = useDeleteDocument();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE) {
        return;
      }
      uploadMut.mutate({ dossierId, file });
    });
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('documents du dossier')
      .download(filePath);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Documents ({docs.length})</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => inputRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          {uploadMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Ajouter
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 rounded" />)}
        </div>
      ) : docs.length === 0 ? (
        <div
          className="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Glissez ou cliquez pour ajouter des fichiers</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, images — max 10 Mo</p>
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary/50 group">
              <FileIcon type={doc.file_type} />
              <span className="text-xs font-medium text-foreground truncate flex-1">{doc.file_name}</span>
              <span className="text-[10px] text-muted-foreground">{formatSize(doc.file_size)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => handleDownload(doc.file_path, doc.file_name)}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                onClick={() => deleteMut.mutate({ id: doc.id, filePath: doc.file_path, dossierId })}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
