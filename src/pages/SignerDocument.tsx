import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle2, AlertTriangle, Download, Eraser, PenTool, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import huntersLogo from '@/assets/hunters-symbol-dark.svg';

interface SignaturePublique {
  id: string;
  signataire_nom: string;
  signataire_email: string;
  type_document: string;
  type_label: string;
  document_nom: string | null;
  statut: string;
  expires_at: string;
  signed_at: string | null;
  document_url: string | null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#06381E]">
      <header className="px-4 py-5 flex items-center gap-3 border-b border-white/10">
        <img src={huntersLogo} alt="Hunters Immobilier" className="h-9 w-auto" />
        <div>
          <p className="text-white font-heading text-sm tracking-[0.2em]">HUNTERS·IMMOBILIER</p>
          <p className="text-white/50 text-[11px]">Signature électronique sécurisée</p>
        </div>
      </header>
      <main className="px-4 py-6 max-w-3xl mx-auto">{children}</main>
      <footer className="px-4 py-6 text-center text-white/40 text-[11px]">
        Signature électronique simple au sens du règlement (UE) n° 910/2014 (eIDAS).
      </footer>
    </div>
  );
}

function Message({ icon: Icon, titre, texte, tone = 'neutral' }: {
  icon: typeof AlertTriangle; titre: string; texte: string; tone?: 'neutral' | 'success' | 'error';
}) {
  const color = tone === 'success' ? 'text-hunters-success' : tone === 'error' ? 'text-destructive' : 'text-accent';
  return (
    <div className="bg-card border border-border/60 rounded-xl p-8 text-center">
      <Icon className={`w-10 h-10 mx-auto mb-4 ${color}`} />
      <h1 className="font-heading text-lg text-foreground mb-2">{titre}</h1>
      <p className="text-sm text-muted-foreground">{texte}</p>
    </div>
  );
}

export default function SignerDocument() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [sig, setSig] = useState<SignaturePublique | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'dessinee' | 'tapee'>('dessinee');
  const [nomTape, setNomTape] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ url: string | null } | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [motif, setMotif] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const call = useCallback(async (body: Record<string, unknown>) => {
    const { data, error: fnErr } = await supabase.functions.invoke('signature-portail', {
      body: { token, ...body },
    });
    if (fnErr) {
      let details = fnErr.message;
      try {
        const ctx = (fnErr as any).context;
        if (ctx?.text) details = JSON.parse(await ctx.text()).error || details;
      } catch { /* ignore */ }
      throw new Error(details);
    }
    return data as any;
  }, [token]);

  useEffect(() => {
    if (!token) return;
    call({ action: 'get' })
      .then(res => {
        setSig(res.signature);
        setNomTape(res.signature?.signataire_nom ?? '');
      })
      .catch(e => setError(e.message || 'Lien invalide'))
      .finally(() => setLoading(false));
  }, [token, call]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== 'dessinee') return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2C2C2C';
  }, [mode, sig]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasDrawn(true);
  };
  const end = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const signer = async () => {
    let signature_data = '';
    if (mode === 'dessinee') {
      if (!hasDrawn) { toast.error('Veuillez dessiner votre signature'); return; }
      signature_data = canvasRef.current!.toDataURL('image/png');
    } else {
      if (nomTape.trim().length < 3) { toast.error('Saisissez votre nom complet'); return; }
      signature_data = nomTape.trim();
    }
    setSending(true);
    try {
      const res = await call({ action: 'sign', signature_data, signature_type: mode });
      setDone({ url: res.document_signe_url ?? null });
      toast.success('Document signé');
    } catch (e: any) {
      toast.error(e.message || 'Signature impossible');
    } finally {
      setSending(false);
    }
  };

  const refuser = async () => {
    if (motif.trim().length < 3) { toast.error('Merci d’indiquer un motif'); return; }
    setSending(true);
    try {
      await call({ action: 'refuse', motif: motif.trim() });
      setSig(s => (s ? { ...s, statut: 'refuse' } : s));
      toast.success('Refus enregistré');
    } catch (e: any) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-accent" />
        </div>
      </Shell>
    );
  }

  if (error || !sig) {
    return (
      <Shell>
        <Message
          icon={AlertTriangle}
          tone="error"
          titre="Lien de signature invalide"
          texte={error || "Ce lien n'est plus valide. Contactez votre conseiller Hunters pour en obtenir un nouveau."}
        />
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Message
          icon={CheckCircle2}
          tone="success"
          titre="Document signé"
          texte="Merci. Votre signature a été enregistrée avec ses données de preuve (date, heure, adresse IP, méthode). Une copie a été transmise à votre conseiller."
        />
        {done.url && (
          <div className="text-center mt-4">
            <Button onClick={() => window.open(done.url!, '_blank')} className="gap-2">
              <Download className="w-4 h-4" /> Télécharger le document signé
            </Button>
          </div>
        )}
      </Shell>
    );
  }

  if (sig.statut === 'signe') {
    return (
      <Shell>
        <Message
          icon={CheckCircle2}
          tone="success"
          titre="Document déjà signé"
          texte={`Ce document a été signé le ${sig.signed_at ? new Date(sig.signed_at).toLocaleDateString('fr-FR') : ''}. Aucune action supplémentaire n'est requise.`}
        />
      </Shell>
    );
  }

  if (sig.statut === 'expire') {
    return (
      <Shell>
        <Message
          icon={AlertTriangle}
          titre="Lien expiré"
          texte={`Ce lien de signature a expiré le ${new Date(sig.expires_at).toLocaleDateString('fr-FR')}. Contactez votre conseiller Hunters pour recevoir un nouveau lien.`}
        />
      </Shell>
    );
  }

  if (sig.statut === 'refuse') {
    return (
      <Shell>
        <Message
          icon={XCircle}
          tone="error"
          titre="Signature refusée"
          texte="Vous avez refusé de signer ce document. Votre conseiller Hunters a été informé et vous recontactera."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="bg-card border border-border/60 rounded-xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Document à signer</p>
          <h1 className="font-heading text-lg text-foreground">
            {sig.type_label}{sig.document_nom ? ` — ${sig.document_nom}` : ''}
          </h1>
          <p className="text-xs text-muted-foreground mt-2">
            Signataire : <strong>{sig.signataire_nom}</strong> ({sig.signataire_email}) · Lien valable jusqu'au{' '}
            {new Date(sig.expires_at).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {sig.document_url ? (
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            <iframe src={sig.document_url} title="Document à signer" className="w-full h-[460px] bg-muted" />
            <div className="p-3 border-t border-border/40 text-right">
              <Button variant="outline" size="sm" onClick={() => window.open(sig.document_url!, '_blank')} className="gap-2">
                <Download className="w-3.5 h-3.5" /> Ouvrir le PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border/60 rounded-xl p-5 text-xs text-muted-foreground">
            Aucun PDF n'est joint à cette demande : votre signature générera un certificat de signature électronique.
          </div>
        )}

        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-foreground">Votre signature</p>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant={mode === 'dessinee' ? 'default' : 'outline'} size="sm" onClick={() => setMode('dessinee')}>
              Dessiner
            </Button>
            <Button type="button" variant={mode === 'tapee' ? 'default' : 'outline'} size="sm" onClick={() => setMode('tapee')}>
              Signature tapée
            </Button>
          </div>

          {mode === 'dessinee' ? (
            <div>
              <canvas
                ref={canvasRef}
                onPointerDown={start}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="w-full h-40 rounded-lg border border-dashed border-border bg-white touch-none"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-[11px] text-muted-foreground">Signez avec le doigt ou la souris.</p>
                <Button type="button" variant="ghost" size="sm" onClick={clear} className="gap-1.5 text-xs">
                  <Eraser className="w-3.5 h-3.5" /> Effacer
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Votre nom complet</Label>
              <Input value={nomTape} onChange={e => setNomTape(e.target.value)} className="h-10" />
              <div className="mt-3 rounded-lg border border-dashed border-border bg-white p-5 text-center">
                <span className="text-2xl italic text-[#2C2C2C]" style={{ fontFamily: 'Georgia, serif' }}>
                  {nomTape || 'Votre nom'}
                </span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            En signant, vous acceptez que votre nom, votre adresse email, la date et l'heure, votre adresse IP et
            votre navigateur soient enregistrés comme éléments de preuve et intégrés au document signé.
          </p>

          <Button onClick={signer} disabled={sending} className="w-full gap-2 h-11">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Signer le document
          </Button>

          {!refusing ? (
            <button
              type="button"
              onClick={() => setRefusing(true)}
              className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Je ne souhaite pas signer ce document
            </button>
          ) : (
            <div className="space-y-2 pt-2 border-t border-border/40">
              <Label className="text-xs">Motif du refus</Label>
              <Textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} className="text-sm" />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRefusing(false)}>Annuler</Button>
                <Button variant="destructive" size="sm" onClick={refuser} disabled={sending}>
                  Confirmer le refus
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </Shell>
  );
}
