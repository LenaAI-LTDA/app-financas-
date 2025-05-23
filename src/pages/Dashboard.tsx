import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId } from '@/lib/supabase';
import { getFutureLaunchesSummary, FutureLaunchesSummary } from '@/lib/finance-service';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, RefreshCw, CreditCard, TrendingUp, TrendingDown, Plus, PieChart, BarChart, ArrowRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import MonthSelector from '@/components/MonthSelector';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { 
  formatDateForDisplay, 
  getCurrentMonth,
  getCurrentYear,
  dateObjectToIsoString
} from '@/lib/date-utils';

// Types for our Supabase data
interface Transaction {
  id: number;
  tipo: string;
  data: string;
  descricao: string;
  valor: number;
  categoria_id?: number;
}

interface Category {
  id: number;
  descricao: string;
}

interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  recentTransactions: Transaction[];
  categoryTotals: CategoryTotal[];
  monthlyTotals: MonthlyTotal[];
}

interface CategoryTotal {
  id: number;
  category: string;
  value: number;
  color: string;
  percentage: number;
}

interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
}

// Paleta de cores para os gráficos
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', 
  '#82CA9D', '#FECB52', '#FF6B6B', '#6A0572', '#AB83A1'
];

const Dashboard = () => {
  const { user, signOut, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    recentTransactions: [],
    categoryTotals: [],
    monthlyTotals: []
  });
  const [categories, setCategories] = useState<Record<number, string>>({});
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [currentYear, setCurrentYear] = useState(getCurrentYear());
  const [pendingIncome, setPendingIncome] = useState<number>(0);
  const [pendingExpense, setPendingExpense] = useState<number>(0);
  
  // Redirect unauthenticated users to the login page
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

  // Buscar dados dos últimos 6 meses para o gráfico de tendências
  const getLastSixMonths = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 6; i++) {
      const targetDate = new Date();
      targetDate.setMonth(currentDate.getMonth() - i);
      
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const year = targetDate.getFullYear();
      
      // Nome abreviado do mês em português
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const displayMonth = monthNames[targetDate.getMonth()];
      
      months.push({
        key: `${year}-${month}`,
        displayName: displayMonth
      });
    }
    
    return months;
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setPendingIncome(0);
        setPendingExpense(0);
        
        const numericUserId = await getUserNumericId();
        if (!numericUserId) {
          console.error('Could not find numeric user ID');
          setLoading(false);
          return;
        }

        // Fetch categories first
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categoria_trasacoes')
          .select('*')
          .eq('usuario_id', numericUserId);
          
        if (categoriesError) {
          throw categoriesError;
        }
        
        // Create a mapping of category IDs to names
        const categoryMap: Record<number, string> = {};
        if (categoriesData) {
          categoriesData.forEach(cat => {
            categoryMap[cat.id] = cat.descricao;
          });
          setCategories(categoryMap);
        }

        // Fetch transactions for the current month
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transacoes')
          .select('*')
          .eq('usuario_id', numericUserId)
          .eq('mes', `${currentYear}-${currentMonth}`)
          .order('data', { ascending: false })
          .limit(5);
          
        if (transactionsError) {
          throw transactionsError;
        }

        // Get all transactions for the current month
        const { data: allTransactions, error: allTransactionsError } = await supabase
          .from('transacoes')
          .select('*')
          .eq('usuario_id', numericUserId)
          .eq('mes', `${currentYear}-${currentMonth}`);
          
        if (allTransactionsError) {
          throw allTransactionsError;
        }
        
        // Calculate totals for the current month
        let incomeTotal = 0;
        let expenseTotal = 0;
        
        if (allTransactions) {
          allTransactions.forEach(transaction => {
            if (transaction.tipo === 'entrada') {
              incomeTotal += Number(transaction.valor);
            } else if (transaction.tipo === 'saida') {
              expenseTotal += Number(transaction.valor);
            }
          });
        }

        // Debug: verificar valores
        console.log('Dashboard - All Transactions:', allTransactions);
        console.log('Dashboard - Income Total:', incomeTotal);
        console.log('Dashboard - Expense Total:', expenseTotal);
        console.log('Dashboard - Balance:', incomeTotal - expenseTotal);

        // Calcular totais por categoria para despesas
        const categoryExpenses: Record<number, number> = {};
        const categoryTotalsArray: CategoryTotal[] = [];
        
        if (allTransactions) {
          // Apenas considerar despesas para o gráfico de categorias
          const expenses = allTransactions.filter(t => t.tipo === 'saida');
          
          expenses.forEach(transaction => {
            if (transaction.categoria_id) {
              const catId = transaction.categoria_id;
              if (!categoryExpenses[catId]) {
                categoryExpenses[catId] = 0;
              }
              categoryExpenses[catId] += Number(transaction.valor);
            }
          });
          
          // Converter para array para o gráfico
          if (expenseTotal > 0) {
            Object.entries(categoryExpenses).forEach(([catId, value], index) => {
              const numericCatId = Number(catId);
              const percentage = (value / expenseTotal) * 100;
              
              categoryTotalsArray.push({
                id: numericCatId,
                category: categoryMap[numericCatId] || 'Sem categoria',
                value: value,
                color: COLORS[index % COLORS.length],
                percentage: percentage
              });
            });
            
            // Ordenar por valor (do maior para o menor)
            categoryTotalsArray.sort((a, b) => b.value - a.value);
          }
        }

        // Buscar dados dos últimos 6 meses para o gráfico de tendências
        const sixMonthsData = getLastSixMonths();
        const monthlyTotals: MonthlyTotal[] = [];
        
        // Para cada um dos últimos 6 meses
        for (const monthData of sixMonthsData) {
          const monthYearKey = monthData.key;
          
          // Buscar transações deste mês
          const { data: monthTransactions, error: monthError } = await supabase
            .from('transacoes')
            .select('tipo, valor')
            .eq('usuario_id', numericUserId)
            .eq('mes', monthYearKey);
            
          if (monthError) {
            console.error(`Erro ao buscar dados para ${monthYearKey}:`, monthError);
            continue;
          }
          
          // Calcular totais para este mês
          let monthIncome = 0;
          let monthExpense = 0;
          
          if (monthTransactions) {
            monthTransactions.forEach(transaction => {
              if (transaction.tipo === 'entrada') {
                monthIncome += Number(transaction.valor);
              } else if (transaction.tipo === 'saida') {
                monthExpense += Number(transaction.valor);
              }
            });
          }
          
          monthlyTotals.push({
            month: monthData.displayName,
            income: monthIncome,
            expense: monthExpense
          });
        }
        
        // Reverse para mostrar do mais antigo para o mais recente
        monthlyTotals.reverse();
        
        // --- Buscar resumo de lançamentos futuros PENDENTES do mês atual ---
        try {
          const currentMonthDate = parse(`${currentYear}-${currentMonth}-01`, 'yyyy-MM-dd', new Date());
          const startDate = dateObjectToIsoString(startOfMonth(currentMonthDate));
          const endDate = dateObjectToIsoString(endOfMonth(currentMonthDate));

          const futureSummary = await getFutureLaunchesSummary(startDate, endDate);
          if (futureSummary) {
            setPendingIncome(futureSummary.totalIncome || 0);
            setPendingExpense(futureSummary.totalExpense || 0);
             console.log('Dashboard - Pending Future Summary:', futureSummary);
          } else {
             console.log('Dashboard - No pending future summary found for the period.');
          }
        } catch (futureError) {
            console.error("Erro ao buscar resumo de lançamentos futuros:", futureError);
            // Não tratar como erro fatal para o resto do dashboard
            setPendingIncome(0);
            setPendingExpense(0);
        }
        
        setStats({
          totalIncome: incomeTotal,
          totalExpense: expenseTotal,
          balance: incomeTotal - expenseTotal,
          recentTransactions: transactionsData || [],
          categoryTotals: categoryTotalsArray,
          monthlyTotals: monthlyTotals
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do dashboard."
        });
        setStats({ totalIncome: 0, totalExpense: 0, balance: 0, recentTransactions: [], categoryTotals: [], monthlyTotals: [] });
        setPendingIncome(0);
        setPendingExpense(0);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, currentMonth, currentYear, navigate, toast]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: "Ocorreu um problema ao desconectar sua conta."
      });
    }
  };

  // Format currency (BRL)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Navigate to transactions
  const handleNavigateToTransactions = () => {
    navigate('/transactions');
  };

  // Navigate to categories
  const handleNavigateToCategories = () => {
    navigate('/categories');
  };

  // Show the transaction date in the proper format
  const displayTransactionDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(getCurrentMonth()) && setCurrentYear(getCurrentYear())} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <MonthSelector onMonthChange={handleMonthChange} initialMonth={currentMonth} initialYear={currentYear} />

        {/* Cards de Resumo - TODOS COM LINKS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5"> 
          {/* Card Receitas */}
          <Link to="/transactions" className="hover:shadow-md transition-shadow rounded-lg block">
            <Card className="h-full cursor-pointer">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <Skeleton className="h-8 w-3/4" />
                  ) : (
                     <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</div>
                  )}
               </CardContent>
            </Card>
          </Link>
          
          {/* Card Despesas */}
          <Link to="/transactions" className="hover:shadow-md transition-shadow rounded-lg block">
            <Card className="h-full cursor-pointer">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <Skeleton className="h-8 w-3/4" />
                  ) : (
                     <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpense)}</div>
                  )}
               </CardContent>
            </Card>
          </Link>

           {/* Card Saldo */}
           <Link to="/reports" className="hover:shadow-md transition-shadow rounded-lg block">
            <Card className="h-full cursor-pointer">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <Skeleton className="h-8 w-3/4" />
                  ) : (
                     <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                         {formatCurrency(stats.balance)}
                     </div>
                  )}
               </CardContent>
            </Card>
          </Link>
          
          {/* Card - A Receber (Previsto) */}
          <Link to="/future-transactions" className="hover:shadow-md transition-shadow rounded-lg block">
            <Card className="h-full cursor-pointer">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">A Receber (Prev.)</CardTitle>
                   <TrendingUp className="h-4 w-4 text-green-500 opacity-70" /> 
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <Skeleton className="h-8 w-3/4" />
                  ) : (
                     <div className="text-2xl font-bold text-green-500">
                        {formatCurrency(pendingIncome)}
                     </div>
                  )}
                   <p className="text-xs text-muted-foreground">Previsto para este mês</p> 
               </CardContent>
            </Card>
          </Link>
          
          {/* Card - A Pagar (Previsto) */}
          <Link to="/future-transactions" className="hover:shadow-md transition-shadow rounded-lg block">
            <Card className="h-full cursor-pointer">
               <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">A Pagar (Prev.)</CardTitle>
                   <TrendingDown className="h-4 w-4 text-red-500 opacity-70" /> 
               </CardHeader>
               <CardContent>
                  {loading ? (
                     <Skeleton className="h-8 w-3/4" />
                  ) : (
                     <div className="text-2xl font-bold text-red-500">
                         {formatCurrency(pendingExpense)}
                     </div>
                  )}
                   <p className="text-xs text-muted-foreground">Previsto para este mês</p> 
               </CardContent>
            </Card>
          </Link>
        </div>

        {/* Gráficos e dados adicionais */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Gráfico de Categorias */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Despesas por Categoria</CardTitle>
                  <CardDescription>Distribuição das suas despesas</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleNavigateToCategories}>
                  <PieChart className="h-4 w-4 mr-2" />
                  Categorias
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats.categoryTotals.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={stats.categoryTotals}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="category"
                      >
                        {stats.categoryTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {stats.totalExpense === 0 ? (
                    <p>Nenhuma despesa registrada neste mês</p>
                  ) : (
                    <p>Nenhuma categoria encontrada para as despesas</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Tendências - Últimos 6 meses */}
          <Card className="col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tendências dos Últimos 6 Meses</CardTitle>
                  <CardDescription>Evolução de receitas e despesas</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={handleNavigateToTransactions}>
                  <BarChart className="h-4 w-4 mr-2" />
                  Transações
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : stats.monthlyTotals.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={stats.monthlyTotals}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `R$ ${value}`} />
                      <Tooltip formatter={(value, name) => [
                        formatCurrency(name === 'expense' ? -Number(value) : Number(value)),
                        name === 'expense' ? 'Despesas' : 'Receitas'
                      ]} />
                      <Legend />
                      <Bar dataKey="income" name="Receitas" fill="#00C49F" />
                      <Bar dataKey="expense" name="Despesas" fill="#FF8042" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <p>Sem dados históricos suficientes</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Categorias de Despesas */}
        {stats.categoryTotals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Principais Categorias de Despesas</CardTitle>
              <CardDescription>
                Detalhamento das suas maiores despesas no mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.categoryTotals.slice(0, 5).map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{category.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(category.value)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({category.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transações Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>Últimas 5 transações registradas</CardDescription>
            </div>
            <Button onClick={handleNavigateToTransactions}>
              <Plus className="h-4 w-4 mr-2" />
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stats.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {stats.recentTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex-grow">
                      <div className="font-medium">{transaction.descricao}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {displayTransactionDate(transaction.data)}
                        {transaction.categoria_id && categories[transaction.categoria_id] ? 
                          ` • ${categories[transaction.categoria_id]}` : ''}
                      </div>
                    </div>
                    <div className={`font-medium text-right sm:text-right flex-shrink-0 ${transaction.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.tipo === 'entrada' ? '+' : '-'} {formatCurrency(Math.abs(Number(transaction.valor)))}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={handleNavigateToTransactions}>
                  Ver todas as transações
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nenhuma transação encontrada. Comece a registrar suas finanças!</p>
                <Button variant="outline" className="mt-4" onClick={handleNavigateToTransactions}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar transação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
