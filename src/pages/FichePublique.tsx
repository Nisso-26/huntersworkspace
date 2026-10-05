import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FicheBienDocument, { type FicheDocData } from '@/components/fiches-biens/FicheBienDocument';

export default function FichePublique() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<FicheDocData | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'expire'>('chargement');

  useEffect(() => {
    document.title = "Présentation d'opportunité — HUNTERS";
    supabase.functions.invoke('fiche-publique', { body: { token } }).then(({ data, error }) => {
      if (error || !data?.fiche) { setEtat('expire'); return; }
      setData(data as FicheDocData); setEtat('ok');
    });
  }, [token]);

  if (etat === 'chargement') return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  if (etat === 'expire' || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <p className="max-w-sm text-base text-foreground">Ce lien a expiré. Contactez votre conseiller HUNTERS.</p>
      </div>
    );
  }
  return <FicheBienDocument data={data} showPrint />;
}
