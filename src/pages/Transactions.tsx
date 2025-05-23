import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId } from '@/lib/supabase';
import { 
  formatDateForDisplay, 
  extractMonthFromIsoDate, 
  getCurrentIsoDate,
  getCurrentMonth,
  getCurrentYear,
  dateObjectToIsoString,
  isoStringToDateObject,
  handleCalendarDateChange
} from '@/lib/date-utils';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import MonthSelector from '@/components/MonthSelector';
import { CalendarIcon, Trash2, Plus, RefreshCw } from 'lucide-react';

// Types for our data
interface Category {
  id: number;
  descricao: string;
}

interface Transaction {
  id: number;
  tipo: string;
  data: string;
  descricao: string;
  valor: number;
  categoria_id: number;
  mes: string;
}

// Form schema
const transactionFormSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  valor: z.string().min(1, 'Valor é obrigatório').refine(
    (value) => !isNaN(Number(value.replace(',', '.'))), 
    { message: 'Valor deve ser um número válido' }
  ),
  tipo: z.enum(['entrada', 'saida'], {
    required_error: 'Você deve selecionar um tipo',
  }),
  data: z.string({
    required_error: 'Data é obrigatória',
  }),
  categoria_id: z.string({
    required_error: 'Categoria é obrigatória',
  }),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const Transactions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [currentYear, setCurrentYear] = useState(getCurrentYear());

  // Form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      descricao: '',
      valor: '',
      tipo: 'entrada',
      data: getCurrentIsoDate(),
    },
  });

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

  // Fetch categories and transactions
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

        // Fetch transactions for the selected month
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transacoes')
          .select('*')
          .eq('usuario_id', numericUserId)
          .eq('mes', `${currentYear}-${currentMonth}`)
          .order('data', { ascending: false });
          
        if (transactionsError) throw transactionsError;
        
        if (transactionsData) {
          setTransactions(transactionsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as transações.",
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

  // Handle form submission
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      // Get numeric user ID from the users table
      const numericUserId = await getUserNumericId();
      
      if (!numericUserId) {
        throw new Error('Usuário não encontrado');
      }

      // Usar a data diretamente do formulário, que já está em formato ISO
      const formattedDate = data.data;
      // Extrair o mês da data ISO para o campo mes no formato YYYY-MM
      const monthString = extractMonthFromIsoDate(data.data);
      
      console.log('Formato do mês extraído para transação:', monthString); // Para debug
      
      // Format the value as number
      const numericValue = Number(data.valor.replace(',', '.'));
      
      // Create the transaction object
      const transaction = {
        usuario_id: numericUserId,
        tipo: data.tipo,
        valor: numericValue,
        descricao: data.descricao,
        data: formattedDate,
        categoria_id: Number(data.categoria_id),
        mes: monthString, // Formato YYYY-MM
      };
      
      // Insert the transaction
      const { error } = await supabase
        .from('transacoes')
        .insert(transaction);

      if (error) throw error;

      // Success notification
      toast({
        title: "Transação registrada",
        description: "Sua transação foi registrada com sucesso."
      });
      
      // Close dialog and reset form
      setDialogOpen(false);
      form.reset();
      
      // Refresh the transactions list
      setRefreshing(true);
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar a transação."
      });
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: number) => {
    try {
      setDeletingId(id);
      
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Transação excluída",
        description: "Sua transação foi excluída com sucesso.",
      });

      setRefreshing(true);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir transação",
        description: "Não foi possível excluir sua transação.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
  };

  // Calculate totals
  const incomeTotal = transactions
    .filter(t => t.tipo === 'entrada')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  const expenseTotal = transactions
    .filter(t => t.tipo === 'saida')
    .reduce((sum, t) => sum + Number(t.valor), 0);
    
  // Debug: verificar se todas as transações estão sendo contabilizadas
  console.log('Transactions:', transactions);
  console.log('Income Total:', incomeTotal);
  console.log('Expense Total:', expenseTotal);
  console.log('Balance:', incomeTotal - expenseTotal);
    
  const balance = incomeTotal - expenseTotal;

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
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
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes da transação abaixo.
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
                            <Input placeholder="Descreva a transação" {...field} />
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
                                <SelectItem value="entrada">Receita</SelectItem>
                                <SelectItem value="saida">Despesa</SelectItem>
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
                      name="data"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data</FormLabel>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {loading ? 'Carregando...' : formatCurrency(incomeTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loading ? 'Carregando...' : formatCurrency(expenseTotal)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {loading ? 'Carregando...' : formatCurrency(balance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Transações</CardTitle>
            <CardDescription>
              Gerenciamento completo das suas movimentações financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-6">Carregando transações...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhuma transação encontrada neste mês. Adicione uma nova transação!
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] hidden sm:table-cell">Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[50px] text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium hidden sm:table-cell">
                          {formatDateForDisplay(transaction.data)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.descricao}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">
                            {formatDateForDisplay(transaction.data)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {categories.find(c => c.id === transaction.categoria_id)?.descricao || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTransaction(transaction.id)}
                            disabled={deletingId === transaction.id}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
