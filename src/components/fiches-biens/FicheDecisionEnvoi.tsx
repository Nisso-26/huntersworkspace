import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Send, Copy, Ban, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySettings } from '@/hooks/use-company-settings';
import { useFichePhotos, type FicheBien } from '@/hooks/use-fiches-biens';
import { assertEmail, sendDocumentEmail } from '@/lib/document-email';
import FicheBienDocument, { type FicheDocData } from './FicheBienDocument';

type Form = Record<string, any>;

function nouveauToken() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // 43 caractères
}

interface Props {
  form: Form;
  set: (k: string) => (v: any) => void;
  fiche: FicheBien;
  dossier: any;
  /** Fiche courante telle qu'elle sera rendue (form + bilan) */
  ficheRendu: Record<string, any>;
  enregistrer: () => Promise<FicheBien>;
  setCurrent: (f: FicheBien) => void;
}

export default function FicheDecisionEnvoi({ form, set, fiche, dossier, ficheRendu, enregistrer, setCurrent }: Props) {
  const qc = useQueryClient();
  const [apercu, setApercu] = useState(false);
  const [envoiOpen, setEnvoiOpen] = useState(false);
  const [email, setEmail] = useState(dossier.email || '');
  const [message, setMessage] = useState(`Bonjour ${dossier.client_name || ''},\n\nVoici la présentation d'un bien que nous avons sélectionné pour vous. Je reste à votre disposition pour en parler.\n\nBien à vous,`);
  const [busy, setBusy] = useState(false);
  const { data: photos = [] } = useFichePhotos(fiche.id);
  const { data: company } = useCompanySettings();
  const { data: conseiller } = useQuery({
    queryKey: ['profil-conseiller', fiche.mandataire_id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('full_name,telephone,email,avatar_url,rsac_numero,rsac_greffe').eq('id', fiche.mandataire_id).maybeSingle();
      return data;
    },
  });

  const tokenValide = !!(fiche as any).token_public && !!(fiche as any).token_expires_at && new Date((fiche as any).token_expires_at) > new Date();
  const lien = (t: string) => `${window.location.origin}/fiche/${t}`;

  const assurerToken = async (): Promise<FicheBien> => {
    const saved = await enregistrer();
    if (tokenValide) return saved;
    const { data, error } = await (supabase.from('fiches_biens' as any) as any)
      .update({ token_public: nouveauToken(), token_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() })
      .eq('id', fiche.id).select().single();
    if (error) throw error;
    setCurrent(data);
    return data;
  };

  const copier = async () => {
    try {
      const f: any = await assurerToken();
      await navigator.clipboard.writeText(lien(f.token_public));
      toast.success('Lien copié');
    } catch (e: any) { toast.error(e.message); }
  };

  const revoquer = async () => {
    if (!confirm('Révoquer le lien ? Le client ne pourra plus ouvrir la fiche.')) return;
    const { data, error } = await (supabase.from('fiches_biens' as any) as any)
      .update({ token_public: null, token_expires_at: null }).eq('id', fiche.id).select().single();
    if (error) { toast.error(error.message); return; }
    setCurrent(data);
    qc.invalidateQueries({ queryKey: ['fiches-biens', fiche.dossier_id] });
    toast.success('Lien révoqué');
  };

  const envoyer = async () => {
    setBusy(true);
    try {
      const to = assertEmail(email);
      const f: any = await assurerToken();
      const { data: env, error } = await (supabase.from('envois_documents') as any)
        .insert({ contexte: 'fiche_bien', document_nom: `Présentation — ${f.titre || 'bien'}`, dossier_id: fiche.dossier_id, destinataire: to, email_statut: 'envoi_en_cours' })
        .select().single();
      if (error) throw error;
      const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
      await sendDocumentEmail({
        to,
        subject: `Présentation d'opportunité — ${f.titre || 'un bien sélectionné pour vous'}`,
        eyebrow: 'Présentation d’opportunité',
        title: f.titre || null,
        numeroDossier: dossier.numero_dossier,
        bodyHtml: esc(message).split('\n').map(l => `<p>${l || '&nbsp;'}</p>`).join(''),
        cta: { label: 'Découvrir la présentation', url: lien(f.token_public) },
        tracking: { table: 'envois_documents', id: env.id, withDestinataire: false },
      });
      const { data: upd } = await (supabase.from('fiches_biens' as any) as any)
        .update({ statut: 'envoyee', envoyee_at: new Date().toISOString() }).eq('id', fiche.id).select().single();
      if (upd) { setCurrent(upd); set('statut')('envoyee'); }
      qc.invalidateQueries({ queryKey: ['fiches-biens', fiche.dossier_id] });
      qc.invalidateQueries({ queryKey: ['envois-documents'] });
      toast.success(`Fiche envoyée à ${to}`);
      setEnvoiOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Échec de l'envoi");
    } finally { setBusy(false); }
  };

  const etapes = form.prochaines_etapes as { titre: string; texte: string }[];
  const risques = form.risques as { risque: string; a_savoir: string; parade: string }[];
  const docData: FicheDocData = {
    fiche: ficheRendu,
    photos: photos.map(p => ({ id: p.id, url: p.url, role: p.role, legende: p.legende, ordre: p.ordre })),
    client: { prenom: dossier.client_name || '' },
    demande: dossier,
    conseiller: conseiller ?? null,
    societe: company ?? null,
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Notre recommandation</Label>
        <Textarea rows={4} value={form.recommandation} onChange={e => set('recommandation')(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Prochaines étapes (3)</Label>
        {etapes.map((e, i) => (
          <div key={i} className="grid grid-cols-[180px_1fr] gap-1">
            <Input className="h-9" value={e.titre} onChange={ev => set('prochaines_etapes')(etapes.map((x, j) => j === i ? { ...x, titre: ev.target.value } : x))} />
            <Input className="h-9" placeholder="Détail" value={e.texte} onChange={ev => set('prochaines_etapes')(etapes.map((x, j) => j === i ? { ...x, texte: ev.target.value } : x))} />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Risques et parades (facultatif)</Label>
        {risques.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
            {(['risque', 'a_savoir', 'parade'] as const).map(k => (
              <Input key={k} className="h-9" placeholder={k === 'risque' ? 'Risque' : k === 'a_savoir' ? 'À savoir' : 'Parade'} value={r[k]}
                onChange={ev => set('risques')(risques.map((x, j) => j === i ? { ...x, [k]: ev.target.value } : x))} />
            ))}
            <Button type="button" variant="ghost" size="icon" onClick={() => set('risques')(risques.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => set('risques')([...risques, { risque: '', a_savoir: '', parade: '' }])}><Plus className="h-3 w-3" />Ajouter un risque</Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button type="button" variant="outline" className="gap-2" onClick={() => setApercu(true)}><Eye className="h-4 w-4" />Aperçu client</Button>
        <Button type="button" className="gap-2" onClick={() => setEnvoiOpen(true)}><Send className="h-4 w-4" />Envoyer au client</Button>
        <Button type="button" variant="outline" className="gap-2" onClick={copier}><Copy className="h-4 w-4" />Copier le lien</Button>
        {(fiche as any).token_public && <Button type="button" variant="outline" className="gap-2 text-destructive" onClick={revoquer}><Ban className="h-4 w-4" />Révoquer le lien</Button>}
      </div>
      {tokenValide && <p className="text-xs text-muted-foreground">Lien actif jusqu'au {new Date((fiche as any).token_expires_at).toLocaleDateString('fr-FR')}</p>}

      <Dialog open={apercu} onOpenChange={setApercu}>
        <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto p-0">
          <FicheBienDocument data={docData} />
        </DialogContent>
      </Dialog>

      <Dialog open={envoiOpen} onOpenChange={setEnvoiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Envoyer la fiche au client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>E-mail du client</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Message</Label><Textarea rows={7} value={message} onChange={e => setMessage(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Le lien de la présentation est ajouté automatiquement (valable 30 jours).</p>
            <div className="flex justify-end"><Button onClick={envoyer} disabled={busy} className="gap-2">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Envoyer</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
