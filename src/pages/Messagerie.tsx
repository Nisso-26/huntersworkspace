import AppLayout from '@/components/AppLayout';
import { useConversations, useMessages, useCreateConversation, useSendMessage, useMarkMessagesRead, useRealtimeMessages, Conversation } from '@/hooks/use-messagerie';
import { useMandataires } from '@/hooks/use-mandataires';
import { useDossiers } from '@/hooks/use-dossiers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Plus, MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

function NewConversationDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const { user, isAdmin } = useAuth();
  const { data: mandataires = [] } = useMandataires();
  const { data: dossiers = [] } = useDossiers();
  const createMut = useCreateConversation();
  const [open, setOpen] = useState(false);
  const [sujet, setSujet] = useState('');
  const [mandataireId, setMandataireId] = useState('');
  const [dossierId, setDossierId] = useState('');

  const handleCreate = async () => {
    const mId = isAdmin ? mandataireId : user!.id;
    if (!mId || !sujet.trim()) return;
    const conv = await createMut.mutateAsync({ mandataire_id: mId, sujet, dossier_id: dossierId || undefined });
    setOpen(false);
    setSujet('');
    onCreated(conv.id);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Nouvelle</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle conversation</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Sujet *</Label>
            <Input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Ex: Question sur le dossier Dupont" />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Conseiller</Label>
              <Select value={mandataireId} onValueChange={setMandataireId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  {mandataires.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Lier à un dossier (optionnel)</Label>
            <Select value={dossierId} onValueChange={v => setDossierId(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun</SelectItem>
                {dossiers.map(d => <SelectItem key={d.id} value={d.id}>{d.client_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={!sujet.trim() || (isAdmin && !mandataireId)}>Créer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Messagerie() {
  const { user, isAdmin } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: messages = [] } = useMessages(selectedId);
  const sendMut = useSendMessage();
  const markReadMut = useMarkMessagesRead();
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useRealtimeMessages(selectedId);

  // Mark messages as read when selecting a conversation
  useEffect(() => {
    if (selectedId && user) {
      markReadMut.mutate({ conversationId: selectedId, userId: user.id });
    }
  }, [selectedId, user?.id, messages.length]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedId || !user) return;
    await sendMut.mutateAsync({ conversation_id: selectedId, sender_id: user.id, content: newMsg.trim() });
    setNewMsg('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId || !user) return;
    const path = `messages/${selectedId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('documents du dossier').upload(path, file);
    if (error) return;
    await sendMut.mutateAsync({
      conversation_id: selectedId,
      sender_id: user.id,
      content: `📎 ${file.name}`,
      file_path: path,
      file_name: file.name,
    });
  };

  const selectedConv = conversations.find(c => c.id === selectedId);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Messagerie</h1>
            <p className="text-muted-foreground mt-1">Messagerie interne Hunters</p>
          </div>
          <NewConversationDialog onCreated={setSelectedId} />
        </div>

        <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
          {/* Conversation list */}
          <div className="w-[300px] flex-shrink-0 bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 m-2 rounded" />)
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center p-6">Aucune conversation</p>
              ) : conversations.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b hover:bg-secondary/50 transition-colors',
                    selectedId === c.id && 'bg-secondary'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{c.sujet}</p>
                    {(c.unread_count || 0) > 0 && (
                      <span className="min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {isAdmin ? c.mandataire_name : 'Siège'} · {new Date(c.last_message_at).toLocaleDateString('fr-FR')}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 bg-card rounded-xl border border-border/60 shadow-card border-border/60 shadow-card overflow-hidden flex flex-col">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sélectionnez une conversation</p>
                </div>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b">
                  <p className="text-sm font-semibold text-foreground">{selectedConv?.sujet}</p>
                  <p className="text-xs text-muted-foreground">{isAdmin ? selectedConv?.mandataire_name : 'Échange avec le siège'}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map(m => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[70%] rounded-xl px-4 py-2.5',
                          isMe ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                        )}>
                          <p className="text-xs font-medium opacity-70 mb-1">{m.sender_name}</p>
                          <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          {m.file_path && (
                            <Button
                              variant="link"
                              size="sm"
                              className={cn('p-0 h-auto text-xs mt-1', isMe ? 'text-primary-foreground' : 'text-primary')}
                              onClick={async () => {
                                const { data } = await supabase.storage.from('documents du dossier').createSignedUrl(m.file_path!, 3600);
                                if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              }}
                            >
                              📎 {m.file_name}
                            </Button>
                          )}
                          <p className={cn('text-[10px] mt-1 opacity-50', isMe ? 'text-right' : '')}>
                            {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <div className="p-3 border-t flex items-center gap-2">
                  <label className="cursor-pointer">
                    <Paperclip className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.gif" />
                  </label>
                  <Input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <Button size="icon" onClick={handleSend} disabled={!newMsg.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
