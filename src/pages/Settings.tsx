import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  User, 
  Bell, 
  Shield, 
  LogOut, 
  RefreshCw,
  Building
} from 'lucide-react';
import { useSystemSettings } from '@/contexts/SystemSettingsContext';
import { ColorPicker } from '@/components/ui/color-picker';
import { Skeleton } from '@/components/ui/skeleton';

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
  logo_url_header_light: string;
  logo_url_header_dark: string;
  logo_url_login_light: string;
  logo_url_login_dark: string;
  show_header_logo: boolean;
  show_header_name: boolean;
  show_index_name: boolean;
  favicon_url: string;
  created_at?: string;
  updated_at?: string;
}

// Tipo das configurações do usuário (apenas preferências)
interface UserPreferences {
  id?: number;
  usuario_id: number;
  notification_email: boolean;
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
  logo_url_header_light: '',
  logo_url_header_dark: '',
  logo_url_login_light: '',
  logo_url_login_dark: '',
  show_header_logo: true,
  show_header_name: true,
  show_index_name: true,
  favicon_url: '',
};

// Valores padrão para preferências do usuário
const defaultUserPreferences: UserPreferences = {
  usuario_id: 0,
  notification_email: true
};

// Schema de validação do formulário de configurações de marca/white label
const brandingFormSchema = z.object({
  company_name: z.string().min(1, 'Nome da empresa é obrigatório'),
  company_slogan: z.string().optional().or(z.string().max(100, 'Slogan deve ter no máximo 100 caracteres')),
  logo_url_header: z.string().url('URL inválida para logo do cabeçalho').or(z.string().length(0)).optional(),
  logo_url_login: z.string().url('URL inválida para logo do login').or(z.string().length(0)).optional(),
  logo_url_header_light: z.string().url('URL inválida').or(z.string().length(0)).optional(),
  logo_url_header_dark: z.string().url('URL inválida').or(z.string().length(0)).optional(),
  logo_url_login_light: z.string().url('URL inválida').or(z.string().length(0)).optional(),
  logo_url_login_dark: z.string().url('URL inválida').or(z.string().length(0)).optional(),
  show_header_logo: z.boolean(),
  show_header_name: z.boolean(),
  show_index_name: z.boolean(),
  favicon_url: z.string().url('URL inválida para favicon').or(z.string().length(0)).optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor primária inválida (formato HEX)').or(z.string().length(0)),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor secundária inválida (formato HEX)').or(z.string().length(0)),
  white_label_active: z.boolean()
});

// Schema de validação do formulário de configurações de notificações (ATUALIZADO)
const notificationsFormSchema = z.object({
  notification_email: z.boolean(), // Campo global existente
  lembrete_habilitado: z.boolean(), // Novo: Lembretes de vencimento
  lembrete_dias_antecedencia: z.coerce // Usa coerce para converter string/numero do input
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Deve ser 0 ou maior")
    .max(30, "Máximo de 30 dias") // Limite razoável?
    .optional()
    .default(1), // Default se habilitado
});

// Schema de validação do formulário de configurações de conta
const accountFormSchema = z.object({
  email: z.string().email('Email inválido'),
  current_password: z.string().min(1, 'Senha atual é obrigatória'),
  new_password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').optional(),
  confirm_password: z.string().optional()
}).refine(data => {
  if (data.new_password && data.new_password !== data.confirm_password) {
    return false;
  }
  return true;
}, {
  message: 'Senhas não coincidem',
  path: ['confirm_password']
});

// Cores pré-definidas
const predefinedColors = [
  { name: 'Roxo', primary: '#7c4dff', secondary: '#6a3de8' },
  { name: 'Azul', primary: '#2563eb', secondary: '#1d4ed8' },
  { name: 'Verde', primary: '#10b981', secondary: '#059669' },
  { name: 'Laranja', primary: '#f97316', secondary: '#ea580c' },
  { name: 'Vermelho', primary: '#ef4444', secondary: '#dc2626' },
  { name: 'Rosa', primary: '#ec4899', secondary: '#db2777' },
  { name: 'Amarelo', primary: '#eab308', secondary: '#ca8a04' },
  { name: 'Ciano', primary: '#06b6d4', secondary: '#0891b2' }
];

const Settings = () => {
  const { user, updatePassword, signOut } = useAuth();
  const { systemSettings, refreshSystemSettings, loading: systemLoading } = useSystemSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [openBrandingModal, setOpenBrandingModal] = useState(false);
  
  // Inicializar formulários
  const brandingForm = useForm<z.infer<typeof brandingFormSchema>>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      company_name: systemSettings.company_name || '',
      company_slogan: systemSettings.company_slogan || '',
      logo_url_header: systemSettings.logo_url_header || '',
      logo_url_login: systemSettings.logo_url_login || '',
      logo_url_header_light: systemSettings.logo_url_header_light || '',
      logo_url_header_dark: systemSettings.logo_url_header_dark || '',
      logo_url_login_light: systemSettings.logo_url_login_light || '',
      logo_url_login_dark: systemSettings.logo_url_login_dark || '',
      show_header_logo: systemSettings.show_header_logo ?? true,
      show_header_name: systemSettings.show_header_name ?? true,
      show_index_name: systemSettings.show_index_name ?? true,
      favicon_url: systemSettings.favicon_url || '',
      primary_color: systemSettings.primary_color || '#7c4dff',
      secondary_color: systemSettings.secondary_color || '#6a3de8',
      white_label_active: systemSettings.white_label_active || false
    },
  });
  
  // Formulário de notificações (ATUALIZADO)
  const notificationsForm = useForm<z.infer<typeof notificationsFormSchema>>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      notification_email: true, // Manter default
      lembrete_habilitado: true, // Default para lembretes
      lembrete_dias_antecedencia: 1 // Default dias
    },
  });
  
  const accountForm = useForm<z.infer<typeof accountFormSchema>>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      email: '',
      current_password: '',
      new_password: '',
      confirm_password: ''
    },
  });
  
  // Redirecionar se não estiver autenticado
  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
    } else {
      setUserEmail(user.email || '');
      accountForm.setValue('email', user.email || '');
    }
  }, [user, navigate, accountForm]);
  
  // Verificar se o usuário é admin
  useEffect(() => {
    const checkIfUserIsAdmin = async () => {
      try {
        // Obter ID numérico do usuário
        const numericUserId = await getUserNumericId();

        if (!numericUserId) {
          console.error('Não foi possível encontrar o ID numérico do usuário para verificar o status de admin.');
          setIsAdmin(false); // Define como não admin se o ID não for encontrado
          return;
        }

        // Buscar o status de admin na tabela usuarios
        const { data, error } = await supabase
          .from('usuarios')
          .select('is_admin')
          .eq('id', numericUserId)
          .single();

        if (error) {
          console.error('Erro ao buscar status de admin:', error);
          setIsAdmin(false); // Assume não admin em caso de erro
        } else if (data) {
          setIsAdmin(data.is_admin); // Define o estado com base no valor do banco
          console.log('Status de admin carregado:', { userId: numericUserId, isAdmin: data.is_admin });
        } else {
          console.warn('Nenhum registro encontrado para o usuário na tabela usuarios:', numericUserId);
          setIsAdmin(false); // Define como não admin se o usuário não for encontrado
        }

      } catch (error) {
        console.error('Erro inesperado ao verificar se o usuário é admin:', error);
        setIsAdmin(false); // Assume não admin em caso de erro inesperado
      }
    };

    if (user) {
      checkIfUserIsAdmin();
    } else {
      setIsAdmin(false); // Garante que não seja admin se não houver usuário logado
    }
  }, [user]); // Dependência apenas do usuário
  
  // Atualizar o formulário quando as configurações do sistema forem carregadas
  useEffect(() => {
    if (!systemLoading) {
      brandingForm.reset({
        company_name: systemSettings.company_name || '',
        company_slogan: systemSettings.company_slogan || '',
        logo_url_header: systemSettings.logo_url_header || '',
        logo_url_login: systemSettings.logo_url_login || '',
        logo_url_header_light: systemSettings.logo_url_header_light || '',
        logo_url_header_dark: systemSettings.logo_url_header_dark || '',
        logo_url_login_light: systemSettings.logo_url_login_light || '',
        logo_url_login_dark: systemSettings.logo_url_login_dark || '',
        show_header_logo: systemSettings.show_header_logo ?? true,
        show_header_name: systemSettings.show_header_name ?? true,
        show_index_name: systemSettings.show_index_name ?? true,
        favicon_url: systemSettings.favicon_url || '',
        primary_color: systemSettings.primary_color || '#7c4dff',
        secondary_color: systemSettings.secondary_color || '#6a3de8',
        white_label_active: systemSettings.white_label_active || false
      });
    }
  }, [systemSettings, systemLoading, brandingForm]);
  
  // Carregar configurações/preferências do usuário (ATUALIZADO para buscar email_geral)
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const numericUserId = await getUserNumericId();
        if (!numericUserId) {
          console.error('ID do usuário não encontrado');
          setLoading(false);
          return;
        }

        // Buscar AMBAS as preferências da tabela preferencias_notificacao
        const { data: prefsData, error: prefsError } = await supabase
          .from('preferencias_notificacao')
          .select('tipo_notificacao, habilitado, dias_antecedencia')
          .eq('usuario_id', numericUserId)
          .in('tipo_notificacao', ['email_geral', 'lembrete_vencimento']); // Busca os dois tipos

        if (prefsError) {
          console.error('Erro ao carregar preferências de notificação:', prefsError);
          // Usar defaults se a busca falhar
          notificationsForm.setValue('notification_email', true);
          notificationsForm.setValue('lembrete_habilitado', true);
          notificationsForm.setValue('lembrete_dias_antecedencia', 1);
        } else {
          // Encontrar a preferência de email geral (ou usar default)
          const emailPref = prefsData?.find(p => p.tipo_notificacao === 'email_geral');
          notificationsForm.setValue('notification_email', emailPref?.habilitado ?? true);

          // Encontrar a preferência de lembrete (ou usar default)
          const lembretePref = prefsData?.find(p => p.tipo_notificacao === 'lembrete_vencimento');
          notificationsForm.setValue('lembrete_habilitado', lembretePref?.habilitado ?? true);
          notificationsForm.setValue('lembrete_dias_antecedencia', lembretePref?.dias_antecedencia ?? 1);
        }

      } catch (error) {
        console.error('Erro inesperado ao carregar preferências do usuário:', error);
        toast({ variant: "destructive", title: "Erro ao carregar suas preferências" });
        // Usar defaults em caso de erro inesperado
        notificationsForm.reset(); 
      } finally {
        setLoading(false);
      }
    };

    fetchUserSettings();
  }, [user, notificationsForm]); // Dependências mantidas
  
  // Adicionar console.log para depurar o estado de isAdmin
  useEffect(() => {
    console.log('Estado atual de isAdmin:', isAdmin);
  }, [isAdmin]);
  
  // Função para salvar configurações de branding
  const saveBrandingSettings = async (values: z.infer<typeof brandingFormSchema>) => {
    try {
      setSaving(true);
      
      // Primeiro, verificar se já existem configurações
      const { data: existingConfig, error: fetchError } = await supabase
        .from('configuracoes_sistema')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Erro ao verificar configurações existentes:", fetchError);
        toast({
          title: "Erro ao salvar configurações",
          description: "Ocorreu um erro ao verificar as configurações existentes.",
          variant: "destructive"
        });
        return;
      }
      
      let saveError;
      
      // Se existir configuração, atualizar
      if (existingConfig && existingConfig.length > 0) {
        const configId = existingConfig[0].id;
        
        const dataToSave = {
          company_name: values.company_name,
          company_slogan: values.company_slogan,
          logo_url_header: values.logo_url_header,
          logo_url_login: values.logo_url_login,
          logo_url_header_light: values.logo_url_header_light,
          logo_url_header_dark: values.logo_url_header_dark,
          logo_url_login_light: values.logo_url_login_light,
          logo_url_login_dark: values.logo_url_login_dark,
          show_header_logo: values.show_header_logo,
          show_header_name: values.show_header_name,
          show_index_name: values.show_index_name,
          favicon_url: values.favicon_url,
          primary_color: values.primary_color,
          secondary_color: values.secondary_color,
          white_label_active: values.white_label_active,
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('configuracoes_sistema')
          .update(dataToSave)
          .eq('id', configId);
        
        saveError = error;
      } else {
        // Se não existir, inserir nova configuração
        const { error } = await supabase
          .from('configuracoes_sistema')
          .insert({
            company_name: values.company_name,
            company_slogan: values.company_slogan,
            logo_url_header: values.logo_url_header,
            logo_url_login: values.logo_url_login,
            logo_url_header_light: values.logo_url_header_light,
            logo_url_header_dark: values.logo_url_header_dark,
            logo_url_login_light: values.logo_url_login_light,
            logo_url_login_dark: values.logo_url_login_dark,
            show_header_logo: values.show_header_logo,
            show_header_name: values.show_header_name,
            show_index_name: values.show_index_name,
            favicon_url: values.favicon_url,
            primary_color: values.primary_color,
            secondary_color: values.secondary_color,
            white_label_active: values.white_label_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        saveError = error;
      }

      if (saveError) {
        console.error("Erro ao salvar configurações:", saveError);
        toast({
          title: "Erro ao salvar configurações",
          description: "Não foi possível salvar as configurações. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar o contexto de configurações
      await refreshSystemSettings();
      
      toast({
        title: "Configurações salvas",
        description: "As configurações de branding foram salvas com sucesso.",
      });
      
      // Fechar dialog
      setOpenBrandingModal(false);
    } catch (error) {
      console.error("Erro ao salvar configurações de branding:", error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Função para salvar preferências de notificação (ATUALIZADO para salvar email_geral)
  const saveNotificationSettings = async (values: z.infer<typeof notificationsFormSchema>) => {
    setSaving(true);
    try {
      const numericUserId = await getUserNumericId();
      if (!numericUserId) throw new Error('ID do usuário não encontrado');

      // Dados a serem salvos (upsert) na tabela preferencias_notificacao
      const preferencesToUpsert = [
        {
          usuario_id: numericUserId,
          tipo_notificacao: 'email_geral',
          habilitado: values.notification_email, // Mapeia campo do form para habilitado
          dias_antecedencia: null, // Não aplicável para email geral
          updated_at: new Date().toISOString()
        },
        {
          usuario_id: numericUserId,
          tipo_notificacao: 'lembrete_vencimento',
          habilitado: values.lembrete_habilitado,
          dias_antecedencia: values.lembrete_dias_antecedencia,
          updated_at: new Date().toISOString()
        }
      ];

      // Fazer upsert das preferências
      const { error: upsertError } = await supabase
        .from('preferencias_notificacao')
        .upsert(preferencesToUpsert, {
            onConflict: 'usuario_id, tipo_notificacao' // Chave única composta
        });

      if (upsertError) throw upsertError;

      toast({
        title: "Preferências salvas",
        description: "Suas preferências de notificação foram atualizadas.",
      });

    } catch (error: any) {
      console.error('Erro ao salvar preferências de notificação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar suas preferências.",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Função para atualizar a conta (email e senha)
  const updateAccount = async (values: z.infer<typeof accountFormSchema>) => {
    try {
      setSaving(true);
      
      // Se houver nova senha, atualizá-la
      if (values.new_password) {
        const { error } = await updatePassword(values.new_password);
        
        if (error) {
          throw new Error('Falha ao atualizar senha');
        }
        
        toast({
          title: "Senha atualizada",
          description: "Sua senha foi atualizada com sucesso.",
        });
      }
      
      // Limpar os campos de senha
      accountForm.setValue('current_password', '');
      accountForm.setValue('new_password', '');
      accountForm.setValue('confirm_password', '');
      
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar conta",
        description: "Não foi possível atualizar sua conta.",
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Função para desconectar a conta
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate('/auth/login');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast({
        variant: "destructive",
        title: "Erro ao desconectar",
        description: "Ocorreu um erro ao tentar desconectar.",
      });
    }
  };
  
  // Função para aplicar cor pré-definida
  const applyPredefinedColor = (colorSet: { primary: string, secondary: string }) => {
    brandingForm.setValue('primary_color', colorSet.primary);
    brandingForm.setValue('secondary_color', colorSet.secondary);
  };
  
  // Função para aplicar cores do tema personalizadas
  const applyThemeColors = (primaryColor: string, secondaryColor: string) => {
    // Converter hex para HSL para aplicar variáveis CSS
    const primaryHSL = hexToHSL(primaryColor);
    const secondaryHSL = hexToHSL(secondaryColor);
    
    if (!primaryHSL || !secondaryHSL) return;
    
    // Aplicar variáveis CSS
    document.documentElement.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    document.documentElement.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
    
    // Ajustar outras variáveis relacionadas
    document.documentElement.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
    document.documentElement.style.setProperty('--accent', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l + 20}%`);
    document.documentElement.style.setProperty('--accent-foreground', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
  };
  
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        </div>

        <Tabs defaultValue={isAdmin ? "marca" : "notificacoes"} className="space-y-4">
          {/* Allow horizontal scroll for tabs on small screens */}
          <div className="overflow-x-auto pb-1">
            <TabsList className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} w-full md:w-auto min-w-max`}> {/* Ensure min-width */} 
              {isAdmin && (
                <TabsTrigger value="marca" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline">White Label</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="notificacoes" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="conta" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Conta</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Seção de Branding - apenas para admin */}
          {isAdmin && (
            <TabsContent value="marca">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Branding e White Label</CardTitle>
                  <CardDescription>
                    Personalize a aparência da aplicação com sua marca, logotipo e cores corporativas.
                    Estas alterações afetarão toda a experiência dos usuários, incluindo telas de login, 
                    dashboard e componentes interativos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 space-y-4">
                        <div className="border rounded-md p-4 bg-card/50">
                          <h3 className="text-lg font-medium mb-2">Prévia da Personalização</h3>
                          
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Cabeçalho Principal</p>
                              <div className="flex items-center gap-2 p-3 border rounded-md bg-background min-h-[64px]">
                                {systemSettings.show_header_logo && systemSettings.logo_url_header ? (
                                  <img 
                                    src={systemSettings.logo_url_header} 
                                    alt="Logo Cabeçalho" 
                                    className="h-12 w-auto object-contain"
                                  />
                                ) : systemSettings.show_header_logo ? (
                                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">Logo</div>
                                ) : null}
                                
                                {systemSettings.show_header_name && (
                                  <span className="font-medium text-lg truncate">
                                    {systemSettings.company_name || 'Nome Empresa'}
                                  </span>
                                )}

                                {(!systemSettings.show_header_logo || !systemSettings.logo_url_header) && !systemSettings.show_header_name && (
                                  <span className="text-sm text-muted-foreground italic">Cabeçalho Vazio</span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Visualização da barra superior (logo/nome).
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Esquema de Cores</p>
                              <div className="p-3 border rounded-md bg-background space-y-2">
                                <div className="flex gap-2">
                                  <div 
                                    className="h-6 w-12 rounded"
                                    style={{ backgroundColor: systemSettings.primary_color }}
                                    title="Cor Primária"
                                  />
                                  <div 
                                    className="h-6 w-12 rounded"
                                    style={{ backgroundColor: systemSettings.secondary_color }}
                                    title="Cor Secundária"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    className="px-3 py-1 text-xs rounded text-primary-foreground"
                                    style={{ backgroundColor: systemSettings.primary_color }}
                                  >
                                    Botão principal
                                  </button>
                                  <button 
                                    className="px-3 py-1 text-xs rounded border"
                                    style={{ borderColor: systemSettings.primary_color, color: systemSettings.primary_color }}
                                  >
                                    Botão secundário
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                As cores são aplicadas em todos os componentes interativos
                              </p>
                            </div>
                          </div>
                          
                          {/* Preview da tela de login Atualizada */}
                          <div className="mt-5 border rounded-md p-4 bg-background">
                            <p className="text-sm font-medium mb-3">Tela de Login</p>
                            <div className="flex flex-col items-center p-4 rounded border max-w-sm mx-auto">
                              <div className="text-center mb-4">
                                {systemSettings.logo_url_login ? (
                                  <div className="flex justify-center mb-2">
                                    <img 
                                      src={systemSettings.logo_url_login} 
                                      alt={`${systemSettings.company_name || 'Empresa'} Logo Login`}
                                      className="h-12 max-w-[150px] w-auto object-contain" 
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex justify-center mb-2">
                                      <div className="h-12 w-12 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                                        {systemSettings.company_name
                                          ? systemSettings.company_name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase()
                                          : 'SF'}
                                      </div>
                                    </div>
                                    <h3 className="text-xl font-bold" style={{ color: systemSettings.primary_color }}>
                                      {systemSettings.company_name || 'Sistema Financeiro'}
                                    </h3>
                                  </>
                                )}
                                {systemSettings.company_slogan && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {systemSettings.company_slogan}
                                  </p>
                                )}
                              </div>
                              
                              <div className="w-full space-y-3">
                                <div className="space-y-1 text-start">
                                  <label className="text-xs font-medium">E-mail</label>
                                  <div className="w-full h-7 bg-muted rounded-sm"></div>
                                </div>
                                <div className="space-y-1 text-start">
                                  <label className="text-xs font-medium">Senha</label>
                                  <div className="w-full h-7 bg-muted rounded-sm"></div>
                                </div>
                                <button 
                                  className="w-full text-xs py-1.5 rounded text-sm text-white font-medium"
                                  style={{ backgroundColor: systemSettings.primary_color }}
                                >
                                  Entrar
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                              Simulação da tela de login com as configurações atuais.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <Form {...brandingForm}>
                        <form onSubmit={brandingForm.handleSubmit(saveBrandingSettings)} className="space-y-6">
                          <FormField
                            control={brandingForm.control}
                            name="company_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome da Empresa</FormLabel>
                                <FormControl>
                                  <Input type="text" placeholder="Sistema Financeiro" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Nome que será exibido no sistema para todos os usuários.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={brandingForm.control}
                            name="company_slogan"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Slogan da Empresa</FormLabel>
                                <FormControl>
                                  <Input type="text" placeholder="Gerencie suas finanças de forma simples" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Slogan que será exibido no sistema para todos os usuários.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Separator />
                          <h3 className="text-lg font-medium pt-2">Logotipos Principais (Fallback)</h3>
                          <p className="text-sm text-muted-foreground pb-2">
                            Estes logos serão usados caso as versões específicas para tema claro/escuro não sejam fornecidas abaixo.
                          </p>

                          <FormField
                            control={brandingForm.control}
                            name="logo_url_header"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL Cabeçalho (Fallback)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://.../logo_header.png" />
                                </FormControl>
                                <FormDescription className="space-y-2">
                                  <div>
                                    Usado no cabeçalho (área logada e home) se o logo específico do tema não existir. Altura renderizada: 48px. Largura se ajusta proporcionalmente (recomendação: ~150-200px de largura para boa visibilidade).
                                  </div>
                                  <div><strong>Recomendações Gerais:</strong> Proporção horizontal (ex: 200x60), SVG/PNG transparente.</div>
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={brandingForm.control}
                            name="logo_url_login"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL Login (Fallback)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://.../logo_login.png" />
                                </FormControl>
                                <FormDescription className="space-y-2">
                                  <div>
                                    Usado na tela de login se o logo específico do tema não existir. Altura renderizada: 64px. Largura se ajusta proporcionalmente (máximo de 200px aplicado no layout).
                                  </div>
                                  <div><strong>Recomendações Gerais:</strong> Proporção horizontal (ex: 200x60), SVG/PNG transparente.</div>
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={brandingForm.control}
                            name="favicon_url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL do Favicon</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://.../favicon.png" />
                                </FormControl>
                                <FormDescription className="space-y-2">
                                  <div>Ícone exibido na aba do navegador. Use uma URL para um arquivo .ico ou .png (recomendado: 32x32 ou 64x64 pixels).</div>
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Separator />
                          <h3 className="text-lg font-medium pt-2">Logotipos por Tema</h3>
                          <p className="text-sm text-muted-foreground pb-2">
                            Forneça URLs diferentes para os logos nos modos claro (light) e escuro (dark).
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={brandingForm.control}
                              name="logo_url_header_light"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cabeçalho (Tema Claro)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="URL logo cabeçalho tema claro..." />
                                  </FormControl>
                                  <FormDescription>Logo específico para cabeçalho no tema claro (altura 48px, largura proporcional).</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={brandingForm.control}
                              name="logo_url_header_dark"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cabeçalho (Tema Escuro)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="URL logo cabeçalho tema escuro..." />
                                  </FormControl>
                                  <FormDescription>Logo específico para cabeçalho no tema escuro (altura 48px, largura proporcional).</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={brandingForm.control}
                              name="logo_url_login_light"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Login (Tema Claro)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="URL logo login tema claro..." />
                                  </FormControl>
                                  <FormDescription>Logo específico para tela de login no tema claro (altura 64px, largura proporcional até 200px).</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={brandingForm.control}
                              name="logo_url_login_dark"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Login (Tema Escuro)</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="URL logo login tema escuro..." />
                                  </FormControl>
                                  <FormDescription>Logo específico para tela de login no tema escuro (altura 64px, largura proporcional até 200px).</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Separator />
                          <h3 className="text-lg font-medium pt-2">Opções de Exibição</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField
                              control={brandingForm.control}
                              name="show_header_logo"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Mostrar Logo</FormLabel>
                                    <FormDescription className="text-xs">
                                      Exibir imagem no cabeçalho.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={brandingForm.control}
                              name="show_header_name"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Mostrar Nome</FormLabel>
                                    <FormDescription className="text-xs">
                                      Exibir nome da empresa no cabeçalho.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={brandingForm.control}
                              name="show_index_name"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Mostrar Nome (Home)</FormLabel>
                                    <FormDescription className="text-xs">
                                      Exibir nome no cabeçalho da página inicial.
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <Separator />
                          <h3 className="text-lg font-medium pt-2">Aparência e Cores</h3>

                          <FormField
                            control={brandingForm.control}
                            name="white_label_active"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background/90">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Ativar White Label</FormLabel>
                                  <FormDescription>
                                    <div className="space-y-1">
                                      <p>
                                        Ative para aplicar suas cores e logotipo personalizados em toda a aplicação.
                                      </p>
                                      <div className="text-xs text-muted-foreground">
                                        <strong>O que será personalizado:</strong>
                                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                          <li>Telas de login e página inicial</li>
                                          <li>Cabeçalhos e menu lateral</li>
                                          <li>Cores de botões e elementos interativos</li>
                                          <li>Favicon e metatags do navegador</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <div className="flex flex-col items-end gap-1.5">
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                    <span className="text-xs font-medium" style={{ color: field.value ? 'var(--success, #16a34a)' : 'var(--muted-foreground)' }}>
                                      {field.value ? 'Ativado' : 'Desativado'}
                                    </span>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          {brandingForm.watch('white_label_active') && (
                            <>
                              <div className="mb-4">
                                <FormLabel>Cores Pré-definidas</FormLabel>
                                 {/* Adjust grid columns for responsiveness */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                  {predefinedColors.map((colorSet) => (
                                    <Button
                                      key={colorSet.name}
                                      type="button"
                                      variant="outline"
                                      className="flex flex-col items-center p-2 h-auto"
                                      onClick={() => applyPredefinedColor(colorSet)}
                                    >
                                      <div className="flex gap-1 mb-1">
                                        <div 
                                          className="h-4 w-4 rounded-full border" 
                                          style={{ backgroundColor: colorSet.primary }}
                                        />
                                        <div 
                                          className="h-4 w-4 rounded-full border" 
                                          style={{ backgroundColor: colorSet.secondary }}
                                        />
                                      </div>
                                      <span className="text-xs">{colorSet.name}</span>
                                    </Button>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Selecione uma cor pré-definida ou personalize manualmente abaixo.
                                </p>
                              </div>

                              <FormField
                                control={brandingForm.control}
                                name="primary_color"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cor Primária</FormLabel>
                                    <FormControl>
                                      <div className="flex gap-2">
                                        <Input {...field} />
                                        <ColorPicker
                                          color={field.value}
                                          onChange={(color) => field.onChange(color)}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormDescription className="space-y-2">
                                      <div>
                                        Cor principal do sistema, aplicada a botões principais, links e cabeçalhos.
                                      </div>
                                      <div>
                                        <strong>Dica:</strong> Escolha uma cor que tenha bom contraste tanto no modo claro quanto no escuro. Recomendamos cores vibrantes para melhor visibilidade.
                                      </div>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={brandingForm.control}
                                name="secondary_color"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cor Secundária</FormLabel>
                                    <FormControl>
                                      <div className="flex gap-2">
                                        <Input {...field} />
                                        <ColorPicker
                                          color={field.value}
                                          onChange={(color) => field.onChange(color)}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormDescription className="space-y-2">
                                      <div>
                                        Cor secundária para destaques e gradientes no sistema.
                                      </div>
                                      <div>
                                        <strong>Dica:</strong> Escolha uma cor complementar à cor primária para criar uma identidade visual harmoniosa.
                                      </div>
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                          
                          <Button type="submit" disabled={saving}>
                            {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                            Aplicar para todo o sistema
                          </Button>
                        </form>
                      </Form>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Seção de Notificações - preferências do usuário */}
          <TabsContent value="notificacoes">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificações</CardTitle>
                <CardDescription>
                  Configure como deseja receber notificações. Estas são suas preferências pessoais.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                ) : (
                  <Form {...notificationsForm}>
                    <form onSubmit={notificationsForm.handleSubmit(saveNotificationSettings)} className="space-y-6">
                      {/* Switch Global Existente */}
                      <FormField
                        control={notificationsForm.control}
                        name="notification_email"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Notificações Gerais por E-mail</FormLabel>
                              <FormDescription>
                                Receber e-mails sobre atividades importantes da conta e novidades.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Separator />
                      <h4 className="text-base font-medium pt-2">Lembretes de Vencimento</h4>
                      
                      {/* Novo Switch para Lembretes */}
                      <FormField
                        control={notificationsForm.control}
                        name="lembrete_habilitado"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Receber Lembretes</FormLabel>
                              <FormDescription>
                                Ative para receber e-mails lembrando de contas a pagar/receber próximas ao vencimento.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Novo Input para Dias (condicionalmente visível) */}
                      {notificationsForm.watch('lembrete_habilitado') && (
                        <FormField
                          control={notificationsForm.control}
                          name="lembrete_dias_antecedencia"
                          render={({ field }) => (
                            <FormItem className="max-w-xs">
                              <FormLabel>Dias de Antecedência</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={0} 
                                  max={30} 
                                  {...field} 
                                  value={field.value ?? 1} // Garante valor no input
                                  onChange={event => field.onChange(event.target.value === '' ? null : Number(event.target.value))}
                                />
                              </FormControl>
                              <FormDescription>
                                Quantos dias antes do vencimento você quer ser lembrado (0 = no dia).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <Button type="submit" disabled={saving} className="mt-6">
                         {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                        Salvar preferências
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Seção de Conta */}
          <TabsContent value="conta">
            <Card>
              <CardHeader>
                <CardTitle>Conta</CardTitle>
                <CardDescription>
                  Gerencie os detalhes da sua conta e altere sua senha.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Form {...accountForm}>
                    <form onSubmit={accountForm.handleSubmit(updateAccount)} className="space-y-6">
                      <FormField
                        control={accountForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" disabled value={userEmail} {...field} />
                            </FormControl>
                            <FormDescription>
                              Seu e-mail de acesso (não é possível alterar).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">Alterar Senha</h3>
                        <p className="text-sm text-muted-foreground">
                          Preencha os campos abaixo para alterar sua senha.
                        </p>
                      </div>
                      
                      <FormField
                        control={accountForm.control}
                        name="current_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={accountForm.control}
                          name="new_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={accountForm.control}
                          name="confirm_password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar Nova Senha</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" disabled={saving}>
                        {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                        Atualizar Senha
                      </Button>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Desconectar</h3>
                          <p className="text-sm text-muted-foreground">
                            Clique abaixo para encerrar sua sessão.
                          </p>
                        </div>
                        
                        <Button 
                          type="button" 
                          variant="destructive" 
                          onClick={handleLogout}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sair da Conta
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings; 