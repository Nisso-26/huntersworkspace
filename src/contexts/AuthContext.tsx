import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AppRole = 'super_admin' | 'mandataire' | 'decoratrice' | 'analyste';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Routes publiques où aucune notification "session expirée" ne doit s'afficher
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];
const isOnClientPortal = () => window.location.pathname.startsWith('/client/');
const isPublicRoute = () =>
  PUBLIC_ROUTES.includes(window.location.pathname) || isOnClientPortal();

function redirectToLogin() {
  if (isPublicRoute()) return;
  // Conserve la page demandée pour redirection après reconnexion
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
}

function notifySessionExpired() {
  if (isPublicRoute()) return;
  toast.error('Votre session a expiré', {
    description: 'Veuillez vous reconnecter pour continuer.',
    duration: 5000,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // True dès qu'on a confirmé une session active. Permet de différencier
  // "jamais connecté" (silence) de "session perdue" (toast + redirect).
  const wasAuthenticatedRef = useRef(false);
  // Flag pour distinguer un signOut volontaire d'une expiration
  const intentionalSignOutRef = useRef(false);

  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (error) {
      setRole(null);
      return;
    }
    setRole((data as AppRole | null) ?? null);
  };

  useEffect(() => {
    const handleEvent = (event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        wasAuthenticatedRef.current = true;
        setTimeout(() => fetchRole(newSession.user.id), 0);
      } else {
        setRole(null);
      }

      // Détection expiration : session perdue alors qu'on était authentifié,
      // et déconnexion non intentionnelle.
      if (
        !newSession &&
        wasAuthenticatedRef.current &&
        !intentionalSignOutRef.current &&
        (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
      ) {
        wasAuthenticatedRef.current = false;
        notifySessionExpired();
        redirectToLogin();
      }

      // Reset flag après chaque event
      if (event === 'SIGNED_OUT') intentionalSignOutRef.current = false;

      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleEvent);

    supabase.auth.getSession().then(({ data: { session: existing }, error }) => {
      if (error) {
        // Refresh token invalide / corrompu au démarrage
        if (!isPublicRoute()) {
          notifySessionExpired();
          redirectToLogin();
        }
        setLoading(false);
        return;
      }
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        wasAuthenticatedRef.current = true;
        fetchRole(existing.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Filet de sécurité : intercepte les erreurs d'auth émises par fetch (ex: refresh_token_not_found)
  useEffect(() => {
    const handleAuthError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.code === 'refresh_token_not_found' || detail?.status === 401) {
        if (wasAuthenticatedRef.current && !intentionalSignOutRef.current) {
          wasAuthenticatedRef.current = false;
          notifySessionExpired();
          redirectToLogin();
        }
      }
    };
    window.addEventListener('supabase:auth-error', handleAuthError);
    return () => window.removeEventListener('supabase:auth-error', handleAuthError);
  }, []);

  const signOut = async () => {
    intentionalSignOutRef.current = true;
    wasAuthenticatedRef.current = false;
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
  };

  const hasRole = (r: AppRole) => role === r;
  const isAdmin = role === 'super_admin';

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut, hasRole, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
