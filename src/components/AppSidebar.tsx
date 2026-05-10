import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, FolderKanban, FileText, CreditCard, Bell,
  Settings, LogOut, ChevronLeft, ChevronRight, Home, HardHat,
  CalendarDays, UserPlus, Briefcase, MessageSquare, FileSpreadsheet, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import GlobalSearch from '@/components/GlobalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { useAlertes } from '@/hooks/use-alertes';
import { useUnreadTotal } from '@/hooks/use-messagerie';
import huntersLogo from '@/assets/hunters-logo.jpg';

const allNavItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'principal' },
  { label: 'Contacts', icon: UserPlus, href: '/prospects', roles: ['super_admin', 'mandataire'], group: 'activite' },
  { label: 'Suivi des missions', icon: FolderKanban, href: '/pipeline', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'activite' },
  { label: 'Dossiers', icon: FileText, href: '/dossiers', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'activite' },
  { label: 'Biens immobiliers', icon: Home, href: '/biens', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'activite' },
  { label: 'Suivi Travaux', icon: HardHat, href: '/chantiers', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'activite' },
  { label: 'Réseau Conseillers', icon: Users, href: '/mandataires', roles: ['super_admin'], group: 'reseau' },
  { label: 'Accès & Invitations', icon: ShieldCheck, href: '/conseillers', roles: ['super_admin'], group: 'reseau' },
  { label: 'Prescripteurs', icon: Briefcase, href: '/partenaires', roles: ['super_admin', 'mandataire'], group: 'reseau' },
  { label: 'Facturation', icon: CreditCard, href: '/facturation', roles: ['super_admin'], group: 'finance' },
  { label: 'Export comptable', icon: FileSpreadsheet, href: '/export-comptable', roles: ['super_admin'], group: 'finance' },
  { label: 'Messagerie', icon: MessageSquare, href: '/messagerie', roles: ['super_admin', 'mandataire'], group: 'outils' },
  { label: 'Agenda', icon: CalendarDays, href: '/agenda', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'outils' },
  { label: 'Alertes', icon: Bell, href: '/alertes', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'outils' },
  { label: 'Paramètres', icon: Settings, href: '/parametres', roles: ['super_admin', 'mandataire', 'decoratrice'], group: 'outils' },
];

const groupLabels: Record<string, string> = {
  principal: '',
  activite: 'Activité',
  reseau: 'Réseau',
  finance: 'Finance',
  outils: 'Outils',
};

interface AppSidebarProps { mobile?: boolean; }

export default function AppSidebar({ mobile = false }: AppSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, role, signOut } = useAuth();
  const { data: alertes = [] } = useAlertes();
  const unreadMessages = useUnreadTotal();
  const unreadCount = alertes.filter(a => !a.is_read).length;

  const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const roleLabels: Record<string, string> = {
    super_admin: 'Directeur',
    mandataire: 'Conseiller',
    decoratrice: 'Décoratrice',
  };

  const isCollapsed = mobile ? false : collapsed;

  // Grouper les items
  const groups = ['principal', 'activite', 'reseau', 'finance', 'outils'];
  const groupedItems = groups.map(g => ({
    group: g,
    label: groupLabels[g],
    items: navItems.filter(i => i.group === g),
  })).filter(g => g.items.length > 0);

  return (
    <aside
      className={cn(
        'flex flex-col shadow-sidebar transition-all duration-300 select-none',
        'bg-gradient-hunters',
        mobile ? 'h-full w-full' : 'h-screen sticky top-0 hidden lg:flex',
        !mobile && (isCollapsed ? 'w-[68px]' : 'w-[256px]')
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center border-b border-sidebar-border/50',
        isCollapsed ? 'justify-center h-16 px-2' : 'justify-between h-16 px-5'
      )}>
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-wider font-heading">HUNTERS</p>
              <p className="text-sidebar-foreground/60 text-[10px] tracking-widest uppercase">Immobilier</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1">
          <GlobalSearch />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5 scrollbar-none">
        {groupedItems.map(({ group, label, items }) => (
          <div key={group} className="mb-1">
            {label && !isCollapsed && (
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mt-2">
                {label}
              </p>
            )}
            {label && isCollapsed && <div className="h-px bg-sidebar-border/30 mx-2 my-2" />}
            {items.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));
              const isAlertItem = item.href === '/alertes';
              const isMessageItem = item.href === '/messagerie';
              const badgeCount = isAlertItem ? unreadCount : isMessageItem ? unreadMessages : 0;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 relative group',
                    isActive
                      ? 'bg-accent text-accent-foreground font-semibold shadow-gold'
                      : 'text-sidebar-foreground/80 hover:bg-white/8 hover:text-white font-medium',
                    isCollapsed && 'justify-center px-2'
                  )}
                >
                  {/* Indicateur actif */}
                  {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-foreground/60 rounded-r-full" />
                  )}

                  <div className="relative flex-shrink-0">
                    <item.icon className={cn(
                      'w-4 h-4 transition-transform group-hover:scale-110',
                      isActive ? 'text-accent-foreground' : 'text-sidebar-foreground/70'
                    )} />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <span className="text-[12px] leading-tight">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse button */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-3 mb-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sidebar-foreground/50 hover:text-white hover:bg-white/8 transition-colors text-xs"
        >
          {isCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-3.5 h-3.5" /><span className="text-[11px]">Réduire</span></>
          }
        </button>
      )}

      {/* Profil utilisateur */}
      <div className="border-t border-sidebar-border/50 px-3 py-3">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
          <div className={cn(
            'flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-xs',
            'bg-accent text-accent-foreground shadow-gold',
            isCollapsed ? 'w-9 h-9' : 'w-8 h-8'
          )}>
            {initials}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-white truncate leading-tight">{displayName}</p>
              <p className="text-[10px] text-accent font-medium tracking-wide truncate">{role ? roleLabels[role] : ''}</p>
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={signOut}
              title="Déconnexion"
              className="text-sidebar-foreground/40 hover:text-destructive transition-colors flex-shrink-0 p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
