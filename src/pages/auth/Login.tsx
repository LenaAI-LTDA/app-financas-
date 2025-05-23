import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import AuthLayout from '@/components/layout/AuthLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TurnstileWidget from '@/components/TurnstileWidget';

const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { signIn } = useAuth();
  const { systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  
  const companyName = systemSettings.company_name || 'Sistema Financeiro';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    if (import.meta.env.VITE_CAPTCHA_ENABLED === 'true' && !captchaToken) {
        toast({
            variant: "destructive",
            title: "Verificação necessária",
            description: "Por favor, complete a verificação Captcha.",
        });
        setCaptchaError(true);
        return;
    }
    setCaptchaError(false);

    setIsLoading(true);
    try {
      const { error } = await signIn(values.email, values.password, captchaToken ?? undefined);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao fazer login",
          description: error.message || "Verifique seu e-mail e senha.",
        });
      } else {
        toast({ title: "Login realizado com sucesso!" });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: error.message || "Ocorreu um problema durante o login.",
      });
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
    }
  };

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(false);
    console.log('Captcha Verified (Login)', token);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError(true);
    console.error('Captcha Error (Login)');
    toast({
        variant: "destructive",
        title: "Erro no Captcha",
        description: "Não foi possível verificar o Captcha. Tente novamente.",
    });
  }, [toast]);

  const handleCaptchaExpire = useCallback(() => {
      setCaptchaToken(null);
      console.log('Captcha Expired (Login)');
  }, []);

  return (
    <AuthLayout 
      title="Entrar"
      description="Faça login para acessar sua conta"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Não possui uma conta?{' '}
          <Link to="/auth/register" className="auth-custom-link text-primary hover:underline font-medium">
            Cadastre-se
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Esconder senha" : "Mostrar senha"}
                    </span>
                  </Button>
                </div>
                <FormMessage />
                <div className="text-sm text-right">
                  <Link to="/auth/reset-password" className="auth-custom-link text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
              </FormItem>
            )}
          />

          <TurnstileWidget
              onVerify={handleCaptchaVerify}
              onError={handleCaptchaError}
              onExpire={handleCaptchaExpire}
          />
          {import.meta.env.VITE_CAPTCHA_ENABLED && captchaError && (
              <p className="text-sm font-medium text-destructive">Por favor, resolva o Captcha.</p>
          )}

          <Button type="submit" className="auth-custom-button w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
};

export default Login;
