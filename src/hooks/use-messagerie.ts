import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Conversation {
  id: string;
  mandataire_id: string;
  sujet: string;
  dossier_id: string | null;
  last_message_at: string;
  created_at: string;
  mandataire_name?: string;
  unread_count?: number;
  last_message_preview?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  file_path: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export function useConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations' as any)
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;

      const ids = [...new Set((data || []).map((c: any) => c.mandataire_id).filter(Boolean))];
      let profiles: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', ids);
        (p || []).forEach((pr: any) => { profiles[pr.id] = pr.full_name || ''; });
      }

      // Get unread counts
      const convIds = (data || []).map((c: any) => c.id);
      let unreadMap: Record<string, number> = {};
      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages' as any)
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .neq('sender_id', user!.id);
        (msgs || []).forEach((m: any) => {
          unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
        });
      }

      return (data || []).map((c: any) => ({
        ...c,
        mandataire_name: profiles[c.mandataire_id] || 'Inconnu',
        unread_count: unreadMap[c.id] || 0,
      })) as Conversation[];
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const senderIds = [...new Set((data || []).map((m: any) => m.sender_id).filter(Boolean))];
      let profiles: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: p } = await supabase.from('profiles').select('id, full_name').in('id', senderIds);
        (p || []).forEach((pr: any) => { profiles[pr.id] = pr.full_name || ''; });
      }

      return (data || []).map((m: any) => ({
        ...m,
        sender_name: profiles[m.sender_id] || 'Inconnu',
      })) as Message[];
    },
    enabled: !!user && !!conversationId,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conv: { mandataire_id: string; sujet: string; dossier_id?: string }) => {
      const { data, error } = await supabase.from('conversations' as any).insert(conv as any).select().single();
      if (error) throw error;
      return data as any as Conversation;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversations'] }); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: { conversation_id: string; sender_id: string; content: string; file_path?: string; file_name?: string }) => {
      const { data, error } = await supabase.from('messages' as any).insert(msg as any).select().single();
      if (error) throw error;
      // Update conversation last_message_at
      await supabase.from('conversations' as any).update({ last_message_at: new Date().toISOString() } as any).eq('id', msg.conversation_id);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.conversation_id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMarkMessagesRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const { error } = await supabase
        .from('messages' as any)
        .update({ is_read: true } as any)
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useRealtimeMessages(conversationId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, () => {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] });
        qc.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);
}

export function useUnreadTotal() {
  const { data: conversations = [] } = useConversations();
  return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
}
