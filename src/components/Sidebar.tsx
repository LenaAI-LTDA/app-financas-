import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Home,
  LogOut,
  Menu,
  Settings,
  Tags,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import ThemeToggle from "./ThemeToggle";

// 1. Define Context Value Type
interface SidebarContextValue {
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  isCollapsed: boolean; // Keep isCollapsed for desktop functionality if needed elsewhere
  toggleCollapse: () => void; // Function to toggle collapse
}

// 2. Create Context
const SidebarContext = createContext<SidebarContextValue | undefined>(
  undefined
);

// 3. Create Provider Component
interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider = ({ children }: SidebarProviderProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse state
  const isMobile = useIsMobile();

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  return (
    <SidebarContext.Provider
      value={{ isMobileOpen, toggleSidebar, isCollapsed, toggleCollapse }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

// 4. Create Custom Hook
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

interface SidebarNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
}

const SidebarNavItem = ({
  to,
  icon,
  label,
  isCollapsed,
}: SidebarNavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center p-3 ${
          isCollapsed ? "justify-center" : "justify-start"
        } 
        rounded-md mb-1 transition-all hover:bg-sidebar-accent
        ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground"
        }
      `}
    >
      <span className="w-5 h-5 mr-2">{icon}</span>
      {!isCollapsed && <span className="transition-all">{label}</span>}
    </NavLink>
  );
};

const Sidebar = () => {
  const { signOut } = useAuth();
  const { systemSettings, resolvedTheme } = useSystemSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isMobileOpen, toggleSidebar, isCollapsed, toggleCollapse } =
    useSidebar(); // Use the hook

  // Log para diagnóstico
  console.log("Sidebar - systemSettings recebidas:", systemSettings);

  // Verificar se white label está ativo
  const isWhiteLabelActive = systemSettings.white_label_active === true;

  console.log("Sidebar - White label ativo?", isWhiteLabelActive);

  // Definindo o nome da empresa baseado nas configurações
  const companyName = systemSettings.company_name || "Sistema Financeiro";

  // Gerando as iniciais da empresa
  const companyInitials = systemSettings.company_name
    ? systemSettings.company_name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "SF";

  // --- Calcular URL final do header AQUI ---
  let headerSpecificUrl = "";
  if (resolvedTheme === "dark") {
    headerSpecificUrl = systemSettings.logo_url_header_dark;
  } else {
    // Se não for dark, assume light
    headerSpecificUrl = systemSettings.logo_url_header_light;
  }
  const finalHeaderUrl =
    headerSpecificUrl || systemSettings.logo_url_header || "";
  console.log(
    `Sidebar (Render): Tema=${resolvedTheme}, Final=${finalHeaderUrl}`
  );
  // -----------------------------------------

  // Handle logout click
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: "Ocorreu um problema ao desconectar sua conta.",
      });
    }
  };

  const navItems = [
    { to: "/dashboard", icon: <Home size={20} />, label: "Dashboard" },
    {
      to: "/transactions",
      icon: <CreditCard size={20} />,
      label: "Transações",
    },
    { to: "/categories", icon: <Tags size={20} />, label: "Categorias" },
    {
      to: "/future-transactions",
      icon: <CalendarClock size={20} />,
      label: "Futuros",
    },
    { to: "/reports", icon: <BarChart3 size={20} />, label: "Relatórios" },
    { to: "/settings", icon: <Settings size={20} />, label: "Configurações" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 min-h-screen md:relative
          bg-sidebar flex flex-col border-r border-sidebar-border
          transition-all duration-300 ease-in-out
          ${
            isMobile
              ? isMobileOpen
                ? "translate-x-0 w-[280px]"
                : "-translate-x-full w-[280px]"
              : isCollapsed
              ? "w-[70px]"
              : "w-[280px]"
          }
        `}
      >
        {/* Sidebar Header Atualizado */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className="flex items-center">
            {systemSettings.show_header_logo && (
              <>
                {finalHeaderUrl ? (
                  <img
                    src={finalHeaderUrl}
                    alt={`${companyName || "Empresa"} Logo`}
                    className="h-12 w-auto object-contain mr-2"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs mr-2">
                    Logo
                  </div>
                )}
              </>
            )}

            {systemSettings.show_header_name && !isCollapsed && !isMobile && (
              <span className="font-semibold text-lg truncate ml-2">
                {companyName}
              </span>
            )}
          </div>

          {/* Botão de recolher/expandir (sem mudanças) */}
          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <X size={18} />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="hidden md:flex"
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </Button>
          )}
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 py-4 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                isCollapsed={isMobile ? false : isCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center w-full justify-center"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-2" />
              {!isCollapsed && <span>Sair</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export const MobileToggle = () => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className="md:hidden"
    >
      <Menu size={20} />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
};

export default Sidebar;
