import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId, createFutureTransactionsTable } from '@/lib/supabase';
import { formatDateForDisplay, extractMonthFromIsoDate, getCurrentIsoDate, getCurrentMonth, getCurrentYear, dateObjectToIsoString, isoStringToDateObject, handleCalendarDateChange } from '@/lib/date-utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format, addMonths, addDays, addWeeks, addQuarters, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MonthSelector from '@/components/MonthSelector';
import { CalendarIcon, Trash2, Plus, RefreshCw, CheckCircle2, ArrowRight, ChevronLeft, RotateCcw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';

// Types for our data
interface Category {
  id: number;
  descricao: string;
}

interface FutureTransaction {
  id: number;
  tipo: string;
  data_prevista: string;
  descricao: string;
  valor: number;
  categoria_id: number;
  mes_previsto: string;
  status: string; // 'pendente', 'pago' ou 'cancelado'
  data_efetivacao?: string; // Data em que foi efetivado (se aplicável)
  transacao_id?: number; // ID da transação criada (se aplicável)
  recorrente?: string; // 'TRUE' ou 'FALSE'
  periodicidade?: string; // Periodicidade (mensal, trimestral, etc.)
  parcelamento?: string; // 'TRUE' ou 'FALSE'
  numero_parcelas?: number; // Número total de parcelas
  parcela_atual?: number; // Parcela atual
}

// Form schema
const futureTransactionFormSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.string().min(1, 'Valor é obrigatório').refine(
    (value) => !isNaN(Number(value.replace(',', '.'))), 
    { message: 'Valor deve ser um número válido' }
  ),
  tipo: z.enum(['entrada', 'saida'], {
    required_error: 'Você deve selecionar um tipo',
  }),
  data_prevista: z.string({
    required_error: 'Data prevista é obrigatória',
  }),
  categoria_id: z.string({
    required_error: 'Categoria é obrigatória',
  }),
  recorrente: z.boolean().default(false),
  periodicidade: z.enum(['diario', 'semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual']).optional(),
  parcelamento: z.boolean().default(false),
  numero_parcelas: z.number().optional().nullable(),
});

type FutureTransactionFormValues = z.infer<typeof futureTransactionFormSchema>;

const FutureTransactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [futureTransactions, setFutureTransactions] = useState<FutureTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'MM'));
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // Form
  const form = useForm<FutureTransactionFormValues>({
    resolver: zodResolver(futureTransactionFormSchema),
    defaultValues: {
      descricao: '',
      valor: '',
      tipo: 'entrada',
      data_prevista: getCurrentIsoDate(),
      recorrente: false,
      parcelamento: false,
    },
  });

  // Observadores para campos que controlam a exibição condicional
  const isRecorrente = form.watch('recorrente');
  const isParcelado = form.watch('parcelamento');

  // Efeito para limpar campos condicionais quando desativados
  useEffect(() => {
    if (!isRecorrente) {
      form.setValue('periodicidade', undefined);
    }
  }, [isRecorrente, form]);

  useEffect(() => {
    if (!isParcelado) {
      form.setValue('numero_parcelas', null);
    }
  }, [isParcelado, form]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  // Handle month change
  const handleMonthChange = (month: string, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  // Fetch categories and future transactions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get numeric user ID from the users table
        const numericUserId = await getUserNumericId();
        
        if (!numericUserId) {
          console.error('Could not find numeric user ID');
          return;
        }

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categoria_trasacoes')
          .select('*')
          .eq('usuario_id', numericUserId);
          
        if (categoriesError) throw categoriesError;
        
        if (categoriesData) {
          setCategories(categoriesData);
        }

        // Verificar se a tabela de lançamentos futuros existe
        try {
          const { error: tableCheckError } = await supabase
            .from('lancamentos_futuros')
            .select('count')
            .limit(1)
            .throwOnError();

          // Se a tabela não existir, crie-a
          if (tableCheckError) {
            // Tentar criar a tabela usando nossa função helper
            const tableCreated = await createFutureTransactionsTable();
            
            if (!tableCreated) {
              toast({
                variant: "destructive",
                title: "Erro ao configurar",
                description: "Não foi possível configurar o sistema de lançamentos futuros.",
              });
              return;
            }
          }
        } catch (e) {
          // Tabela provavelmente não existe, vamos criá-la
          const tableCreated = await createFutureTransactionsTable();
          
          if (!tableCreated) {
            toast({
              variant: "destructive",
              title: "Erro ao configurar",
              description: "Não foi possível configurar o sistema de lançamentos futuros.",
            });
            return;
          }
        }

        // Fetch future transactions for the selected month
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('lancamentos_futuros')
          .select('*')
          .eq('usuario_id', numericUserId)
          .or(`mes_previsto.eq.${currentYear}-${currentMonth},and(mes_previsto.is.null,data_prevista.gte.${currentYear}-${currentMonth}-01,data_prevista.lt.${currentYear}-${(Number(currentMonth) + 1).toString().padStart(2, '0')}-01)`)
          .order('data_prevista', { ascending: true });
          
        if (transactionsError) throw transactionsError;
        
        if (transactionsData) {
          setFutureTransactions(transactionsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os lançamentos futuros.",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, toast, refreshing, currentMonth, currentYear]);

  // Format currency (BRL)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // MOVER A DEFINIÇÃO PARA DENTRO DO COMPONENTE
  const calculateNextDate = (currentDateISO: string, periodicity: string | null | undefined): Date | null => {
    if (!periodicity) return null; // Adicionar verificação extra
    const currentDate = isoStringToDateObject(currentDateISO);
    if (!currentDate) return null;

    switch (periodicity) {
      case 'diario':
        return addDays(currentDate, 1);
      case 'semanal':
        return addWeeks(currentDate, 1);
      case 'quinzenal':
        return addDays(currentDate, 15);
      case 'mensal':
        return addMonths(currentDate, 1);
      case 'bimestral':
        return addMonths(currentDate, 2);
      case 'trimestral':
        return addQuarters(currentDate, 1); // ou addMonths(currentDate, 3)
      case 'semestral':
        return addMonths(currentDate, 6);
      case 'anual':
        return addYears(currentDate, 1);
      default:
        console.warn(`Periodicidade desconhecida encontrada: ${periodicity}`); // Log se for desconhecida
        return null;
    }
  };

  // Handle form submission
  const onSubmit = async (data: FutureTransactionFormValues) => {
    try {
      setIsSubmitting(true);
      
      const numericUserId = await getUserNumericId();
      if (!numericUserId) {
        throw new Error('Usuário não encontrado');
      }

      const numericValue = Number(data.valor.replace(',', '.'));

      // Lógica para Parcelamento
      if (data.parcelamento && data.numero_parcelas && data.numero_parcelas > 1) {
        const initialDate = isoStringToDateObject(data.data_prevista);
        if (!initialDate) {
           throw new Error('Data prevista inicial inválida para parcelamento.');
        }

        const installmentPromises = [];
        const totalInstallments = data.numero_parcelas;

        for (let i = 1; i <= totalInstallments; i++) {
          const currentInstallmentDate = addMonths(initialDate, i - 1);
          
          if (!currentInstallmentDate || isNaN(currentInstallmentDate.getTime())){
             console.error(`Erro ao calcular data para parcela ${i}. Data inicial: ${initialDate}`);
             throw new Error(`Erro ao calcular data para parcela ${i}.`);
          }

          const currentFormattedDate = dateObjectToIsoString(currentInstallmentDate);
          const currentMonthString = extractMonthFromIsoDate(currentFormattedDate);

          const installmentData = {
            usuario_id: numericUserId,
            tipo: data.tipo,
            valor: numericValue,
            descricao: `${data.descricao} (${i}/${totalInstallments})`, // Descrição com parcela
            data_prevista: currentFormattedDate,
            categoria_id: Number(data.categoria_id),
            mes_previsto: currentMonthString,
            status: 'pendente',
            recorrente: 'FALSE', // Lançamentos individuais não são recorrentes por si só
            periodicidade: null,
            parcelamento: 'TRUE', // Indica que pertence a um parcelamento original
            numero_parcelas: totalInstallments, // Mantém o total original
            parcela_atual: i, // Indica qual parcela este registro representa
          };
          
          installmentPromises.push(supabase.from('lancamentos_futuros').insert(installmentData));
        }

        const results = await Promise.all(installmentPromises);

        // Verificar erros nos resultados
        const errors = results.filter(result => result.error);
        if (errors.length > 0) {
          console.error('Erros ao inserir parcelas:', errors);
          throw new Error(`Erro ao inserir ${errors.length} de ${totalInstallments} parcelas.`);
        }

        toast({
          title: "Lançamentos parcelados registrados",
          description: `${totalInstallments} lançamentos futuros foram registrados com sucesso.`
        });

      } else {
        // Lógica Original para Lançamento Único ou Recorrente (não parcelado)
        const formattedDate = data.data_prevista;
        const monthString = extractMonthFromIsoDate(formattedDate);
        
        const transactionData = {
          usuario_id: numericUserId,
          tipo: data.tipo,
          valor: numericValue,
          descricao: data.descricao,
          data_prevista: formattedDate,
          categoria_id: Number(data.categoria_id),
          mes_previsto: monthString,
          status: 'pendente',
          recorrente: data.recorrente ? 'TRUE' : 'FALSE',
          periodicidade: data.recorrente ? data.periodicidade : null,
          parcelamento: 'FALSE', // Explicitamente falso se não for parcelado
          numero_parcelas: null,
          parcela_atual: null,
        };

        const { error: transactionError } = await supabase
          .from('lancamentos_futuros')
          .insert(transactionData)
          .select()
          .single();

        if (transactionError) throw transactionError;

        toast({
          title: "Lançamento futuro registrado",
          description: "Seu lançamento futuro foi registrado com sucesso."
        });
      }
      
      // Comum a ambos os casos (parcelado ou não)
      setDialogOpen(false);
      form.reset();
      setRefreshing(true);

    } catch (error: any) {
      console.error("Erro ao salvar lançamento futuro:", error);
      toast({
        title: "Erro ao registrar lançamento",
        description: error.message || "Ocorreu um erro ao registrar o lançamento futuro",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete future transaction
  const deleteFutureTransaction = async (id: number) => {
    try {
      setDeletingId(id);
      
      const { error } = await supabase
        .from('lancamentos_futuros')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Lançamento futuro excluído",
        description: "Seu lançamento futuro foi excluído com sucesso.",
      });

      setRefreshing(true);
    } catch (error) {
      console.error('Error deleting future transaction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir lançamento",
        description: "Não foi possível excluir seu lançamento futuro.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Confirm future transaction (convert to actual transaction)
  const confirmFutureTransaction = async (futureTransaction: FutureTransaction) => {
    let tempConfirmingId = futureTransaction.id;
    try {
      setConfirmingId(futureTransaction.id);
      tempConfirmingId = futureTransaction.id;
      
      const numericUserId = await getUserNumericId();
      if (!numericUserId) {
        throw new Error('Usuário não encontrado');
      }

      if (futureTransaction.status === 'pago' || futureTransaction.transacao_id) {
        toast({
          variant: "default",
          title: "Lançamento já efetivado",
          description: "Este lançamento já foi convertido em uma transação."
        });
        setConfirmingId(null);
        return;
      }

      const { data: existingTransaction, error: existingError } = await supabase
        .from('transacoes')
        .select('id')
        .eq('lancamento_futuro_id', futureTransaction.id)
        .maybeSingle();
        
      if (existingError) {
        console.error('Erro ao verificar transações existentes:', existingError);
      }
      
      let createdTransactionId: number | null = null;

      if (existingTransaction) {
        const { error: updateError } = await supabase
          .from('lancamentos_futuros')
          .update({
            status: 'pago',
            data_efetivacao: new Date().toISOString(),
            transacao_id: existingTransaction.id
          })
          .eq('id', futureTransaction.id);
          
        if (updateError) throw updateError;
        
        createdTransactionId = existingTransaction.id;
        
        toast({
          title: "Lançamento atualizado",
          description: "Este lançamento já tinha uma transação que foi vinculada."
        });

      } else {
        const formattedDate = getCurrentIsoDate();
        const monthString = extractMonthFromIsoDate(formattedDate);
        
        const transaction = {
          usuario_id: numericUserId,
          tipo: futureTransaction.tipo,
          valor: futureTransaction.valor,
          descricao: futureTransaction.descricao,
          data: formattedDate,
          categoria_id: futureTransaction.categoria_id,
          mes: monthString,
          lancamento_futuro_id: futureTransaction.id
        };
        
        const { data: newTransaction, error: transactionError } = await supabase
          .from('transacoes')
          .insert(transaction)
          .select('id')
          .single();

        if (transactionError) throw transactionError;
        if (!newTransaction?.id) throw new Error("Falha ao obter ID da nova transação.");

        createdTransactionId = newTransaction.id;

        const { error: updateError } = await supabase
          .from('lancamentos_futuros')
          .update({
            status: 'pago',
            data_efetivacao: formattedDate,
            transacao_id: newTransaction.id
          })
          .eq('id', futureTransaction.id);

        if (updateError) throw updateError;

        toast({
          title: "Lançamento efetivado",
          description: "Seu lançamento futuro foi convertido em transação com sucesso."
        });
      }

      // --- INÍCIO DA LÓGICA DE RECORRÊNCIA ---
      if (futureTransaction.recorrente === true && futureTransaction.periodicidade) {
        const nextDate = calculateNextDate(futureTransaction.data_prevista, futureTransaction.periodicidade);
        
        if (nextDate) {
          const nextFormattedDate = dateObjectToIsoString(nextDate);
          const nextMonthString = extractMonthFromIsoDate(nextFormattedDate);

          const nextFutureTransactionData = {
            usuario_id: numericUserId,
            tipo: futureTransaction.tipo,
            valor: futureTransaction.valor,
            descricao: futureTransaction.descricao, 
            categoria_id: futureTransaction.categoria_id,
            data_prevista: nextFormattedDate,
            mes_previsto: nextMonthString,
            status: 'pendente',
            recorrente: true, // Usar boolean
            periodicidade: futureTransaction.periodicidade,
            parcelamento: 'FALSE',
            numero_parcelas: null,
            parcela_atual: null,
            transacao_id: null,
            data_efetivacao: null
          };

          console.log("Preparando para inserir próximo lançamento recorrente:", nextFutureTransactionData); 

          const { error: insertNextError } = await supabase
            .from('lancamentos_futuros')
            .insert(nextFutureTransactionData);

          if (insertNextError) {
            console.error("Erro ao criar próximo lançamento recorrente:", insertNextError);
            toast({
              variant: "destructive",
              title: "Erro na Recorrência",
              description: "O lançamento foi efetivado, mas houve um erro ao agendar o próximo.",
            });
          } else {
             console.log("Próximo lançamento recorrente criado com sucesso para:", nextFormattedDate); 
          }
        } else {
           console.warn("Não foi possível calcular a próxima data para a recorrência:", futureTransaction.periodicidade);
        }
      }
      // --- FIM DA LÓGICA DE RECORRÊNCIA ---

      setRefreshing(true);

    } catch (error) {
      console.error('Error confirming future transaction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao efetivar lançamento",
        description: "Não foi possível converter o lançamento futuro em transação."
      });
    } finally {
      if (confirmingId === tempConfirmingId) { 
          setConfirmingId(null); 
      } else {
         console.warn("Confirming ID mudou durante a execução, limpando o ID atual:", confirmingId);
         setConfirmingId(null); 
      }
    }
  };

  // Função para reverter um lançamento efetivado
  const revertFutureTransaction = async (transaction: any) => {
    try {
      setConfirmingId(transaction.id);

      // 1. Primeiro atualizamos o lançamento futuro para remover a referência à transação
      const { error: updateError } = await supabase
        .from('lancamentos_futuros')
        .update({ 
          status: 'pendente',
          transacao_id: null,
          data_efetivacao: null
        })
        .eq('id', transaction.id);

      if (updateError) {
        toast({
          title: 'Erro ao atualizar lançamento futuro',
          description: updateError.message,
          variant: 'destructive',
        });
        setConfirmingId(null);
        return;
      }

      // 2. Depois excluímos a transação
      const { error: deleteError } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', transaction.transacao_id);

      if (deleteError) {
        toast({
          title: 'Erro ao excluir transação',
          description: deleteError.message,
          variant: 'destructive',
        });
        setConfirmingId(null);
        return;
      }

      toast({
        title: 'Lançamento revertido com sucesso',
        description: 'O lançamento futuro voltou para o status pendente',
      });
      
      setRefreshing(true);
    } catch (error) {
      console.error('Erro ao reverter lançamento:', error);
      toast({
        title: 'Erro ao reverter lançamento',
        description: 'Ocorreu um erro ao tentar reverter o lançamento',
        variant: 'destructive',
      });
    } finally {
      setConfirmingId(null);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };

  // Calculate totals
  const incomeTotal = futureTransactions
    .filter(t => t.tipo === 'entrada' && t.status === 'pendente')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  const expenseTotal = futureTransactions
    .filter(t => t.tipo === 'saida' && t.status === 'pendente')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  const balance = incomeTotal - expenseTotal;

  // Calculate effected/confirmed totals
  const confirmedIncomeTotal = futureTransactions
    .filter(t => t.tipo === 'entrada' && t.status === 'pago')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  const confirmedExpenseTotal = futureTransactions
    .filter(t => t.tipo === 'saida' && t.status === 'pago')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  const confirmedBalance = confirmedIncomeTotal - confirmedExpenseTotal;

  // Navigate to transactions
  const handleNavigateToTransactions = () => {
    navigate('/transactions');
  };

  // Formatar periodicidade para exibição
  const formatPeriodicidade = (periodicidade: string): string => {
    const formatMap: Record<string, string> = {
      'diario': 'Diário',
      'semanal': 'Semanal',
      'quinzenal': 'Quinzenal',
      'mensal': 'Mensal',
      'bimestral': 'Bimestral',
      'trimestral': 'Trimestral',
      'semestral': 'Semestral',
      'anual': 'Anual'
    };
    return formatMap[periodicidade] || periodicidade;
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Lançamentos Futuros</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento Futuro</DialogTitle>
                  <DialogDescription>
                    Registre um lançamento previsto para o futuro.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                    <FormField
                      control={form.control}
                      name="descricao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input placeholder="Descreva o lançamento" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="valor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="0,00" 
                              {...field} 
                              type="text"
                              onChange={(e) => {
                                // Allow only numbers and comma/dot
                                const value = e.target.value.replace(/[^0-9,\.]/g, '');
                                field.onChange(value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="entrada">A Receber</SelectItem>
                                <SelectItem value="saida">A Pagar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="categoria_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem 
                                    key={category.id} 
                                    value={String(category.id)}
                                  >
                                    {category.descricao}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="data_prevista"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data Prevista</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    formatDateForDisplay(field.value)
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? isoStringToDateObject(field.value) : undefined}
                                onSelect={(date) => field.onChange(handleCalendarDateChange(date))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <FormField
                          control={form.control}
                          name="recorrente"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Lançamento Recorrente</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (!checked) {
                                      form.setValue('parcelamento', false);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {isRecorrente && (
                        <FormField
                          control={form.control}
                          name="periodicidade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Periodicidade</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="diario">Diário</SelectItem>
                                  <SelectItem value="semanal">Semanal</SelectItem>
                                  <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                  <SelectItem value="mensal">Mensal</SelectItem>
                                  <SelectItem value="bimestral">Bimestral</SelectItem>
                                  <SelectItem value="trimestral">Trimestral</SelectItem>
                                  <SelectItem value="semestral">Semestral</SelectItem>
                                  <SelectItem value="anual">Anual</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <FormField
                          control={form.control}
                          name="parcelamento"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Lançamento Parcelado</FormLabel>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                      form.setValue('recorrente', false);
                                    }
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {isParcelado && (
                        <FormField
                          control={form.control}
                          name="numero_parcelas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Parcelas</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="2"
                                  max="99"
                                  placeholder="2"
                                  value={field.value?.toString() || ""}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? null : parseInt(e.target.value);
                                    field.onChange(isNaN(value) ? null : value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    <DialogFooter className="mt-6">
                      <Button type="submit">Adicionar</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <MonthSelector onMonthChange={handleMonthChange} />

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? 'Carregando...' : formatCurrency(incomeTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? 'Carregando...' : formatCurrency(expenseTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo Previsto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? 'Carregando...' : formatCurrency(balance)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Efetivado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${confirmedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? 'Carregando...' : formatCurrency(confirmedBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future Transactions Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Lançamentos Futuros</CardTitle>
              <CardDescription>
                Gerenciamento de todos os lançamentos previstos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleNavigateToTransactions}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Ir para Transações
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-6">Carregando lançamentos...</div>
            ) : futureTransactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum lançamento futuro encontrado neste mês. Adicione um novo lançamento!
              </div>
            ) : (
              <div className="space-y-8">
                {/* Lançamentos Pendentes */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Lançamentos Pendentes</h3>
                  {futureTransactions.filter(t => t.status === 'pendente').length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum lançamento pendente neste mês.
                    </div>
                  ) : (
                    <>
                      {/* Table for Medium+ screens */}
                      <div className="rounded-md border hidden md:block"> {/* Hide on <md */} 
                        <Table>
                          <TableHeader>
                             {/* Headers remain the same as last edit (some hidden on sm+) */}
                             <TableRow>
                              <TableHead className="w-[100px] hidden sm:table-cell">Data Prevista</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-[80px] sm:w-[100px] text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {futureTransactions
                              .filter(transaction => transaction.status === 'pendente')
                              .map((transaction) => (
                                // Table Row (remains largely the same, hidden on <md indirectly by parent)
                                <TableRow key={`${transaction.id}-row`}>
                                   <TableCell className="font-medium hidden sm:table-cell">
                                    {formatDateForDisplay(transaction.data_prevista)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{transaction.descricao}</div>
                                    <div className="text-xs text-muted-foreground sm:hidden">
                                      {formatDateForDisplay(transaction.data_prevista)}
                                    </div>
                                    {/* Recorrente/Parcelado info (keep for context) */}
                                    {transaction.recorrente === 'TRUE' && (
                                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                        Recorrente {transaction.periodicidade ? `(${formatPeriodicidade(transaction.periodicidade)})` : ''}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {categories.find(c => c.id === transaction.categoria_id)?.descricao || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-yellow-100 text-yellow-800">
                                      Pendente
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <span className={transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                                      {transaction.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                    </span>
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                       {/* Action Buttons inside AlertDialog remain the same */} 
                                       <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" disabled={confirmingId === transaction.id}>
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Efetivar Lançamento</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação marcará o lançamento como pago e criará uma transação correspondente. Você tem certeza?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => confirmFutureTransaction(transaction)}
                                              disabled={confirmingId === transaction.id}
                                            >
                                              {confirmingId === transaction.id ? 'Processando...' : 'Efetivar'}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" disabled={deletingId === transaction.id}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação removerá permanentemente o lançamento futuro. Você tem certeza?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => deleteFutureTransaction(transaction.id)}
                                              className="bg-red-600 hover:bg-red-700"
                                              disabled={deletingId === transaction.id}
                                            >
                                              {deletingId === transaction.id ? 'Excluindo...' : 'Excluir'}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Cards for Small screens */}
                      <div className="space-y-3 md:hidden"> {/* Show only on <md */} 
                        {futureTransactions
                          .filter(transaction => transaction.status === 'pendente')
                          .map((transaction) => (
                            <Card key={`${transaction.id}-card`} className="p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 mr-2">
                                  <p className="font-semibold">{transaction.descricao}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDateForDisplay(transaction.data_prevista)}
                                     • {categories.find(c => c.id === transaction.categoria_id)?.descricao || 'S/ Cat.'}
                                  </p>
                                  {transaction.recorrente === 'TRUE' && (
                                    <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                                      Recorrente {transaction.periodicidade ? `(${formatPeriodicidade(transaction.periodicidade)})` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className={`font-bold text-lg ${transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ 
                                  transaction.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {transaction.tipo === 'entrada' ? 'A Receber' : 'A Pagar'}
                                </span>
                                {/* Action Buttons for Mobile Cards */}
                                <div className="flex space-x-1">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      {/* Slightly larger button for easier tap */} 
                                      <Button variant="ghost" size="sm" disabled={confirmingId === transaction.id} className="p-1 h-7 w-7"> 
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                     {/* AlertDialogContent needs to be inside the map but ideally outside the trigger's direct parent for structure */} 
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Efetivar Lançamento</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta ação marcará o lançamento como pago e criará uma transação correspondente. Você tem certeza?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => confirmFutureTransaction(transaction)}
                                            disabled={confirmingId === transaction.id}
                                          >
                                            {confirmingId === transaction.id ? 'Processando...' : 'Efetivar'}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" disabled={deletingId === transaction.id} className="p-1 h-7 w-7"> 
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta ação removerá permanentemente o lançamento futuro. Você tem certeza?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => deleteFutureTransaction(transaction.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                          disabled={deletingId === transaction.id}
                                        >
                                          {deletingId === transaction.id ? 'Excluindo...' : 'Excluir'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Lançamentos Efetivados */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Lançamentos Efetivados</h3>
                  {futureTransactions.filter(t => t.status === 'pago').length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Nenhum lançamento efetivado neste mês.
                    </div>
                  ) : (
                     <>
                      {/* Table for Medium+ screens */}
                      <div className="rounded-md border hidden md:block"> {/* Hide on <md */} 
                        <Table>
                          <TableHeader>
                             {/* Headers remain the same as last edit (some hidden on sm+) */}
                             <TableRow>
                              <TableHead className="w-[100px] hidden sm:table-cell">Data Prevista</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                              <TableHead className="text-right">Valor</TableHead>
                              <TableHead className="w-[80px] sm:w-[100px] text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {futureTransactions
                              .filter(transaction => transaction.status === 'pago')
                              .map((transaction) => (
                                // Table Row (remains largely the same, hidden on <md indirectly by parent)
                                <TableRow key={`${transaction.id}-row`} className="bg-gray-50 dark:bg-gray-800/20">
                                  <TableCell className="font-medium hidden sm:table-cell">
                                    {formatDateForDisplay(transaction.data_prevista)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">{transaction.descricao}</div>
                                     <div className="text-xs text-muted-foreground sm:hidden">
                                      {formatDateForDisplay(transaction.data_prevista)}
                                    </div>
                                    {/* Recorrente/Parcelado info */}
                                    {transaction.recorrente === 'TRUE' && (
                                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                        Recorrente {transaction.periodicidade ? `(${formatPeriodicidade(transaction.periodicidade)})` : ''}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {categories.find(c => c.id === transaction.categoria_id)?.descricao || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-100 text-green-800">
                                      Pago
                                      {transaction.data_efetivacao && (
                                        <span className="ml-1 text-xs text-green-600">
                                          ({formatDateForDisplay(transaction.data_efetivacao)})
                                        </span>
                                      )}
                                    </span>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <span className={transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                                      {transaction.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                    </span>
                                  </TableCell>
                                  <TableCell className={`text-right font-medium ${
                                    transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end space-x-1">
                                      {/* Action Buttons inside AlertDialog remain the same */} 
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" disabled={confirmingId === transaction.id}>
                                            <ChevronLeft className="h-4 w-4 text-amber-500" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="z-50">
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Reverter Efetivação</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Esta ação mudará o status para 'pendente' e excluirá a transação associada. Você tem certeza?
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                              onClick={() => revertFutureTransaction(transaction)}
                                              disabled={confirmingId === transaction.id}
                                              className="bg-amber-600 hover:bg-amber-700"
                                            >
                                              {confirmingId === transaction.id ? 'Processando...' : 'Reverter'}
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                      <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="p-1 h-7 w-7"> 
                                        <ArrowRight className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Cards for Small screens */}
                      <div className="space-y-3 md:hidden"> {/* Show only on <md */} 
                        {futureTransactions
                          .filter(transaction => transaction.status === 'pago')
                          .map((transaction) => (
                            <Card key={`${transaction.id}-card`} className="p-3 bg-gray-50/50 dark:bg-gray-800/20"> {/* Slightly different bg */} 
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 mr-2">
                                  <p className="font-semibold">{transaction.descricao}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Previsto: {formatDateForDisplay(transaction.data_prevista)}
                                     • {categories.find(c => c.id === transaction.categoria_id)?.descricao || 'S/ Cat.'}
                                  </p>
                                  {transaction.recorrente === 'TRUE' && (
                                     <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                                      Recorrente {transaction.periodicidade ? `(${formatPeriodicidade(transaction.periodicidade)})` : ''}
                                    </span>
                                  )}
                                </div>
                                <div className={`font-bold text-lg ${transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                  Pago
                                  {transaction.data_efetivacao && (
                                    <span className="ml-1 text-xs text-green-600">
                                      ({formatDateForDisplay(transaction.data_efetivacao)})
                                    </span>
                                  )}
                                </span>
                                 {/* Action Buttons for Mobile Cards */} 
                                <div className="flex space-x-1">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" disabled={confirmingId === transaction.id} className="p-1 h-7 w-7"> 
                                        <ChevronLeft className="h-4 w-4 text-amber-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    {/* AlertDialogContent needs to be inside the map */} 
                                    <AlertDialogContent className="z-50">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reverter Efetivação</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta ação mudará o status para 'pendente' e excluirá a transação associada. Você tem certeza?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => revertFutureTransaction(transaction)}
                                          disabled={confirmingId === transaction.id}
                                          className="bg-amber-600 hover:bg-amber-700"
                                        >
                                          {confirmingId === transaction.id ? 'Processando...' : 'Reverter'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                  <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="p-1 h-7 w-7"> 
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default FutureTransactions; 