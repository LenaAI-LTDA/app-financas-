import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

// Chave para o localStorage (RESTAURADA)
const SYSTEM_SETTINGS_CACHE_KEY = 'grana_zap_system_settings';

// Tipo das configurações globais do sistema
interface SystemSettings {
  id?: number;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  company_name: string;
  company_slogan: string;
  white_label_active: boolean;
  logo_url_header: string;
  logo_url_login: string;
  show_header_logo: boolean;
  show_header_name: boolean;
  logo_url_header_light: string;
  logo_url_header_dark: string;
  logo_url_login_light: string;
  logo_url_login_dark: string;
  show_index_name: boolean;
  favicon_url: string;
  created_at?: string;
  updated_at?: string;
}

// Valores padrão para configurações do sistema
const defaultSystemSettings: SystemSettings = {
  primary_color: '#7c4dff',
  secondary_color: '#6a3de8',
  logo_url: '',
  company_name: 'Sistema Financeiro',
  company_slogan: 'Gerencie suas finanças de forma simples',
  white_label_active: false,
  logo_url_header: '',
  logo_url_login: '',
  show_header_logo: true,
  show_header_name: true,
  logo_url_header_light: '',
  logo_url_header_dark: '',
  logo_url_login_light: '',
  logo_url_login_dark: '',
  show_index_name: true,
  favicon_url: ''
};

// Contexto de configurações do sistema
interface SystemSettingsContextProps {
  systemSettings: SystemSettings;
  refreshSystemSettings: () => Promise<void>;
  loading: boolean;
  resolvedTheme: 'light' | 'dark';
}

// Valor inicial para o tema resolvido
const initialResolvedTheme = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const SystemSettingsContext = createContext<SystemSettingsContextProps>({
  systemSettings: defaultSystemSettings,
  refreshSystemSettings: async () => {},
  loading: true,
  resolvedTheme: initialResolvedTheme
});

// Hook para acessar o contexto
export const useSystemSettings = () => useContext(SystemSettingsContext);

// Provider do contexto
export const SystemSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Função para converter cor hex para HSL
  const hexToHSL = (hex: string) => {
    // Remove o # se existir
    hex = hex.replace(/^#/, '');
    
    // Parse os componentes hex
    let r = parseInt(hex.slice(0, 2), 16) / 255;
    let g = parseInt(hex.slice(2, 4), 16) / 255;
    let b = parseInt(hex.slice(4, 6), 16) / 255;
    
    // Encontrar valores mínimo e máximo
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    // Calcular luminosidade
    let l = (max + min) / 2;
    
    let h = 0;
    let s = 0;
    
    if (max !== min) {
      // Calcular saturação
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
      
      // Calcular matiz
      if (max === r) {
        h = (g - b) / (max - min) + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / (max - min) + 2;
      } else {
        h = (r - g) / (max - min) + 4;
      }
      
      h *= 60;
    }
    
    return { h, s: s * 100, l: l * 100 };
  };

  // Função para atualizar o favicon baseado na URL do logo
  const updateFavicon = (faviconUrlValue: string | undefined | null) => {
    const url = faviconUrlValue || '';
    if (!url) {
        // Opcional: Remover favicon existente ou setar um padrão?
        // Por enquanto, não faz nada se não houver URL
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) link.href = '/favicon.ico'; // Ou remove o atributo href
        let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
        if (appleLink) appleLink.href = '/apple-touch-icon.png'; // Ou remove
        return;
    }
    
    try {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = url;
      
      let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = url;
      
    } catch (error) {
      console.error('Erro ao atualizar favicon:', error);
    }
  };

  // Função para atualizar metatags
  const updateMetaTags = (companyName: string, companySlogan: string = '') => {
    // Atualizar título
    document.title = companyName;
    
    // Formatar descrição com o slogan, se disponível
    const descriptionText = companySlogan 
      ? `${companyName} - ${companySlogan}` 
      : `${companyName} - Aplicativo para controle e gerenciamento de finanças pessoais e empresariais`;
    
    // Atualizar meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', descriptionText);
    }
    
    const metaAuthor = document.querySelector('meta[name="author"]');
    if (metaAuthor) {
      metaAuthor.setAttribute('content', companyName);
    }
    
    // Open Graph
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', companyName);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', descriptionText);
    }
    
    // Twitter Card
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', companyName);
    }
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) {
      twitterDescription.setAttribute('content', descriptionText);
    }
  };

  // Função para aplicar cores do tema (Garantindo que exista)
  const applyThemeColors = (primaryColor: string, secondaryColor: string) => {
    try {
      // Aplicar cores diretamente em formato hex (para maior compatibilidade)
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--secondary-color', secondaryColor);
      
      // Também aplicar como variáveis CSS específicas para o modo escuro/claro
      document.documentElement.style.setProperty('--primary-hex', primaryColor);
      document.documentElement.style.setProperty('--secondary-hex', secondaryColor);
      
      const primaryHSL = hexToHSL(primaryColor);
      const secondaryHSL = hexToHSL(secondaryColor);
      if (!primaryHSL || !secondaryHSL) return;
      
      // Define as variáveis HSL principais
      document.documentElement.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
      document.documentElement.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
      document.documentElement.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
      
      // Ajustar outras variáveis relacionadas
      document.documentElement.style.setProperty('--accent', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l + 10}%`);
      document.documentElement.style.setProperty('--accent-foreground', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
      
      // --- NOVO: Calcular e definir cor de hover para primário ---
      const primaryHoverLightness = primaryHSL.l > 50 ? primaryHSL.l - 8 : primaryHSL.l + 8; // Ajusta a luminosidade para hover
      // Garante que a luminosidade permaneça entre 0 e 100
      const clampedHoverLightness = Math.max(0, Math.min(100, primaryHoverLightness)); 
      document.documentElement.style.setProperty('--primary-hover', `${primaryHSL.h} ${primaryHSL.s}% ${clampedHoverLightness}%`);
      // --- FIM NOVO ---
      
      // --- FIM NOVO: Ajustar cor do texto (foreground) para contraste --- 
      let primaryForegroundColor;
      const lightnessThreshold = 55; 
      if (primaryHSL.l > lightnessThreshold) {
        primaryForegroundColor = '222.2 47.4% 11.2%'; // Texto escuro
      } else {
        primaryForegroundColor = '210 40% 98%'; // Texto claro
      }
      document.documentElement.style.setProperty('--primary-foreground', primaryForegroundColor);
      
      // --- NOVO: Calcular cor do texto para HOVER state --- 
      let primaryHoverForegroundColor;
      // Usa a luminosidade da COR DE HOVER (clampedHoverLightness) calculada anteriormente
      if (clampedHoverLightness > lightnessThreshold) {
         // Fundo hover claro -> Texto hover escuro
        primaryHoverForegroundColor = '222.2 47.4% 11.2%';
      } else {
        // Fundo hover escuro -> Texto hover claro
        primaryHoverForegroundColor = '210 40% 98%';
      }
      document.documentElement.style.setProperty('--primary-hover-foreground', primaryHoverForegroundColor);
      // --- FIM NOVO ---
      
      console.log('Variáveis CSS HSL aplicadas com sucesso');
    } catch (error) {
      console.error('Erro ao aplicar cores do tema:', error);
    }
  };
  
  // Função para cachear as configurações no localStorage (RESTAURADA)
  const cacheSettings = (settings: SystemSettings) => {
    try {
      localStorage.setItem(SYSTEM_SETTINGS_CACHE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Erro ao cachear configurações:', error);
    }
  };

  // Memoizar refreshSystemSettings com useCallback para estabilizar sua referência
  const refreshSystemSettings = useCallback(async () => {
    console.log('Buscando configurações do sistema no Supabase (refresh)...');
    setLoading(true); // Indicar loading durante o refresh
    try {
      const { data, error, status } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .eq('id', 1)
        .single();

      let newSettings = defaultSystemSettings;
      if (error && status !== 406) {
        console.error('Erro ao buscar configurações do sistema (refresh):', error);
      } else if (data) {
        console.log('Configurações do sistema carregadas (refresh):', data);
        newSettings = { ...defaultSystemSettings, ...data }; 
      } else {
        console.log('Nenhuma configuração encontrada no banco (refresh), usando padrões.');
      }
      
      setSystemSettings(newSettings);
      applyThemeColors(newSettings.primary_color, newSettings.secondary_color);
      updateFavicon(newSettings.favicon_url);
      updateMetaTags(newSettings.company_name, newSettings.company_slogan);
      cacheSettings(newSettings);

    } catch (error) {
      console.error('Erro inesperado ao buscar configurações (refresh):', error);
       // Em caso de erro, reverter para padrões e aplicá-los
      setSystemSettings(defaultSystemSettings);
      applyThemeColors(defaultSystemSettings.primary_color, defaultSystemSettings.secondary_color);
      updateFavicon(defaultSystemSettings.favicon_url);
      updateMetaTags(defaultSystemSettings.company_name, defaultSystemSettings.company_slogan);
      cacheSettings(defaultSystemSettings);
    } finally {
       setLoading(false); // Finaliza o loading do refresh
    }
  }, []); // Sem dependências, pois usa apenas funções externas e setSystemSettings
  
  // Efeito para carregar configurações iniciais (modificado para chamar updateFavicon com favicon_url)
  useEffect(() => {
    const loadInitialSettings = async () => {
      setLoading(true);
      console.log('Carregando configurações iniciais...');
      const cachedSettings = localStorage.getItem(SYSTEM_SETTINGS_CACHE_KEY);

      if (cachedSettings) {
        try {
          const parsedSettings = JSON.parse(cachedSettings);
          const completeSettings = { ...defaultSystemSettings, ...parsedSettings };
          setSystemSettings(completeSettings);
          applyThemeColors(completeSettings.primary_color, completeSettings.secondary_color);
          updateFavicon(completeSettings.favicon_url); 
          updateMetaTags(completeSettings.company_name, completeSettings.company_slogan);
          console.log('Configurações carregadas do cache localStorage.');
          setLoading(false);
          // Opcional: buscar silenciosamente no background
          // refreshSystemSettings(); 
        } catch (error) {
          console.error('Erro ao parsear configurações do cache, buscando no banco.', error);
          localStorage.removeItem(SYSTEM_SETTINGS_CACHE_KEY);
          await refreshSystemSettings(); // Chama a versão memoizada
          // setLoading já é tratado dentro de refreshSystemSettings agora
        }
      } else {
        console.log('Nenhum cache encontrado, buscando configurações no banco.');
        await refreshSystemSettings(); // Chama a versão memoizada
         // setLoading já é tratado dentro de refreshSystemSettings agora
      }
    };

    loadInitialSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependência de refreshSystemSettings removida pois está memoizada

  // --- CALCULAR TEMA RESOLVIDO --- 
  const resolvedTheme = useMemo(() => {
      const currentTheme = theme === 'system' ? 
          (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
          : theme;
      // Garante que retorne 'light' ou 'dark'
      return currentTheme === 'dark' ? 'dark' : 'light'; 
  }, [theme]);
  // --------------------------------------------------

  // --- Criar o objeto de valor MEMOIZADO para o provider --- 
  const providerValue = useMemo(() => ({
    systemSettings, 
    refreshSystemSettings, 
    loading, 
    resolvedTheme
  }), [systemSettings, refreshSystemSettings, loading, resolvedTheme]);

  return (
    <SystemSettingsContext.Provider value={providerValue}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export default SystemSettingsContext; 