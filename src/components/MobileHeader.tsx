import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppSidebar from './AppSidebar';
import huntersLogo from '@/assets/hunters-logo.jpg';

export default function MobileHeader() {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b sticky top-0 z-40">
      <img src={huntersLogo} alt="HUNTERS" className="h-8 object-contain" />
      <Sheet>
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <AppSidebar mobile />
        </SheetContent>
      </Sheet>
    </header>
  );
}
