import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, FolderKanban, FileText, CreditCard, Bell, Settings, LogOut, ChevronLeft, ChevronRight, Home, HardHat, CalendarDays, UserPlus, Briefcase, MessageSquare, FileSpreadsheet, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useAlertes } from '@/hooks/use-alertes';
import { useUnreadTotal } from '@/hooks/use-messagerie';
import huntersLogo from '@/assets/hunters-logo.jpg';

const allNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Prospects', icon: UserPlus, href: '/prospects', roles: ['super_admin', 'mandataire'] },
  { label: 'Pipeline', icon: FolderKanban, href: '/pipeline', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Dossiers', icon: FileText, href: '/dossiers', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Biens', icon: Home, href: '/biens', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Mandataires', icon: Users, href: '/mandataires', roles: ['super_admin'] },
  { label: 'Conseillers', icon: ShieldCheck, href: '/conseillers', roles: ['super_admin'] },
  { label: 'Partenaires', icon: Briefcase, href: '/partenaires', roles: ['super_admin', 'mandataire'] },
  { label: 'Chantiers', icon: HardHat, href: '/chantiers', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Facturation', icon: CreditCard, href: '/facturation', roles: ['super_admin'] },
  { label: 'Export comptable', icon: FileSpreadsheet, href: '/export-comptable', roles: ['super_admin'] },
  { label: 'Messagerie', icon: MessageSquare, href: '/messagerie', roles: ['super_admin', 'mandataire'] },
  { label: 'Agenda', icon: CalendarDays, href: '/agenda', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Alertes', icon: Bell, href: '/alertes', roles: ['super_admin', 'mandataire', 'decoratrice'] },
  { label: 'Paramètres', icon: Settings, href: '/parametres', roles: ['super_admin', 'mandataire', 'decoratrice'] },
];

interface AppSidebarProps {
  mobile?: boolean;
}

export default function AppSidebar({ mobile = false }: AppSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, signOut } = useAuth();
  const { data: alertes = [] } = useAlertes();
  const unreadMessages = useUnreadTotal();
  const unreadCount = alertes.filter(a => !a.is_read).length;

  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('')
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.user_metadata?.full_name || user?.email || '';

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    mandataire: 'Mandataire',
    decoratrice: 'Décoratrice',
  };

  const isCollapsed = mobile ? false : collapsed;

  return (
    <aside
      className={cn(
        'flex flex-col bg-gradient-navy border-r border-sidebar-border transition-all duration-300',
        mobile ? 'h-full w-full' : 'h-screen sticky top-0 hidden lg:flex',
        !mobile && (isCollapsed ? 'w-[72px]' : 'w-[260px]')
      )}
    >
      {!mobile && (
        <div className="flex items-center justify-center px-4 h-16 border-b border-sidebar-border">
          <img src={huntersLogo} alt="HUNTERS" className={cn("object-contain", isCollapsed ? "w-10 h-10" : "h-12")} />
        </div>
      )}

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!isCollapsed && (
          <div className="mb-3">
            <GlobalSearch />
          </div>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const isAlertItem = item.href === '/alertes';
          const isMessageItem = item.href === '/messagerie';
          const badgeCount = isAlertItem ? unreadCount : isMessageItem ? unreadMessages : 0;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold tracking-wide transition-all duration-200 uppercase relative',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-gold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                isCollapsed && 'justify-center'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className={cn('w-5 h-5', isActive && 'text-sidebar-primary')} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              {!isCollapsed && <span className="text-xs">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-3 mb-2 flex items-center justify-center p-2 rounded-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sidebar-primary">{initials}</span>
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-slide-in">
              <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground truncate">{role ? roleLabels[role] : ''}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="text-sidebar-foreground hover:text-destructive transition-colors flex-shrink-0"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
