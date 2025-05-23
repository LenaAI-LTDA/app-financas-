import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { user } = useAuth();
  const { systemSettings, loading: settingsLoading, effectiveHeaderLogoUrl, resolvedTheme } = useSystemSettings();
  const navigate = useNavigate();
  
  // Redirecionando usuários logados para o dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Verificar se white label está ativo
  const isWhiteLabelActive = systemSettings.white_label_active === true;
  
  // Dados da empresa com fallbacks
  const companyName = systemSettings.company_name || 'Sistema Financeiro';
  const companySlogan = systemSettings.company_slogan || 'Gerencie suas finanças de forma simples';
  const companyInitials = systemSettings.company_name
    ? systemSettings.company_name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()
    : 'SF';
    
  // Cores personalizadas para serem usadas no estilo inline quando o white label estiver ativo
  const primaryColor = isWhiteLabelActive ? systemSettings.primary_color : undefined;
  const secondaryColor = isWhiteLabelActive ? systemSettings.secondary_color : undefined;

  // Estilo para elementos personalizados quando o white label estiver ativo
  const primaryButtonStyle = isWhiteLabelActive 
    ? { backgroundColor: primaryColor, borderColor: primaryColor } 
    : {};
    
  const secondaryButtonStyle = isWhiteLabelActive
    ? { borderColor: primaryColor, color: primaryColor }
    : {};
    
  const primaryTextStyle = isWhiteLabelActive
    ? { color: primaryColor }
    : {};
    
  const backgroundGradientStyle = isWhiteLabelActive
    ? { background: `linear-gradient(to bottom right, ${primaryColor}20, transparent, ${secondaryColor}20)` }
    : {};
    
  // Componente de logo simplificado
  const LogoComponent = () => {
    if (settingsLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-6 w-32" />
        </div>
      );
    }
    
    // --- Calcular URL final do header AQUI ---
    let headerSpecificUrl = '';
    if (resolvedTheme === 'dark') {
      headerSpecificUrl = systemSettings.logo_url_header_dark;
    } else { // Se não for dark, assume light
      headerSpecificUrl = systemSettings.logo_url_header_light;
    }
    const finalHeaderUrl = headerSpecificUrl || systemSettings.logo_url_header || '';
    console.log(`Index/LogoComponent (Render): Tema=${resolvedTheme}, Final=${finalHeaderUrl}`);
    // -----------------------------------------

    return (
      <div className="flex items-center space-x-2">
        {systemSettings.show_header_logo && (
          <>
            {finalHeaderUrl ? (
              <img 
                src={finalHeaderUrl} 
                alt={`${companyName} Logo`}
                className="h-12 w-auto object-contain" 
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">Logo</div>
            )}
          </>
        )}
        {systemSettings.show_index_name && (
            <span className="font-semibold text-xl truncate">{companyName}</span>
        )}
        {!systemSettings.show_header_logo && !systemSettings.show_index_name && (
             <span className="font-semibold text-xl">App</span> 
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <LogoComponent />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link to="/auth/login">Entrar</Link>
            </Button>
            <Button 
              asChild 
              style={primaryButtonStyle}
            >
              <Link to="/auth/register">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Mostrar skeleton durante carregamento */}
      {settingsLoading ? (
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="container max-w-6xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-2/3 mx-auto" />
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-36" />
            </div>
            <div className="pt-8 max-w-5xl mx-auto">
              <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
          </div>
        </section>
      ) : (
        <section 
          className="flex-1 flex flex-col items-center justify-center px-4 py-12"
          style={backgroundGradientStyle}
        >
          <div className="container max-w-6xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                Finanças simplificadas para{" "}
                <span 
                  className="animate-pulse-gentle"
                  style={primaryTextStyle}
                >
                  todos
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {companyName} é a maneira mais simples de controlar suas finanças pessoais. {companySlogan}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                asChild 
                size="lg" 
                className="w-full sm:w-auto"
                style={primaryButtonStyle}
              >
                <Link to="/auth/register">
                  Começar grátis
                </Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto"
                style={secondaryButtonStyle}
              >
                <Link to="/auth/login">
                  Entrar na minha conta
                </Link>
              </Button>
            </div>
            
            <div className="pt-8 max-w-5xl mx-auto">
              <div className="bg-card border rounded-2xl shadow-lg overflow-hidden animate-float">
                <div 
                  className="h-80 flex items-center justify-center"
                  style={isWhiteLabelActive ? 
                    { background: `linear-gradient(to bottom right, ${primaryColor}20, var(--card), ${secondaryColor}20)` } : 
                    { background: "linear-gradient(to bottom right, var(--primary)/0.2, var(--card), var(--accent)/0.2)" }
                  }
                >
                  <div className="text-2xl font-medium text-center px-6 py-12">
                    <span className="block text-xl mb-2 text-muted-foreground">Um aplicativo de finanças completo</span>
                    <span className="text-4xl font-bold">
                      Controle financeiro <br />
                      <span style={primaryTextStyle}>sem complicação</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col md:h-16 items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {!settingsLoading ? companyName : 'Carregando...'} Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:underline">Privacidade</Link>
            <Link to="/terms" className="hover:underline">Termos de Uso</Link>
            <Link to="/contact" className="hover:underline">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
