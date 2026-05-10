import { Menu, Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppSidebar from './AppSidebar';
import huntersLogo from '@/assets/hunters-logo.jpg';
import { useAlertes } from '@/hooks/use-alertes';
import { Link } from 'react-router-dom';

export default function MobileHeader() {
  const { data: alertes = [] } = useAlertes();
  const unreadCount = alertes.filter(a => !a.is_read).length;

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-card border-b border-border/60 shadow-sm">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10">
            <img src={huntersLogo} alt="HUNTERS" className="w-full h-full object-contain" />
          </div>
          <span className="font-heading font-bold text-foreground text-sm tracking-wide">HUNTERS</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Alertes */}
          <Link
            to="/alertes"
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Bell className="w-4.5 h-4.5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Link>

          {/* Menu hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[256px] border-0">
              <AppSidebar mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
