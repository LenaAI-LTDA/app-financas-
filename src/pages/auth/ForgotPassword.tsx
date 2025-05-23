import { useState, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/layout/AuthLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import TurnstileWidget from '@/components/TurnstileWidget';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "E-mail inválido." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { systemSettings } = useSystemSettings();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  
  const companyName = systemSettings.company_name || 'Sistema Financeiro';

  const isCaptchaEnabled = import.meta.env.VITE_CAPTCHA_ENABLED === 'true';

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
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
    setEmailSent(false);
    try {
      const { error } = await resetPassword(values.email, captchaToken ?? undefined);
      if (error) {
          let errorTitle = "Erro ao enviar e-mail";
          let errorMessage = error.message || "Não foi possível iniciar a recuperação de senha.";
          if (error.message.toLowerCase().includes("captcha verification failed")) {
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
      } else {
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada para o link de recuperação.",
        });
        setEmailSent(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: error.message || "Ocorreu um problema.",
      });
    } finally {
      setIsLoading(false);
      setCaptchaToken(null);
    }
  };

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaError(false);
    console.log('Captcha Verified (Forgot Password)', token);
  }, []);

  const handleCaptchaError = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaError(true);
    console.error('Captcha Error (Forgot Password)');
    toast({
        variant: "destructive",
        title: "Erro no Captcha",
        description: "Não foi possível verificar o Captcha. Tente novamente.",
    });
  }, [toast]);

  const handleCaptchaExpire = useCallback(() => {
      setCaptchaToken(null);
      console.log('Captcha Expired (Forgot Password)');
  }, []);

  return (
    <AuthLayout
      title="Recuperar Senha"
      description="Digite seu e-mail para receber o link de recuperação."
    >
      {!emailSent ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail de Cadastro</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
                  </FormControl>
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
              {isLoading ? "Enviando..." : "Enviar E-mail de Recuperação"}
            </Button>
          </form>
        </Form>
      ) : (
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">✅ E-mail Enviado!</p>
          <p className="text-muted-foreground">
            Verifique sua caixa de entrada (e spam) pelo link para redefinir sua senha.
          </p>
        </div>
      )}
      <div className="mt-4 text-center text-sm">
        Lembrou a senha?{" "}
        <Link to="/auth/login" className="underline">
          Fazer Login
        </Link>
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword; 