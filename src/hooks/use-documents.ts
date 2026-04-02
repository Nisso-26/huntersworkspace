import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Document {
  id: string;
  dossier_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export function useDocuments(dossierId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents', dossierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('dossier_id', dossierId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Document[];
    },
    enabled: !!user && !!dossierId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ dossierId, file }: { dossierId: string; file: File }) => {
      const filePath = `${user!.id}/${dossierId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('dossier-documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        dossier_id: dossierId,
        uploaded_by: user!.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      } as any);
      if (dbError) throw dbError;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['documents', vars.dossierId] });
      toast.success('Document uploadé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, dossierId }: { id: string; filePath: string; dossierId: string }) => {
      const { error: storageError } = await supabase.storage
        .from('dossier-documents')
        .remove([filePath]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('documents').delete().eq('id', id);
      if (dbError) throw dbError;
      return dossierId;
    },
    onSuccess: (dossierId) => {
      qc.invalidateQueries({ queryKey: ['documents', dossierId] });
      toast.success('Document supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}
