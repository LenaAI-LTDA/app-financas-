import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, captchaToken?: string) => Promise<{ error: any | null, data: any | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<{ error: any | null }>;
  updatePassword: (password: string) => Promise<{ error: any | null }>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load initial session
  useEffect(() => {
    const loadSession = async () => {
      try {
        setLoading(true);
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          console.log('Session loaded successfully:', currentSession.user?.email);
          
          // Verificar se a URL atual já é uma rota autenticada
          const currentPath = window.location.pathname;
          // Se estiver na raiz ou em rotas de auth (E NÃO na /auth/update-password), redireciona para dashboard
          if ((currentPath === '/' || currentPath.startsWith('/auth')) && currentPath !== '/auth/update-password') {
            navigate('/dashboard');
          }
          // Caso contrário, mantém na rota atual (categorias, transações, ou /auth/update-password)
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [navigate]);

  // Set up auth state change listener
  useEffect(() => {
    // Set up auth state listener FIRST to prevent missed events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth event:', event);
        
        // Only synchronous state updates here
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle different auth events
        if (event === 'SIGNED_IN') {
          // No event 'SIGNED_IN', vamos verificar se a URL atual é uma rota não autenticada
          const currentPath = window.location.pathname;
          // Apenas redirecionar se estiver na raiz ou em rotas de auth, E NÃO na página de update-password
          if ((currentPath === '/' || currentPath.startsWith('/auth')) && currentPath !== '/auth/update-password') {
            setTimeout(() => {
              navigate('/dashboard');
            }, 0);
          }
          // Caso contrário, mantém na rota atual (ou na /auth/update-password se for o caso)
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            navigate('/auth/login');
          }, 0);
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('Password recovery event detected, redirecting to update password page.');
          setTimeout(() => {
            navigate('/auth/update-password');
          }, 0);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Sign in function
  const signIn = async (email: string, password: string, captchaToken?: string) => {
    try {
      setLoading(true);

      const options: { captchaToken?: string } = {};
      if (import.meta.env.VITE_CAPTCHA_ENABLED === 'true' && captchaToken) {
        options.captchaToken = captchaToken;
      }

      const { data, error } = await supabase.auth.signInWithPassword(
        { email, password },
        Object.keys(options).length > 0 ? options : undefined // Passa options apenas se houver captchaToken
      );

      if (error) {
        console.error('Error signing in:', error);
        return { error };
      }

      // Não redirecionar aqui, o onAuthStateChange cuidará disso
      // navigate('/dashboard'); 
      return { error: null };
    } catch (error) {
      console.error('Exception signing in:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, captchaToken?: string) => {
    try {
      setLoading(true);

      const options: { captchaToken?: string } = {};
      if (import.meta.env.VITE_CAPTCHA_ENABLED === 'true' && captchaToken) {
        options.captchaToken = captchaToken;
      }

      const { data, error } = await supabase.auth.signUp(
        { email, password },
        Object.keys(options).length > 0 ? options : undefined // Passa options apenas se houver captchaToken
      );

      if (error) {
        return { error, data: null };
      }

      // O tratamento pós-signup já existe (navegação ou console.log)
      if (data.session) {
          // O onAuthStateChange já redireciona, remover daqui
          // navigate('/dashboard');
      } else {
          console.log('Account created successfully. Please check your email to confirm registration.');
          // O onAuthStateChange cuidará da navegação se necessário, ou o fluxo normal de confirmação
          // navigate('/auth/login'); // Remover talvez? Verificar fluxo de confirmação de email
      }

      return { error: null, data };
    } catch (error) {
      return { error, data: null };
    } finally {
      setLoading(false);
    }
  };

  // Sign out function - improved implementation
  const signOut = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Error signing out:', error);
        return;
      }

      // Clear local state
      setUser(null);
      setSession(null);
      
      // Navigate to login page
      navigate('/auth/login');
    } catch (error) {
      console.error('Exception signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (email: string, captchaToken?: string) => {
    try {
      setLoading(true);

      const options: { redirectTo: string; captchaToken?: string } = {
        redirectTo: `${window.location.origin}/auth/update-password`,
      };

      if (import.meta.env.VITE_CAPTCHA_ENABLED === 'true' && captchaToken) {
        options.captchaToken = captchaToken;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, options);

      if (error) {
        console.error('Error requesting password reset:', error);
        return { error };
      }

      console.log('Password reset email sent to:', email);
      return { error: null };
    } catch (error) {
      console.error('Exception requesting password reset:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Update password function
  const updatePassword = async (password: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        console.error('Error updating password:', error);
        return { error };
      }

      console.log('Password updated successfully');
      return { error: null };
    } catch (error) {
      console.error('Exception updating password:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Refresh session function
  const refreshSession = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('Error refreshing session:', error);
        return false;
      }
      
      // Update local state with refreshed session
      setSession(data.session);
      setUser(data.session.user);
      
      console.log('Session refreshed successfully');
      return true;
    } catch (error) {
      console.error('Exception refreshing session:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
