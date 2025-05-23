import { ReactNode, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { SidebarProvider, MobileToggle } from '@/components/Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const { systemSettings } = useSystemSettings();
  const isMobile = useIsMobile();

  // Atualizar o título da página com o nome da empresa do white label
  useEffect(() => {
    if (systemSettings.company_name) {
      document.title = systemSettings.company_name;
    } else {
      document.title = 'Sistema Financeiro';
    }
  }, [systemSettings]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="h-16 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <MobileToggle />
            </div>
            
            <div className="flex items-center gap-4">
              {!isMobile && <ThemeToggle />}
              <div className="text-sm flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                {!isMobile && (
                  <span className="font-medium">{user?.email}</span>
                )}
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
