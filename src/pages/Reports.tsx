import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { 
  formatDateForDisplay,
  getCurrentIsoDate,
  getCurrentMonth,
  getCurrentYear,
  extractMonthFromIsoDate,
  isValidIsoDate
} from "@/lib/date-utils";
import { 
  getMonthlyBalances, 
  getCategoryDistribution,
  getCashFlowByPeriod,
  getCashFlowSummary,
  getFutureLaunchesByPeriod,
  getFutureLaunchesSummary,
  getCategoryDistributionByPeriod
} from "@/lib/finance-service";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { RangeFilter } from "@/components/RangeFilter";
import { supabase } from "@/integrations/supabase/client";
import { getUserNumericId } from "@/lib/supabase";
import { getCategoryIcon } from "@/utils/categoryIcons";
import { Tabs, TabsContent } from "@/components/ui/tabs";

type MonthlyBalance = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

type CategoryDistribution = {
  categoryId: number;
  category: string;
  incomeAmount: number;
  expenseAmount: number;
};

type CashFlowData = {
  date: string;
  formattedDate: string;
  income: number;
  expense: number;
  balance: number;
  cumulativeBalance: number;
  hasFutureTransactions?: boolean;
};

type CashFlowSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  dailyAvgIncome: number;
  dailyAvgExpense: number;
  periodDays: number;
  topExpenseDay: { date: string; amount: number };
  topIncomeDay: { date: string; amount: number };
  includesFutureTransactions?: boolean;
  hasFutureData?: boolean;
};

type FutureLaunch = {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  data_prevista: string;
  categoria_id: number;
  categoria_trasacoes?: {
    descricao: string;
  };
};

type FutureLaunchesSummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  countIncome: number;
  countExpense: number;
  totalCount: number;
  categoryDistribution: {
    category: string;
    total: number;
    count: number;
  }[];
};

// Cores padrão para categorias não mapeadas
const DEFAULT_EXPENSE_COLOR = "#DC2626"; // red-600
const DEFAULT_INCOME_COLOR = "#16A34A"; // green-600
const DEFAULT_ICON_COLOR = "#6b7280"; // Cor do ícone padrão de categoryIcons.ts
const OTHER_CATEGORY_COLOR = "#6b7280"; // Cor para a categoria "Outros"

export default function Reports() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [isCashFlowLoading, setIsCashFlowLoading] = useState(false);
  const [year, setYear] = useState(getCurrentYear());
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthlyData, setMonthlyData] = useState<MonthlyBalance[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryDistribution[]>([]);
  const [activeTab, setActiveTab] = useState("monthly");
  
  // Fluxo de caixa
  const [startDate, setStartDate] = useState<string>(getCurrentIsoDate()); // Data atual em formato ISO
  const [endDate, setEndDate] = useState<string>(getCurrentIsoDate()); // Data atual em formato ISO
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [cashFlowSummary, setCashFlowSummary] = useState<CashFlowSummary | null>(null);
  const [includeFuture, setIncludeFuture] = useState(true);
  
  // Lançamentos futuros
  const [isFutureLoading, setIsFutureLoading] = useState(false);
  const [futureStartDate, setFutureStartDate] = useState<string>(getCurrentIsoDate());
  const [futureEndDate, setFutureEndDate] = useState<string>(getCurrentIsoDate()); // Será calculado para 3 meses à frente
  const [futureLaunches, setFutureLaunches] = useState<FutureLaunch[]>([]);
  const [futureSummary, setFutureSummary] = useState<FutureLaunchesSummary | null>(null);
  
  // Novas datas para o relatório de categorias
  const [categoryStartDate, setCategoryStartDate] = useState<string>(getCurrentIsoDate());
  const [categoryEndDate, setCategoryEndDate] = useState<string>(getCurrentIsoDate());

  // Generate available years (current year and 4 years back)
  const availableYears = Array.from(
    { length: 5 },
    (_, i) => year - i
  );

  const loadMonthlyBalances = async (selectedYear: number) => {
    try {
      setIsLoading(true);
      console.log(`Carregando balanços mensais para o ano: ${selectedYear}`);
      
      // Verificar dados de exemplo para confirmar que a função está funcionando
      console.log("Verificando se há transações no banco de dados...");
      
      const userId = await getUserNumericId();
      const { data: sampleData, error: sampleError } = await supabase
        .from('transacoes')
        .select('*')
        .eq('usuario_id', userId)
        .limit(5);
        
      if (sampleError) {
        console.error("Erro ao buscar amostra de transações:", sampleError);
      } else {
        console.log(`Amostra de transações (${sampleData?.length || 0}):`, sampleData);
      }
      
      // Agora carrega os balanços mensais
      const data = await getMonthlyBalances(selectedYear);
      console.log("Dados mensais carregados:", data);
      setMonthlyData(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar relatório mensal:", error);
      toast({
        title: "Erro ao carregar relatório mensal",
        description: error.message || "Ocorreu um erro ao carregar os dados do relatório",
        variant: "destructive",
      });
      setMonthlyData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryDistribution = async (month: string) => {
    try {
      setIsChartLoading(true);
      if (!month) {
        console.warn("Mês não especificado para distribuição por categoria");
        setCategoryData([]);
        return [];
      }
      
      console.log(`Carregando distribuição por categoria para o mês: ${month}`);
      const data = await getCategoryDistribution(month);
      console.log("Dados de categoria carregados:", data);
      
      // Se não temos dados para o mês selecionado, vamos tentar o mês atual
      if (data.length === 0) {
        const currentMonth = getCurrentMonth();
        if (month !== currentMonth) {
          console.log(`Sem dados para ${month}, atualizando seleção para ${currentMonth}`);
          setSelectedMonth(currentMonth);
          // Não precisamos chamar loadCategoryDistribution novamente, pois o useEffect cuidará disso
        }
      }
      
      setCategoryData(data || []);
      return data;
    } catch (error: any) {
      console.error("Erro ao carregar distribuição por categoria:", error);
      toast({
        title: "Erro ao carregar distribuição por categoria",
        description: error.message || "Ocorreu um erro ao carregar os dados das categorias",
        variant: "destructive",
      });
      setCategoryData([]);
      return [];
    } finally {
      setIsChartLoading(false);
    }
  };

  const loadCashFlowData = async () => {
    if (!startDate || !endDate || !isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      toast({
        title: "Datas inválidas",
        description: "Por favor, selecione datas válidas para o período",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Período inválido",
        description: "A data inicial deve ser anterior à data final",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsCashFlowLoading(true);
      const formattedStartDate = startDate;
      const formattedEndDate = endDate;
      
      console.log(`Carregando fluxo de caixa para o período: ${formattedStartDate} a ${formattedEndDate}, incluir futuros: ${includeFuture}`);
      
      const [flowData, summary] = await Promise.all([
        getCashFlowByPeriod(formattedStartDate, formattedEndDate, includeFuture),
        getCashFlowSummary(formattedStartDate, formattedEndDate, includeFuture)
      ]);
      
      console.log("Dados de fluxo de caixa carregados:", flowData);
      console.log("Resumo de fluxo de caixa:", summary);
      
      setCashFlowData(flowData || []);
      setCashFlowSummary(summary);
    } catch (error: any) {
      console.error("Erro ao carregar fluxo de caixa:", error);
      toast({
        title: "Erro ao carregar fluxo de caixa",
        description: error.message || "Ocorreu um erro ao carregar os dados de fluxo de caixa",
        variant: "destructive",
      });
      setCashFlowData([]);
      setCashFlowSummary(null);
    } finally {
      setIsCashFlowLoading(false);
    }
  };

  const loadFutureLaunches = async () => {
    if (!futureStartDate || !futureEndDate || !isValidIsoDate(futureStartDate) || !isValidIsoDate(futureEndDate)) {
      toast({
        title: "Datas inválidas",
        description: "Por favor, selecione datas válidas para o período",
        variant: "destructive",
      });
      return;
    }

    if (futureStartDate > futureEndDate) {
      toast({
        title: "Período inválido",
        description: "A data inicial deve ser anterior à data final",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsFutureLoading(true);
      const formattedStartDate = futureStartDate;
      const formattedEndDate = futureEndDate;
      
      console.log(`Carregando lançamentos futuros para o período: ${formattedStartDate} a ${formattedEndDate}`);
      
      const [launches, summary] = await Promise.all([
        getFutureLaunchesByPeriod(formattedStartDate, formattedEndDate),
        getFutureLaunchesSummary(formattedStartDate, formattedEndDate)
      ]);
      
      console.log("Lançamentos futuros carregados:", launches);
      console.log("Resumo de lançamentos futuros:", summary);
      
      // Garantir que os dados são válidos antes de atualizar o estado
      if (Array.isArray(launches)) {
        setFutureLaunches(launches || []);
      } else {
        console.error("Dados de lançamentos futuros inválidos:", launches);
        setFutureLaunches([]);
      }
      
      if (summary && typeof summary === 'object') {
        setFutureSummary(summary);
      } else {
        console.error("Resumo de lançamentos futuros inválido:", summary);
        setFutureSummary(null);
      }
    } catch (error: any) {
      console.error("Erro ao carregar lançamentos futuros:", error);
      toast({
        title: "Erro ao carregar lançamentos futuros",
        description: error.message || "Ocorreu um erro ao carregar os dados de lançamentos futuros",
        variant: "destructive",
      });
      setFutureLaunches([]);
      setFutureSummary(null);
    } finally {
      setIsFutureLoading(false);
    }
  };

  // NOVA FUNÇÃO para carregar categorias por PERÍODO
  const loadCategoriesByDateRange = async () => {
    if (!categoryStartDate || !categoryEndDate || !isValidIsoDate(categoryStartDate) || !isValidIsoDate(categoryEndDate)) {
      toast({
        title: "Datas inválidas",
        description: "Por favor, selecione datas válidas para o período de categorias",
        variant: "destructive",
      });
      return;
    }

    if (categoryStartDate > categoryEndDate) {
      toast({
        title: "Período inválido",
        description: "A data inicial deve ser anterior à data final para categorias",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsChartLoading(true); // Usa o loading do gráfico
      const formattedStartDate = categoryStartDate;
      const formattedEndDate = categoryEndDate;
      
      console.log(`Carregando categorias por período: ${formattedStartDate} a ${formattedEndDate}`);
      
      // Chama a NOVA função do backend
      const data = await getCategoryDistributionByPeriod(formattedStartDate, formattedEndDate);
      
      console.log("Dados de categoria por período carregados:", data);
      setCategoryData(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias por período:", error);
      toast({
        title: "Erro ao carregar categorias",
        description: error.message || "Ocorreu um erro ao carregar os dados das categorias por período",
        variant: "destructive",
      });
      setCategoryData([]);
    } finally {
      setIsChartLoading(false);
    }
  };

  // Funções utilitárias para manipulação de datas em formato ISO
  const addDaysToIsoDate = (isoDate: string, days: number): string => {
    // Convertemos para Date para fazer a operação, depois voltamos para string ISO
    const date = new Date(isoDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const subtractDaysFromIsoDate = (isoDate: string, days: number): string => {
    const date = new Date(isoDate);
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  const getStartOfMonth = (isoDate: string): string => {
    const parts = isoDate.split('-');
    return `${parts[0]}-${parts[1]}-01`;
  };

  const getEndOfMonth = (isoDate: string): string => {
    const date = new Date(isoDate);
    date.setMonth(date.getMonth() + 1);
    date.setDate(0); // Último dia do mês
    return date.toISOString().split('T')[0];
  };

  const subtractMonthsFromIsoDate = (isoDate: string, months: number): string => {
    const date = new Date(isoDate);
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  };

  // Funções utilitárias para os filtros de data
  const applyDateRangePreset = (
    preset: string, 
    setStartFn: (date: string) => void, 
    setEndFn: (date: string) => void
  ) => {
    const today = getCurrentIsoDate();
    
    switch (preset) {
      case "today":
        setStartFn(today);
        setEndFn(today);
        break;
      case "yesterday":
        const yesterday = subtractDaysFromIsoDate(today, 1);
        setStartFn(yesterday);
        setEndFn(yesterday);
        break;
      case "thisWeek":
        // Últimos 7 dias
        setStartFn(subtractDaysFromIsoDate(today, 6));
        setEndFn(today);
        break;
      case "thisMonth":
        setStartFn(getStartOfMonth(today));
        setEndFn(today);
        break;
      case "lastMonth":
        const lastMonth = subtractMonthsFromIsoDate(today, 1);
        setStartFn(getStartOfMonth(lastMonth));
        setEndFn(getEndOfMonth(lastMonth));
        break;
      case "last30Days":
        setStartFn(subtractDaysFromIsoDate(today, 29));
        setEndFn(today);
        break;
      case "last90Days":
        setStartFn(subtractDaysFromIsoDate(today, 89));
        setEndFn(today);
        break;
      case "next30Days":
        setStartFn(today);
        setEndFn(addDaysToIsoDate(today, 30));
        break;
      case "next90Days":
        setStartFn(today);
        setEndFn(addDaysToIsoDate(today, 90));
        break;
    }
  };

  // Atualizar os fluxo de caixa
  const updateCashFlowDatePreset = (preset: string) => {
    applyDateRangePreset(preset, setStartDate, setEndDate);
    // Não carregamos automaticamente para que o usuário possa ajustar se quiser antes de aplicar
  };

  // Atualizar categorias
  const updateCategoryDatePreset = (preset: string) => {
    applyDateRangePreset(preset, setCategoryStartDate, setCategoryEndDate);
  };

  // Atualizar lançamentos futuros
  const updateFutureDatePreset = (preset: string) => {
    applyDateRangePreset(preset, setFutureStartDate, setFutureEndDate);
  };

  useEffect(() => {
    loadMonthlyBalances(year);
  }, [year]);

  useEffect(() => {
    if (selectedMonth) {
      loadCategoryDistribution(selectedMonth);
    }
  }, [selectedMonth]);

  // Verificar se há meses disponíveis para seleção e escolher o mês atual
  useEffect(() => {
    if (monthlyData.length > 0) {
      if (!selectedMonth) {
        // Tentar encontrar o mês atual (formato MM/YYYY)
        const currentMonth = getCurrentMonth();
        
        // Verificar se o mês atual está disponível nos dados
        const monthExists = monthlyData.find(item => item.month === currentMonth);
        
        if (monthExists) {
          // Se o mês atual existe nos dados, selecionar ele
          console.log(`Mês atual ${currentMonth} encontrado nos dados - selecionando`);
          setSelectedMonth(currentMonth);
        } else {
          // Se não, selecionar o mês mais recente disponível (primeiro da lista, que é o mais recente)
          console.log(`Mês atual ${currentMonth} não encontrado, usando o mais recente: ${monthlyData[0].month}`);
          setSelectedMonth(monthlyData[0].month);
        }
      }
    }
  }, [monthlyData, selectedMonth]);

  // Carregar dados específicos quando a aba muda
  useEffect(() => {
    if (activeTab === "cashflow" && startDate && endDate) {
      // Verifica se as datas estão na ordem cronológica correta
      if (startDate <= endDate) {
        loadCashFlowData();
      } else {
        console.warn("Datas invertidas no fluxo de caixa, aguardando correção do usuário.");
      }
    } else if (activeTab === "future" && futureStartDate && futureEndDate) {
      // Verifica se as datas estão na ordem cronológica correta
      if (futureStartDate <= futureEndDate) {
        loadFutureLaunches();
      } else {
        console.warn("Datas invertidas nos lançamentos futuros, aguardando correção do usuário.");
      }
    } else if (activeTab === "categories") {
      // Ao mudar para a aba de categorias, carregar dados com as datas definidas
      if (categoryStartDate && categoryEndDate) {
        // Verifica se as datas estão na ordem cronológica correta
        if (categoryStartDate <= categoryEndDate) {
          loadCategoriesByDateRange();
        } else {
          console.warn("Datas invertidas nas categorias, aguardando correção do usuário.");
        }
      }
    }
  }, [activeTab]);

  // Debug para lançamentos futuros - verificar se os dados estão sendo renderizados corretamente
  useEffect(() => {
    if (activeTab === "future") {
      console.log("Estado de lançamentos futuros atualizado:", {
        futureLaunches,
        futureSummary,
        isLoading: isFutureLoading
      });
    }
  }, [activeTab, futureLaunches, futureSummary, isFutureLoading]);

  // Formatador para a exibição do mês
  const getMonthName = (monthNumber: number) => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    return monthNames[monthNumber - 1] || `Mês ${monthNumber}`;
  };

  // Prepare formatted data for the monthly chart
  const formattedMonthlyData = monthlyData.map((item) => {
    try {
      return {
        name: getMonthName(parseInt(item.month.split('/')[0])),
        receitas: item.income || 0,
        despesas: item.expense || 0,
        saldo: item.balance || 0,
      };
    } catch (error) {
      console.error("Erro ao formatar dados mensais:", item, error);
      return {
        name: `Mês ${item.month}`,
        receitas: 0,
        despesas: 0,
        saldo: 0,
      };
    }
  }).sort((a, b) => {
    // Ordenar os meses de forma correta (janeiro a dezembro)
    const monthOrder = {
      "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4, 
      "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8, 
      "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    };
    return (monthOrder[a.name] || 0) - (monthOrder[b.name] || 0);
  });

  // Preparar dados base para Despesas
  const baseExpenseData = categoryData
    .filter(cat => cat.expenseAmount > 0)
    .map(cat => {
      const categoryName = cat.category || "Sem categoria";
      const categoryStyle = getCategoryIcon(categoryName);
      const isDefaultColor = categoryStyle.color === DEFAULT_ICON_COLOR;
      const color = !isDefaultColor ? categoryStyle.color : DEFAULT_EXPENSE_COLOR;
      return {
        name: categoryName,
        value: cat.expenseAmount,
        color: color
      }
    })
    // Ordenar aqui, pois não há mais agrupamento
    .sort((a, b) => b.value - a.value); 
    
  // Prepare data for the expense pie chart - Usar dados base diretamente
  const expensePieData = baseExpenseData;

  // Preparar dados base para Receitas
  const baseIncomeData = categoryData
    .filter(cat => cat.incomeAmount > 0)
    .map(cat => {
      const categoryName = cat.category || "Sem categoria";
      const categoryStyle = getCategoryIcon(categoryName);
      const isDefaultColor = categoryStyle.color === DEFAULT_ICON_COLOR;
      const color = !isDefaultColor ? categoryStyle.color : DEFAULT_INCOME_COLOR;
      return {
        name: categoryName,
        value: cat.incomeAmount,
        color: color
      }
    })
    // Ordenar aqui, pois não há mais agrupamento
    .sort((a, b) => b.value - a.value);

  // Prepare data for the income pie chart - Usar dados base diretamente
  const incomePieData = baseIncomeData;

  const handlePreviousYear = () => {
    setYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    const currentYear = getCurrentYear();
    if (year < currentYear) {
      setYear(prev => prev + 1);
    }
  };

  // Format the month for display
  const formatMonthDisplay = (monthStr: string) => {
    try {
      if (!monthStr) return "";
      
      const [month, year] = monthStr.split('/');
      if (!month || !year) return monthStr;
      
      return `${getMonthName(parseInt(month))} de ${year}`;
    } catch (error) {
      console.error("Erro ao formatar exibição do mês:", monthStr, error);
      return monthStr;
    }
  };

  // Formatador de percentual - Arredondar para inteiro como no Dashboard
  const formatPercent = (value: number) => {
    try {
      // Arredondar para inteiro
      return `${(value * 100).toFixed(0)}%`; 
    } catch (error) {
      return "0%";
    }
  };

  // Função para exibir datas nos componentes visuais
  const formatSafeDate = (dateString: string) => {
    try {
      if (!isValidIsoDate(dateString)) return "Data inválida";
      return formatDateForDisplay(dateString);
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return "Data inválida";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Visualize seus relatórios financeiros e análises</p>
        </div>

        {/* Botões de abas mais responsivos - Adjust padding and add min-height */}
        <div className="flex flex-nowrap overflow-x-auto pb-2 -mx-2 px-2">
          <Button
            variant={activeTab === "monthly" ? "default" : "outline"}
            className="whitespace-nowrap mr-1 text-xs sm:text-sm px-3 sm:px-4 min-h-[36px] transition-all"
            onClick={() => setActiveTab("monthly")}
          >
            Balanço Mensal
          </Button>
          <Button
            variant={activeTab === "categories" ? "default" : "outline"}
            className="whitespace-nowrap mr-1 text-xs sm:text-sm px-3 sm:px-4 min-h-[36px] transition-all"
            onClick={() => setActiveTab("categories")}
          >
            Categorias
          </Button>
          <Button
            variant={activeTab === "cashflow" ? "default" : "outline"}
            className="whitespace-nowrap mr-1 text-xs sm:text-sm px-3 sm:px-4 min-h-[36px] transition-all"
            onClick={() => setActiveTab("cashflow")}
          >
            Fluxo de Caixa
          </Button>
          <Button
            variant={activeTab === "future" ? "default" : "outline"}
            className="whitespace-nowrap mr-1 text-xs sm:text-sm px-3 sm:px-4 min-h-[36px] transition-all"
            onClick={() => setActiveTab("future")}
          >
            Lançamentos Futuros
          </Button>
        </div>

        {/* Conteúdo das abas */}
        <div className="mt-6">
          {activeTab === "monthly" && (
            <Card className="transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Balanço Mensal</CardTitle>
                <CardDescription>
                  Receitas, despesas e saldo por mês
                </CardDescription>
                <div className="flex items-center mt-4 space-x-2 flex-wrap sm:flex-nowrap">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePreviousYear()}
                    disabled={isLoading}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
                    <SelectTrigger className="w-full flex-1 min-w-[80px] sm:flex-none sm:w-auto">
                      <SelectValue defaultValue={year} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleNextYear()}
                    disabled={year >= getCurrentYear()}
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3"></div>
                    <p className="text-sm text-muted-foreground">Carregando dados mensais...</p>
                  </div>
                ) : formattedMonthlyData.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-muted-foreground">Nenhum dado encontrado para o ano selecionado</p>
                    <p className="text-sm text-muted-foreground mt-2">Tente selecionar um ano diferente ou verifique se existem transações registradas</p>
                  </div>
                ) : (
                  <div className="h-[250px] sm:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={formattedMonthlyData}
                        margin={{ top: 20, right: 10, left: 5, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                        <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 10 }} tickLine={{ stroke: "currentColor" }} />
                        <YAxis tick={{ fill: "currentColor", fontSize: 10 }} tickLine={{ stroke: "currentColor" }} tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Mês: ${label}`}
                        />
                        <Legend />
                        <Bar name="Receitas" dataKey="receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar name="Despesas" dataKey="despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Bar name="Saldo" dataKey="saldo" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "categories" && (
            <Card className="transition-all duration-300">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
                <div>
                  <CardTitle>Distribuição por Categorias</CardTitle>
                  <CardDescription>
                    Análise detalhada das suas transações por categorias
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto scale-90 origin-left sm:scale-100 sm:origin-center">
                  <RangeFilter
                    startDate={categoryStartDate}
                    endDate={categoryEndDate}
                    setStartDate={setCategoryStartDate}
                    setEndDate={setCategoryEndDate}
                    onApply={loadCategoriesByDateRange}
                    isLoading={isChartLoading}
                    presets={[
                      { label: "Mês atual", action: () => updateCategoryDatePreset("thisMonth") },
                      { label: "Mês anterior", action: () => updateCategoryDatePreset("lastMonth") },
                      { label: "Últimos 30 dias", action: () => updateCategoryDatePreset("last30Days") }
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-4 md:px-6">
                {isChartLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3"></div>
                    <p className="text-sm text-muted-foreground">Carregando dados de categorias...</p>
                  </div>
                ) : categoryData.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecione um período e clique em "Aplicar" para visualizar a distribuição por categoria.
                    </p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8 pt-4">
                    <div className="col-span-2 mb-2">
                      <h2 className="text-xl font-semibold text-center">
                        Distribuição por categoria no período de{" "}
                        {formatSafeDate(categoryStartDate)} a {formatSafeDate(categoryEndDate)}
                      </h2>
                    </div>
                    {/* Expense Distribution */}
                    <div className="flex flex-col items-center">
                      <h3 className="text-lg font-semibold mb-4 text-center">Despesas por Categoria</h3>
                      {expensePieData.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-muted-foreground">Sem despesas no período</p>
                        </div>
                      ) : (
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={expensePieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                innerRadius={40}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {expensePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Income Distribution */}
                    <div className="flex flex-col items-center">
                      <h3 className="text-lg font-semibold mb-4 text-center">Receitas por Categoria</h3>
                      {incomePieData.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-muted-foreground">Sem receitas no período</p>
                        </div>
                      ) : (
                        <div className="h-[350px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={incomePieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                outerRadius={80}
                                innerRadius={40}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {incomePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "cashflow" && (
            <Card className="transition-all duration-300">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
                <div>
                  <CardTitle>Fluxo de Caixa</CardTitle>
                  <CardDescription>
                    Análise de fluxo de caixa por período
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto scale-90 origin-left sm:scale-100 sm:origin-center">
                  <RangeFilter 
                    startDate={startDate}
                    endDate={endDate}
                    setStartDate={setStartDate}
                    setEndDate={setEndDate}
                    onApply={loadCashFlowData}
                    isLoading={isCashFlowLoading}
                    presets={[
                      { label: "Últimos 7 dias", action: () => updateCashFlowDatePreset("thisWeek") },
                      { label: "Mês atual", action: () => updateCashFlowDatePreset("thisMonth") },
                      { label: "Últimos 30 dias", action: () => updateCashFlowDatePreset("last30Days") },
                      { label: "Últimos 90 dias", action: () => updateCashFlowDatePreset("last90Days") }
                    ]}
                    includeCheckbox={{
                      id: "includeFuture",
                      label: "Incluir lançamentos futuros",
                      checked: includeFuture,
                      onCheckedChange: (checked) => setIncludeFuture(checked)
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isCashFlowLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3"></div>
                    <p className="text-sm text-muted-foreground">Carregando dados de fluxo de caixa...</p>
                  </div>
                ) : cashFlowData.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-muted-foreground">
                      Nenhum dado encontrado para o período selecionado.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecione um período e clique em "Aplicar" para visualizar o fluxo de caixa.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Sumário */}
                    {cashFlowSummary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 dark:bg-green-950 rounded-md p-4">
                          <h3 className="font-medium text-green-600 dark:text-green-400">Receitas Totais</h3>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(cashFlowSummary.totalIncome)}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Média diária: {formatCurrency(cashFlowSummary.dailyAvgIncome)}</p>
                          {cashFlowSummary.topIncomeDay && cashFlowSummary.topIncomeDay.amount > 0 && cashFlowSummary.topIncomeDay.date && (
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Maior receita: {formatCurrency(cashFlowSummary.topIncomeDay.amount)} em {
                                (() => {
                                  try {
                                    return formatSafeDate(cashFlowSummary.topIncomeDay.date);
                                  } catch (error) {
                                    console.error("Erro ao formatar data da maior receita:", error);
                                    return "data inválida";
                                  }
                                })()
                              }
                            </p>
                          )}
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 rounded-md p-4">
                          <h3 className="font-medium text-red-600 dark:text-red-400">Despesas Totais</h3>
                          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(cashFlowSummary.totalExpense)}</p>
                          <p className="text-sm text-red-600 dark:text-red-400">Média diária: {formatCurrency(cashFlowSummary.dailyAvgExpense)}</p>
                          {cashFlowSummary.topExpenseDay && cashFlowSummary.topExpenseDay.amount > 0 && cashFlowSummary.topExpenseDay.date && (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              Maior despesa: {formatCurrency(cashFlowSummary.topExpenseDay.amount)} em {
                                (() => {
                                  try {
                                    return formatSafeDate(cashFlowSummary.topExpenseDay.date);
                                  } catch (error) {
                                    console.error("Erro ao formatar data da maior despesa:", error);
                                    return "data inválida";
                                  }
                                })()
                              }
                            </p>
                          )}
                        </div>
                        <div className={`${cashFlowSummary.netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-amber-50 dark:bg-amber-950'} rounded-md p-4`}>
                          <h3 className={`font-medium ${cashFlowSummary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>Saldo Líquido</h3>
                          <p className={`text-2xl font-bold ${cashFlowSummary.netBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>{formatCurrency(cashFlowSummary.netBalance)}</p>
                          <p className={`text-sm ${cashFlowSummary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            Período: {cashFlowSummary.periodDays} dias
                          </p>
                          {cashFlowSummary.includesFutureTransactions && (
                            <p className="text-sm font-medium mt-2 text-amber-600 dark:text-amber-400">
                              *Inclui lançamentos futuros
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Gráfico de Fluxo de Caixa */}
                    <div>
                      <h3 className="font-medium text-lg mb-2">Evolução do Fluxo de Caixa</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={cashFlowData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                            <XAxis 
                              dataKey="formattedDate" 
                              tick={{ fill: "currentColor", fontSize: 10 }} 
                              tickLine={{ stroke: "currentColor" }} 
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis tick={{ fill: "currentColor", fontSize: 10 }} tickLine={{ stroke: "currentColor" }} tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(label) => `Data: ${label}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: 15 }} />
                            <Line name="Receitas" type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} activeDot={{ r: 6 }} />
                            <Line name="Despesas" type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    {/* Gráfico de Saldo Acumulado */}
                    <div>
                      <h3 className="font-medium text-lg mb-2">Saldo Acumulado no Período</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={cashFlowData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                          >
                            <defs>
                              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                            <XAxis 
                              dataKey="formattedDate" 
                              tick={{ fill: "currentColor", fontSize: 10 }} 
                              tickLine={{ stroke: "currentColor" }} 
                              angle={-45}
                              textAnchor="end"
                              height={50}
                            />
                            <YAxis tick={{ fill: "currentColor", fontSize: 10 }} tickLine={{ stroke: "currentColor" }} tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              labelFormatter={(label) => `Data: ${label}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: 15 }} />
                            <Area 
                              name="Saldo Acumulado" 
                              type="monotone" 
                              dataKey="cumulativeBalance" 
                              stroke="#3B82F6" 
                              fillOpacity={1} 
                              fill="url(#colorBalance)" 
                              strokeWidth={2} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "future" && (
            <Card className="transition-all duration-300">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2">
                <div>
                  <CardTitle>Lançamentos Futuros</CardTitle>
                  <CardDescription>
                    Análise de lançamentos futuros previstos
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto scale-90 origin-left sm:scale-100 sm:origin-center">
                  <RangeFilter
                    startDate={futureStartDate}
                    endDate={futureEndDate}
                    setStartDate={setFutureStartDate}
                    setEndDate={setFutureEndDate}
                    onApply={loadFutureLaunches}
                    isLoading={isFutureLoading}
                    presets={[
                      { label: "Próximos 30 dias", action: () => updateFutureDatePreset("next30Days") },
                      { label: "Próximos 90 dias", action: () => updateFutureDatePreset("next90Days") }
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isFutureLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3"></div>
                    <p className="text-sm text-muted-foreground">Carregando lançamentos futuros...</p>
                  </div>
                ) : futureLaunches.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-muted-foreground">
                      Nenhum lançamento futuro encontrado para o período selecionado.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Selecione um período e clique em "Aplicar" para visualizar os lançamentos futuros.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Sumário dos Lançamentos Futuros */}
                    {futureSummary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 dark:bg-green-950 rounded-md p-4">
                          <h3 className="font-medium text-green-600 dark:text-green-400">Receitas Previstas</h3>
                          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(futureSummary.totalIncome)}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">Quantidade: {futureSummary.countIncome} lançamentos</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950 rounded-md p-4">
                          <h3 className="font-medium text-red-600 dark:text-red-400">Despesas Previstas</h3>
                          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(futureSummary.totalExpense)}</p>
                          <p className="text-sm text-red-600 dark:text-red-400">Quantidade: {futureSummary.countExpense} lançamentos</p>
                        </div>
                        <div className={`${futureSummary.netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950' : 'bg-amber-50 dark:bg-amber-950'} rounded-md p-4`}>
                          <h3 className={`font-medium ${futureSummary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>Saldo Previsto</h3>
                          <p className={`text-2xl font-bold ${futureSummary.netBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>{formatCurrency(futureSummary.netBalance)}</p>
                          <p className={`text-sm ${futureSummary.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            Total: {futureSummary.totalCount} lançamentos
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Lista de Lançamentos Futuros - Renderização Dupla */}
                    <div>
                      <h3 className="font-medium text-lg mb-2">Próximos Lançamentos</h3>
                      
                      {/* Tabela para Telas Médias+ (Simplificada) */}
                       {/* Ensure overflow-x-auto is ONLY on this container */}
                      <div className="overflow-x-auto hidden md:block rounded-md border"> 
                        <table className="w-full border-collapse"> 
                          <thead>
                             {/* Headers for desktop view - Reverted to show all relevant columns */}
                             <tr className="border-b">
                              <th className="text-left font-medium p-2 w-[100px]">Data</th>
                              <th className="text-left font-medium p-2">Descrição</th>
                              <th className="text-left font-medium p-2">Categoria</th>
                              <th className="text-right font-medium p-2">Valor</th>
                              <th className="text-left font-medium p-2 w-[80px]">Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {futureLaunches.map((launch) => (
                              // Row for desktop view
                              <tr key={`${launch.id}-row-desktop`} className="border-b hover:bg-muted/50">
                                <td className="p-2">{formatSafeDate(launch.data_prevista)}</td>
                                <td className="p-2">{launch.descricao}</td> 
                                <td className="p-2">{launch.categoria_trasacoes?.descricao || 'Sem Categoria'}</td>
                                <td className="p-2 text-right">
                                  <span className={launch.tipo === 'receita' || launch.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(launch.valor)}
                                  </span>
                                </td>
                                <td className="p-2">
                                  {/* Badge for Type */}
                                  <span className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs whitespace-nowrap ${ // Added whitespace-nowrap to badge
                                    launch.tipo === 'receita' || launch.tipo === 'entrada'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                  }`}>
                                    {launch.tipo === 'receita' || launch.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Cards para Telas Pequenas (Refinados) */}
                      <div className="space-y-3 md:hidden"> 
                        {futureLaunches.map((launch) => (
                          <Card key={`${launch.id}-card-mobile`} className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              {/* Use min-w-0 to help text wrapping/truncation */}
                              <div className="flex-grow min-w-0">
                                <p className="font-semibold leading-tight break-words">{launch.descricao}</p> 
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                                  {formatSafeDate(launch.data_prevista)}
                                  <span className="mx-1">•</span>
                                  {launch.categoria_trasacoes?.descricao || 'S/ Cat.'}
                                </p>
                              </div>
                              {/* Use flex-shrink-0 to prevent value from shrinking/wrapping */}
                              <div className={`font-bold text-lg flex-shrink-0 ${launch.tipo === 'receita' || launch.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(launch.valor)}
                              </div>
                            </div>
                             <div className="mt-2">
                               {/* Badge for Type */}
                               <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${ // Added whitespace-nowrap to badge
                                  launch.tipo === 'receita' || launch.tipo === 'entrada'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                    : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {launch.tipo === 'receita' || launch.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                                </span>
                             </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    
                    {/* Distribuição por Categoria (para despesas futuras) */}
                    {futureSummary && futureSummary.categoryDistribution && futureSummary.categoryDistribution.length > 0 && (
                      <div>
                        <h3 className="font-medium text-lg mb-2">Distribuição por Categoria</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={futureSummary.categoryDistribution}
                              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/20" />
                              <XAxis 
                                dataKey="category" 
                                tick={{ fill: "currentColor", fontSize: 10 }} 
                                tickLine={{ stroke: "currentColor" }} 
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis tick={{ fill: "currentColor", fontSize: 10 }} tickLine={{ stroke: "currentColor" }} tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value} />
                              <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                labelFormatter={(label) => `Categoria: ${label}`}
                              />
                              <Legend wrapperStyle={{ paddingTop: 15 }} />
                              <Bar name="Valor Total" dataKey="total" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 