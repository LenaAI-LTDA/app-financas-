import { ReactNode, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ThemeToggle from '@/components/ThemeToggle';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  footer?: ReactNode;
}

const AuthLayout = ({ children, title, description, footer }: AuthLayoutProps) => {
  const { systemSettings, loading, resolvedTheme } = useSystemSettings();
  
  // Log para diagnóstico
  console.log('AuthLayout - systemSettings recebidas:', systemSettings);
  
  // Verificar se white label está ativo (garantindo comparação booleana)
  const isWhiteLabelActive = systemSettings.white_label_active === true;
  
  console.log('AuthLayout - White label ativo?', isWhiteLabelActive);
  
  // Cores personalizadas quando o white label estiver ativo
  const primaryColor = isWhiteLabelActive ? systemSettings.primary_color : undefined;
  const secondaryColor = isWhiteLabelActive ? systemSettings.secondary_color : undefined;
  
  // Determinar o nome da empresa com base nas configurações
  const companyName = systemSettings.company_name || 'Sistema Financeiro';
  
  // Determinar o slogan com base nas configurações
  const companySlogan = systemSettings.company_slogan || 'Gerencie suas finanças de forma simples';

  console.log('AuthLayout - Usando nome da empresa:', companyName);
  console.log('AuthLayout - Usando slogan:', companySlogan);
  console.log('AuthLayout - Logo URL:', systemSettings.logo_url);

  // Gerar as iniciais do nome da empresa (usado quando não há logo)
  const companyInitials = systemSettings.company_name
    ? systemSettings.company_name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()
    : 'SF';
    
  // Estilos para elementos personalizados quando o white label estiver ativo
  const logoBoxStyle = isWhiteLabelActive && primaryColor 
    ? { backgroundColor: primaryColor } 
    : {};
    
  const titleStyle = isWhiteLabelActive && primaryColor
    ? { color: primaryColor }
    : {};
    
  const backgroundStyle = isWhiteLabelActive && primaryColor && secondaryColor
    ? { 
        background: `linear-gradient(to bottom, ${primaryColor}15, ${secondaryColor}15)`,
      }
    : {};
  
  // Estilo para o botão de login quando o white label estiver ativo
  useEffect(() => {
    if (isWhiteLabelActive && primaryColor) {
      // Aplicar estilo diretamente ao botão de login e links
      const styleElement = document.createElement('style');
      styleElement.id = 'auth-custom-styles';
      styleElement.innerHTML = `
        .auth-custom-button {
          background-color: ${primaryColor} !important;
        }
        .auth-custom-button:hover {
          background-color: ${secondaryColor} !important;
        }
        .auth-custom-link {
          color: ${primaryColor} !important;
        }
        .auth-custom-link:hover {
          color: ${secondaryColor} !important;
        }
      `;
      
      // Remover estilos anteriores se existirem
      const existingStyle = document.getElementById('auth-custom-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      document.head.appendChild(styleElement);
    }
    
    return () => {
      // Cleanup ao desmontar
      const styleElement = document.getElementById('auth-custom-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [isWhiteLabelActive, primaryColor, secondaryColor]);

  // Componente de carregamento para o cabeçalho
  const HeaderLoading = () => (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-4">
        <Skeleton className="h-16 w-40" />
      </div>
      <Skeleton className="h-8 w-64 mx-auto" />
      <Skeleton className="h-4 w-48 mx-auto mt-2" />
    </div>
  );

  // --- Calcular URL final do login AQUI ---
  let loginSpecificUrl = '';
  if (resolvedTheme === 'dark') {
    loginSpecificUrl = systemSettings.logo_url_login_dark;
  } else { // Se não for dark, assume light
    loginSpecificUrl = systemSettings.logo_url_login_light;
  }
  const finalLoginUrl = loginSpecificUrl || systemSettings.logo_url_login || '';
  console.log(`AuthLayout (Render): Tema=${resolvedTheme}, Final=${finalLoginUrl}`);
  // -----------------------------------------

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 py-12 bg-background"
      style={backgroundStyle}
    >
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-4">
        {loading ? (
          <HeaderLoading />
        ) : (
          <div className="text-center mb-8">
            {finalLoginUrl && finalLoginUrl.trim() !== '' ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={finalLoginUrl} 
                  alt={`${companyName} Logo`}
                  className="h-16 max-w-[200px] w-auto object-contain" 
                />
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div 
                    className="h-16 w-16 rounded-md flex items-center justify-center text-primary-foreground font-bold text-2xl"
                    style={isWhiteLabelActive ? { backgroundColor: primaryColor } : { backgroundColor: 'var(--primary)' }}
                  >
                    {companyInitials}
                  </div>
                </div>
                <h1 
                  className="text-4xl font-bold"
                  style={isWhiteLabelActive ? { color: primaryColor } : {}}
                >
                  {companyName}
                </h1>
              </>
            )}
            {systemSettings.company_slogan && (
                <p className="text-muted-foreground mt-1">{systemSettings.company_slogan}</p>
            )}
          </div>
        )}
        
        <Card className="w-full border border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
          {footer && (
            <CardFooter>
              {typeof footer === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: footer }} />
              ) : (
                footer
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AuthLayout;
