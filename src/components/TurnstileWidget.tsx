import React, { useEffect, useRef } from 'react';
import { useTheme } from "next-themes";

// Definir a interface global do Turnstile para o TypeScript
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string | undefined;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  // Outras opções podem ser adicionadas aqui
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const TurnstileWidget = ({ onVerify, onError, onExpire }: TurnstileWidgetProps) => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const isCaptchaEnabled = import.meta.env.VITE_CAPTCHA_ENABLED === 'true';
  const siteKey = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!isCaptchaEnabled || !containerRef.current || !siteKey || typeof window === 'undefined' || !window.turnstile) {
      return;
    }

    if (widgetIdRef.current) {
        console.log('Turnstile widget already rendered with ID:', widgetIdRef.current);
        return;
    }

    console.log('Attempting to render Turnstile widget...');

    const options: TurnstileOptions = {
      sitekey: siteKey,
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      language: 'pt-BR',
      callback: (token: string) => {
        console.log('Turnstile callback: Token received');
        onVerify(token);
      },
      'error-callback': () => {
        console.error('Turnstile error-callback triggered.');
        if (onError) onError();
      },
      'expired-callback': () => {
        console.log('Turnstile expired-callback triggered.');
        widgetIdRef.current = null; 
        if (onExpire) onExpire();
      },
    };

    try {
        const renderedWidgetId = window.turnstile.render(containerRef.current, options);
        if (renderedWidgetId) {
            console.log('Turnstile widget rendered successfully with ID:', renderedWidgetId);
            widgetIdRef.current = renderedWidgetId;
        } else {
            console.error("Falha ao renderizar o widget Turnstile (window.turnstile.render retornou undefined).");
            if (onError) onError();
        }
    } catch (renderError) {
        console.error("Erro durante window.turnstile.render:", renderError);
        if (onError) onError();
    }

    return () => {
        const idToRemove = widgetIdRef.current;
        if (idToRemove && typeof window !== 'undefined' && window.turnstile) {
            console.log(`Cleaning up Turnstile widget with ID: ${idToRemove}`);
            try {
                window.turnstile.remove(idToRemove);
                widgetIdRef.current = null;
            } catch (removeError) {
                console.warn(`Falha ao remover widget Turnstile (ID: ${idToRemove}):`, removeError);
            }
        } else {
             console.log('Turnstile cleanup: No widget ID to remove or window.turnstile not available.');
        }
    };
  }, [resolvedTheme, siteKey, isCaptchaEnabled, onVerify, onError, onExpire]);

  if (!isCaptchaEnabled) {
    return null;
  }

  if (!siteKey) {
    console.error('VITE_CLOUDFLARE_TURNSTILE_SITE_KEY não está definida no .env');
    return <div>Erro de configuração do Captcha. Verifique as variáveis de ambiente.</div>;
  }

  return <div ref={containerRef} className="my-4 flex justify-center" style={{ minHeight: '65px', minWidth: '300px' }}></div>;
};

export default TurnstileWidget; 