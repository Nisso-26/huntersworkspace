import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  CreditCard,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { currentUser } from '@/data/mock-data';
import huntersLogo from '@/assets/hunters-logo.png';
import huntersIcon from '@/assets/hunters-icon.png';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Pipeline', icon: FolderKanban, href: '/pipeline' },
  { label: 'Dossiers', icon: FileText, href: '/dossiers' },
  { label: 'Mandataires', icon: Users, href: '/mandataires' },
  { label: 'Facturation', icon: CreditCard, href: '/facturation' },
  { label: 'Alertes', icon: Bell, href: '/alertes' },
  { label: 'Paramètres', icon: Settings, href: '/parametres' },
];

export default function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-gradient-navy border-r border-sidebar-border transition-all duration-300 sticky top-0',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-center px-4 h-16 border-b border-sidebar-border">
        {collapsed ? (
          <img src={huntersIcon} alt="HUNTERS" className="w-9 h-9 object-contain" />
        ) : (
          <img src={huntersLogo} alt="HUNTERS" className="h-9 object-contain animate-slide-in" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-semibold tracking-wide transition-all duration-200 uppercase',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-gold'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-sidebar-primary')} />
              {!collapsed && <span className="text-xs">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 flex items-center justify-center p-2 rounded-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {/* User */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-sidebar-primary">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-slide-in">
              <p className="text-sm font-semibold text-sidebar-accent-foreground truncate">{currentUser.name}</p>
              <p className="text-xs text-sidebar-foreground truncate">Super Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
