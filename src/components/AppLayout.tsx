import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import MobileHeader from './MobileHeader';

interface AppLayoutProps { children: ReactNode; }

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-7 lg:p-8 max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
