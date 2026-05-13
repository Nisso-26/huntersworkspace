import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDossiers } from '@/hooks/use-dossiers';
import { useMandataires } from '@/hooks/use-mandataires';
import { useProspects } from '@/hooks/use-prospects';
import { Search, X, FolderOpen, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: dossiers = [] } = useDossiers();
  const { data: mandataires = [] } = useMandataires();
  const { data: prospects = [] } = useProspects();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const q = query.toLowerCase().trim();

  const results = q.length < 2 ? [] : [
    ...dossiers
      .filter(d =>
        d.client_name.toLowerCase().includes(q) ||
        (d.ville || '').toLowerCase().includes(q) ||
        (d.numero_dossier || '').toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map(d => ({
        type: 'dossier',
        label: d.client_name,
        sub: [d.numero_dossier, d.ville, d.mandataire_name, `${(d.budget || 0).toLocaleString('fr-FR')} €`, d.status]
          .filter(Boolean).join(' · '),
        href: `/dossiers/${d.id}`,
        icon: FolderOpen,
      })),
    ...mandataires
      .filter(m => (m.full_name || '').toLowerCase().includes(q) || (m.zone || '').toLowerCase().includes(q))
      .slice(0, 3)
      .map(m => ({ type: 'conseiller', label: m.full_name || '', sub: m.zone || '', href: '/mandataires', icon: Users })),
    ...prospects
      .filter(p => (p.nom || '').toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({ type: 'contact', label: p.nom || '', sub: '', href: '/prospects', icon: UserPlus })),
  ];

  const handleSelect = (href: string) => {
    navigate(href);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-sidebar-foreground/60 bg-sidebar-accent/30 hover:bg-sidebar-accent/50 rounded-md transition-colors w-full"
      >
        <Search className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left hidden lg:block">Rechercher...</span>
        <kbd className="hidden lg:block text-[10px] bg-sidebar-accent/50 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>

      {/* Modal recherche */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg bg-card border rounded-xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un dossier, conseiller, contact..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {q.length >= 2 && (
              <div className="max-h-80 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat pour "{query}"</p>
                ) : (
                  results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(r.href)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <r.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                      </div>
                      <span className="ml-auto text-[10px] text-muted-foreground capitalize flex-shrink-0">{r.type}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {q.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tapez au moins 2 caractères pour rechercher
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
