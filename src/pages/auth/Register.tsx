import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Lock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import AuthLayout from '@/components/layout/AuthLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import TurnstileWidget from '@/components/TurnstileWidget';

const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register = () => {
  const { signUp } = useAuth();
  const { systemSettings } = useSystemSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);

  const isCaptchaEnabled = import.meta.env.VITE_CAPTCHA_ENABLED === 'true';

  const companyName = systemSettings.company_name || 'Sistema Financeiro';
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    if (isCaptchaEnabled && !captchaToken) {
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
      console.log(`Checking pre-registration for email: ${values.email}`);
      const { data: existingUserData, error: checkError } = await supabase
        .from('usuarios')
        .select('id, status')
        .eq('email', values.email)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking user in usuarios table:', checkError);
        toast({
          variant: "destructive",
          title: "Erro ao verificar permissão",
          description: "Não foi possível verificar se seu e-mail está autorizado.",
        });
        setIsLoading(false);
        return;
      }

      if (!existingUserData || existingUserData.status !== 'ativo') {
        const reason = !existingUserData ? "não encontrado" : `encontrado com status ${existingUserData.status}`;
        console.warn(`Signup blocked for ${values.email}. Reason: ${reason}`);
        toast({
          variant: "destructive",
          title: "Cadastro não permitido",
          description: "Você não pode ser cadastrado, pois precisa estar cadastrado previamente via WhatsApp.",
        });
        setIsLoading(false);
        return;
      }
      
      const numericUserId = existingUserData.id;
      console.log(`Email ${values.email} found and active (ID: ${numericUserId}). Proceeding with signup.`);

      const { error: signUpError, data: signUpData } = await signUp(values.email, values.password, captchaToken ?? undefined);
      
      if (signUpError) {
        let errorTitle = "Erro ao criar conta";
        let errorMessage = signUpError.message || "Ocorreu um problema ao criar sua conta.";

        if (signUpError.message.includes("User already registered")) {
           errorMessage = "Este e-mail já possui uma conta de autenticação. Tente fazer login.";
           errorTitle = "E-mail já registrado";
        } else if (signUpError.message.includes("Password should be at least 6 characters")) {
            errorMessage = "Sua senha precisa ter no mínimo 6 caracteres.";
            errorTitle = "Senha muito curta";
        } else if (signUpError.message.toLowerCase().includes("captcha verification failed")) {
            errorTitle = "Falha na Verificação";
            errorMessage = "A verificação Captcha falhou. Tente novamente.";
            setCaptchaToken(null);
            setCaptchaError(true);
        }
        
        toast({
          variant: "destructive",
          title: errorTitle,
          description: errorMessage,
        });
        setIsLoading(false);
        return;
      }
      
      if (signUpData?.user?.id) {
        const authUserId = signUpData.user.id;
        console.log(`Supabase Auth user created (ID: ${authUserId}). Updating profile in usuarios table (ID: ${numericUserId}).`);

        const { error: profileUpdateError } = await supabase
          .from('usuarios')
          .update({
            nome: values.name,
            auth_user: authUserId,
            aceite_termos: true,
            data_aceite_termos: new Date().toISOString(),
            has_password: true,
            ultima_atualizacao: new Date().toISOString()
          })
          .eq('id', numericUserId);
        
        if (profileUpdateError) {
          console.error('Error updating user profile:', profileUpdateError);
          toast({
            variant: "destructive",
            title: "Erro ao finalizar cadastro",
            description: "Sua conta foi criada, mas houve um problema ao atualizar seus dados. Entre em contato com o suporte.",
          });
        } else {
          console.log(`User profile updated successfully for usuarios ID: ${numericUserId}`);
          toast({
            title: "Conta criada com sucesso!",
            description: `Seja bem-vindo ao ${companyName}. Você já pode fazer login.`,
          });
          navigate('/auth/login');
        }
      } else {
        console.error('Signup successful but no user data returned.');
        toast({
          variant: "destructive",
          title: "Erro inesperado no cadastro",
          description: "A conta foi criada, mas não conseguimos obter os dados. Tente fazer login.",
        });
        navigate('/auth/login');
      }
    } catch (error) {
      console.error('Unexpected error during registration process:', error);
      toast({
        variant: "destructive",
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado durante o cadastro. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
    }
  };

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(false);
    console.log('Captcha Verified (Register)', token);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError(true);
    console.error('Captcha Error (Register)');
    toast({
        variant: "destructive",
        title: "Erro no Captcha",
        description: "Não foi possível verificar o Captcha. Tente novamente.",
    });
  }, [toast]);

  const handleCaptchaExpire = useCallback(() => {
      setCaptchaToken(null);
      console.log('Captcha Expired (Register)');
  }, []);

  return (
    <AuthLayout 
      title="Criar conta"
      description={`Cadastre-se para começar a usar o ${companyName}`}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Já possui uma conta?{' '}
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Faça login
          </Link>
        </p>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Seu nome completo"
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">📱</span>
                    <Input
                      type="tel"
                      placeholder="(00) 00000-0000"
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
              </FormItem>
            )}
          />

          <TurnstileWidget
            onVerify={handleCaptchaVerify}
            onError={handleCaptchaError}
            onExpire={handleCaptchaExpire}
          />

          {isCaptchaEnabled && captchaError && (
            <p className="text-sm font-medium text-destructive">Por favor, resolva o Captcha.</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Criar conta
          </Button>
        </form>
      </Form>
    </AuthLayout>
  );
};

export default Register;
