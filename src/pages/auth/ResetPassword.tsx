
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/layout/AuthLayout';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const resetSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
});

type ResetFormValues = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(values.email);
      
      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao redefinir senha",
          description: error.message || "Não foi possível enviar o e-mail de redefinição.",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "E-mail enviado com sucesso!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Redefinir senha"
      description="Digite seu e-mail para receber as instruções de recuperação"
      footer={
        <p className="text-center text-sm text-muted-foreground">
          Lembrou sua senha?{' '}
          <Link to="/auth/login" className="text-primary hover:underline font-medium">
            Voltar para o login
          </Link>
        </p>
      }
    >
      {emailSent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Mail className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold">E-mail enviado</h3>
          <p className="text-muted-foreground">
            Enviamos um link para redefinir sua senha para o e-mail informado.
            Verifique sua caixa de entrada e também a pasta de spam.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/login">Voltar para o login</Link>
          </Button>
        </div>
      ) : (
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

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar instruções
            </Button>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
