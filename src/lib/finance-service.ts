import { supabase } from '@/integrations/supabase/client';
import { getUserNumericId } from '@/lib/supabase';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, addDays } from 'date-fns';

// Types necessárias para os relatórios
export type MonthlyBalance = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export type CategoryDistribution = {
  categoryId: number;
  category: string;
  incomeAmount: number;
  expenseAmount: number;
};

export type CashFlowData = {
  date: string;
  formattedDate: string;
  income: number;
  expense: number;
  balance: number;
  cumulativeBalance: number;
  hasFutureTransactions?: boolean;
};

export type CashFlowSummary = {
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

export type FutureLaunch = {
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

export type FutureLaunchesSummary = {
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

/**
 * Função auxiliar para garantir que startDate seja sempre anterior a endDate
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @returns Array com as datas ordenadas [dataAnterior, dataPosterior]
 */
function ensureCorrectDateOrder(startDate: string, endDate: string): [string, string] {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Se as datas estiverem na ordem errada, inverte
    if (start > end) {
      console.warn(`Datas invertidas detectadas: startDate (${startDate}) > endDate (${endDate}). Corrigindo automaticamente.`);
      return [endDate, startDate];
    }
    
    return [startDate, endDate];
  } catch (error) {
    console.error("Erro ao verificar ordem das datas:", error);
    return [startDate, endDate]; // Retorna as datas originais em caso de erro
  }
}

/**
 * Obtém os balanços mensais para o ano especificado.
 * @param year Ano para o qual deseja-se obter os balanços
 * @returns Array de objetos com os balanços mensais
 */
export async function getMonthlyBalances(year: number): Promise<MonthlyBalance[]> {
  try {
    const userId = await getUserNumericId();
    if (!userId) {
      throw new Error("Usuário não encontrado");
    }

    console.log(`Buscando balanços para o ano ${year}`);

    // Buscamos transações que possam usar o novo formato (YYYY-MM)
    const { data: transactionsNewFormat, error: errorNewFormat } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .like('mes', `${year}-%`);

    if (errorNewFormat) {
      console.error("Erro ao buscar transações com novo formato:", errorNewFormat);
    }
    
    console.log(`Transações (novo formato YYYY-MM) encontradas: ${transactionsNewFormat?.length || 0}`);
    
    // É possível que algumas transações ainda usem o formato antigo (MM/YYYY)
    // Então também buscamos transações com o formato antigo
    let transactionsOldFormat: any[] = [];
    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .eq('usuario_id', userId)
        .eq('mes', `${monthStr}/${year}`);
        
      if (error) {
        console.error(`Erro ao buscar transações para mês ${monthStr}/${year}:`, error);
      } else if (data && data.length > 0) {
        transactionsOldFormat = [...transactionsOldFormat, ...data];
      }
    }
    
    console.log(`Transações (formato antigo MM/YYYY) encontradas: ${transactionsOldFormat?.length || 0}`);
    
    // Combinamos as transações de ambos os formatos
    const transactions = [...(transactionsNewFormat || []), ...transactionsOldFormat];
    
    console.log(`Total de transações combinadas: ${transactions.length}`);
    console.log('Amostra de transações:', transactions.slice(0, 3));

    // Agora, agregamos por mês
    const monthlyData: Record<string, MonthlyBalance> = {};

    // Inicializamos todos os meses do ano com zeros
    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, '0');
      const monthKey = `${monthStr}/${year}`;
      monthlyData[monthKey] = {
        month: monthKey,
        income: 0,
        expense: 0,
        balance: 0
      };
    }

    // Calculamos os totais para cada mês
    transactions.forEach(transaction => {
      try {
        // Tentamos extrair o mês tanto no formato YYYY-MM quanto no formato MM/YYYY
        let month, year;
        
        if (transaction.mes.includes('-')) {
          // Formato YYYY-MM
          const mesAno = transaction.mes.split('-');
          if (mesAno.length !== 2) {
            console.warn(`Formato inválido para mes: ${transaction.mes}`);
            return;
          }
          year = mesAno[0];
          month = mesAno[1];
        } else if (transaction.mes.includes('/')) {
          // Formato MM/YYYY
          const mesAno = transaction.mes.split('/');
          if (mesAno.length !== 2) {
            console.warn(`Formato inválido para mes: ${transaction.mes}`);
            return;
          }
          month = mesAno[0];
          year = mesAno[1];
        } else {
          console.warn(`Formato não reconhecido para mes: ${transaction.mes}`);
          return;
        }
        
        // Validamos o ano
        if (Number(year) !== Number(year)) {
          console.warn(`Ano inválido: ${year} em ${transaction.mes}`);
          return;
        }
        
        const monthKey = `${month}/${year}`;
        
        console.log(`Processando transação: mes=${transaction.mes}, tipo=${transaction.tipo}, valor=${transaction.valor}, monthKey=${monthKey}`);

        // Inicializa o mês se ainda não existir
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            income: 0,
            expense: 0,
            balance: 0
          };
        }

        // Adiciona o valor ao total do mês
        if (transaction.tipo === 'entrada') {
          monthlyData[monthKey].income += Number(transaction.valor);
        } else if (transaction.tipo === 'saida') {
          monthlyData[monthKey].expense += Number(transaction.valor);
        }
      } catch (error) {
        console.error("Erro ao processar transação:", error, transaction);
      }
    });

    // Calcula o saldo para cada mês
    Object.values(monthlyData).forEach(data => {
      data.balance = data.income - data.expense;
    });

    // Converte o objeto em array e ordena por mês (decrescente)
    const result = Object.values(monthlyData)
      .filter(data => data.income > 0 || data.expense > 0)
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/').map(Number);
        const [bMonth, bYear] = b.month.split('/').map(Number);
        
        if (aYear !== bYear) return bYear - aYear;
        return bMonth - aMonth;
      });
      
    console.log(`Resultado final de balanços mensais: ${result.length} meses`);
    console.log('Balanços mensais:', result);
    
    return result;

  } catch (error) {
    console.error("Erro ao obter balanços mensais:", error);
    throw error;
  }
}

/**
 * Obtém a distribuição por categoria para um determinado mês.
 * @param month Mês no formato MM/YYYY
 * @returns Array de objetos com a distribuição por categoria
 */
export async function getCategoryDistribution(month: string): Promise<CategoryDistribution[]> {
  try {
    const userId = await getUserNumericId();
    if (!userId) {
      throw new Error("Usuário não encontrado");
    }

    // Converte o mês do formato MM/YYYY para YYYY-MM
    const [monthNumber, year] = month.split('/');
    const formattedMonth = `${year}-${monthNumber}`;

    console.log(`Buscando distribuição de categorias para o mês ${month}, formatado como ${formattedMonth}`);

    // Busca todas as transações do mês com o novo formato YYYY-MM
    const { data: transactionsNewFormat, error: errorNewFormat } = await supabase
      .from('transacoes')
      .select(`
        *,
        categoria_trasacoes:categoria_id (
          id,
          descricao
        )
      `)
      .eq('usuario_id', userId)
      .eq('mes', formattedMonth);

    if (errorNewFormat) {
      console.error("Erro ao buscar transações com novo formato:", errorNewFormat);
    }
    
    console.log(`Transações (novo formato YYYY-MM) encontradas: ${transactionsNewFormat?.length || 0}`);

    // Busca também transações com o formato antigo MM/YYYY
    const { data: transactionsOldFormat, error: errorOldFormat } = await supabase
      .from('transacoes')
      .select(`
        *,
        categoria_trasacoes:categoria_id (
          id,
          descricao
        )
      `)
      .eq('usuario_id', userId)
      .eq('mes', month); // Formato original MM/YYYY
      
    if (errorOldFormat) {
      console.error("Erro ao buscar transações com formato antigo:", errorOldFormat);
    }
    
    console.log(`Transações (formato antigo MM/YYYY) encontradas: ${transactionsOldFormat?.length || 0}`);
    
    // Combinamos as transações de ambos os formatos
    const transactions = [...(transactionsNewFormat || []), ...(transactionsOldFormat || [])];
    
    console.log(`Total de transações combinadas: ${transactions.length}`);
    console.log('Amostra de transações:', transactions.slice(0, 3));

    // Agrega por categoria
    const categoryMap: Record<number, CategoryDistribution> = {};

    transactions.forEach(transaction => {
      try {
        const categoryId = transaction.categoria_id || 0;
        const categoryName = transaction.categoria_trasacoes?.descricao || "Sem categoria";

        // Inicializa a categoria se ainda não existir
        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            categoryId,
            category: categoryName,
            incomeAmount: 0,
            expenseAmount: 0
          };
        }

        // Adiciona o valor ao total da categoria
        if (transaction.tipo === 'entrada') {
          categoryMap[categoryId].incomeAmount += Number(transaction.valor);
        } else if (transaction.tipo === 'saida') {
          categoryMap[categoryId].expenseAmount += Number(transaction.valor);
        }
      } catch (error) {
        console.error("Erro ao processar transação para categoria:", error, transaction);
      }
    });

    const result = Object.values(categoryMap);
    console.log(`Distribuição por categorias: ${result.length} categorias encontradas`);
    
    return result;

  } catch (error) {
    console.error("Erro ao obter distribuição por categoria:", error);
    throw error;
  }
}

/**
 * Obtém a distribuição por categoria para um determinado PERÍODO.
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @returns Array de objetos com a distribuição por categoria no período
 */
export async function getCategoryDistributionByPeriod(
  startDate: string,
  endDate: string
): Promise<CategoryDistribution[]> {
  try {
    // Garante que as datas estejam na ordem correta
    const [correctStartDate, correctEndDate] = ensureCorrectDateOrder(startDate, endDate);

    console.log(`Buscando distribuição por categoria para o período: ${correctStartDate} a ${correctEndDate}`);

    const userId = await getUserNumericId();
    if (!userId) {
      throw new Error("Usuário não encontrado");
    }

    // Busca todas as transações do PERÍODO usando a coluna 'data'
    const { data: transactions, error } = await supabase
      .from('transacoes')
      .select(`
        *,
        categoria_trasacoes:categoria_id (
          id,
          descricao
        )
      `)
      .eq('usuario_id', userId)
      .gte('data', correctStartDate) // Filtra pela data inicial
      .lte('data', correctEndDate);  // Filtra pela data final

    if (error) {
      console.error("Erro ao buscar transações por período:", error);
      throw error;
    }
    
    console.log(`Transações encontradas para o período: ${transactions?.length || 0}`);
    console.log('Amostra de transações do período:', transactions?.slice(0, 3));

    // Agrega por categoria (mesma lógica da função por mês)
    const categoryMap: Record<number, CategoryDistribution> = {};

    transactions?.forEach(transaction => {
      try {
        const categoryId = transaction.categoria_id || 0;
        const categoryName = transaction.categoria_trasacoes?.descricao || "Sem categoria";

        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            categoryId,
            category: categoryName,
            incomeAmount: 0,
            expenseAmount: 0
          };
        }

        if (transaction.tipo === 'entrada') {
          categoryMap[categoryId].incomeAmount += Number(transaction.valor);
        } else if (transaction.tipo === 'saida') {
          categoryMap[categoryId].expenseAmount += Number(transaction.valor);
        }
      } catch (e) {
        console.error("Erro ao processar transação para categoria por período:", e, transaction);
      }
    });

    const result = Object.values(categoryMap);
    console.log(`Distribuição por categorias no período: ${result.length} categorias encontradas`);
    
    return result;

  } catch (error) {
    console.error("Erro ao obter distribuição por categoria por período:", error);
    throw error;
  }
}

/**
 * Obtém os dados de fluxo de caixa para um período.
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @param includeFuture Indica se deve incluir lançamentos futuros
 * @returns Array de objetos com os dados de fluxo de caixa
 */
export async function getCashFlowByPeriod(
  startDate: string, 
  endDate: string, 
  includeFuture: boolean = false
): Promise<CashFlowData[]> {
  try {
    // Garante que as datas estejam na ordem correta
    const [correctStartDate, correctEndDate] = ensureCorrectDateOrder(startDate, endDate);
    
    const userId = await getUserNumericId();
    if (!userId) {
      throw new Error("Usuário não encontrado");
    }

    // Busca todas as transações no período
    const { data: transactions, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('usuario_id', userId)
      .gte('data', correctStartDate)
      .lte('data', correctEndDate)
      .order('data', { ascending: true });

    if (error) throw error;

    // Busca lançamentos futuros se solicitado
    let futureTransactions: any[] = [];
    if (includeFuture) {
      const { data, error: futureError } = await supabase
        .from('lancamentos_futuros')
        .select('*')
        .eq('usuario_id', userId)
        .eq('status', 'pendente')
        .gte('data_prevista', correctStartDate)
        .lte('data_prevista', correctEndDate)
        .order('data_prevista', { ascending: true });

      if (futureError) {
        console.error("Erro ao buscar lançamentos futuros:", futureError);
      } else {
        futureTransactions = data || [];
      }
    }

    // Cria um intervalo com todas as datas do período
    const start = parseISO(correctStartDate);
    const end = parseISO(correctEndDate);
    const dateRange = eachDayOfInterval({ start, end });

    // Inicializa o objeto com as datas do período
    const cashFlowMap: Record<string, CashFlowData> = {};
    
    dateRange.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      cashFlowMap[dateStr] = {
        date: dateStr,
        formattedDate: format(date, 'dd/MM/yyyy'),
        income: 0,
        expense: 0,
        balance: 0,
        cumulativeBalance: 0,
        hasFutureTransactions: false
      };
    });

    // Adiciona as transações realizadas
    transactions?.forEach(transaction => {
      try {
        const dateStr = transaction.data;
        if (!cashFlowMap[dateStr]) {
          const date = parseISO(dateStr);
          cashFlowMap[dateStr] = {
            date: dateStr,
            formattedDate: format(date, 'dd/MM/yyyy'),
            income: 0,
            expense: 0,
            balance: 0,
            cumulativeBalance: 0,
            hasFutureTransactions: false
          };
        }

        if (transaction.tipo === 'entrada') {
          cashFlowMap[dateStr].income += Number(transaction.valor);
        } else if (transaction.tipo === 'saida') {
          cashFlowMap[dateStr].expense += Number(transaction.valor);
        }
      } catch (error) {
        console.error("Erro ao processar transação para fluxo de caixa:", error);
      }
    });

    // Adiciona os lançamentos futuros
    futureTransactions.forEach(transaction => {
      try {
        const dateStr = transaction.data_prevista;
        if (!cashFlowMap[dateStr]) {
          const date = parseISO(dateStr);
          cashFlowMap[dateStr] = {
            date: dateStr,
            formattedDate: format(date, 'dd/MM/yyyy'),
            income: 0,
            expense: 0,
            balance: 0,
            cumulativeBalance: 0,
            hasFutureTransactions: true
          };
        } else {
          cashFlowMap[dateStr].hasFutureTransactions = true;
        }

        if (transaction.tipo === 'entrada') {
          cashFlowMap[dateStr].income += Number(transaction.valor);
        } else if (transaction.tipo === 'saida') {
          cashFlowMap[dateStr].expense += Number(transaction.valor);
        }
      } catch (error) {
        console.error("Erro ao processar lançamento futuro para fluxo de caixa:", error);
      }
    });

    // Calcula o saldo diário e o saldo acumulado
    let cumulativeBalance = 0;
    const cashFlowData = Object.values(cashFlowMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(daily => {
        daily.balance = daily.income - daily.expense;
        cumulativeBalance += daily.balance;
        daily.cumulativeBalance = cumulativeBalance;
        return daily;
      });

    return cashFlowData;

  } catch (error) {
    console.error("Erro ao obter fluxo de caixa:", error);
    throw error;
  }
}

/**
 * Obtém o resumo do fluxo de caixa para um período.
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @param includeFuture Indica se deve incluir lançamentos futuros
 * @returns Objeto com o resumo do fluxo de caixa
 */
export async function getCashFlowSummary(
  startDate: string, 
  endDate: string, 
  includeFuture: boolean = false
): Promise<CashFlowSummary> {
  try {
    // Garante que as datas estejam na ordem correta
    const [correctStartDate, correctEndDate] = ensureCorrectDateOrder(startDate, endDate);
    
    const cashFlowData = await getCashFlowByPeriod(correctStartDate, correctEndDate, includeFuture);
    
    const start = parseISO(correctStartDate);
    const end = parseISO(correctEndDate);
    const periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    // Inicializa o resumo
    const summary: CashFlowSummary = {
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      dailyAvgIncome: 0,
      dailyAvgExpense: 0,
      periodDays,
      topExpenseDay: { date: "", amount: 0 },
      topIncomeDay: { date: "", amount: 0 },
      includesFutureTransactions: includeFuture,
      hasFutureData: cashFlowData.some(day => day.hasFutureTransactions)
    };
    
    // Calcula os totais e identifica os dias com maiores valores
    cashFlowData.forEach(day => {
      summary.totalIncome += day.income;
      summary.totalExpense += day.expense;
      
      if (day.income > summary.topIncomeDay.amount) {
        summary.topIncomeDay = { date: day.date, amount: day.income };
      }
      
      if (day.expense > summary.topExpenseDay.amount) {
        summary.topExpenseDay = { date: day.date, amount: day.expense };
      }
    });
    
    // Calcula o saldo e as médias diárias
    summary.netBalance = summary.totalIncome - summary.totalExpense;
    summary.dailyAvgIncome = summary.totalIncome / periodDays;
    summary.dailyAvgExpense = summary.totalExpense / periodDays;
    
    return summary;
    
  } catch (error) {
    console.error("Erro ao obter resumo do fluxo de caixa:", error);
    throw error;
  }
}

/**
 * Obtém os lançamentos futuros para um período.
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @returns Array de objetos com os lançamentos futuros
 */
export async function getFutureLaunchesByPeriod(
  startDate: string, 
  endDate: string
): Promise<FutureLaunch[]> {
  try {
    // Garante que as datas estejam na ordem correta
    const [correctStartDate, correctEndDate] = ensureCorrectDateOrder(startDate, endDate);
    
    const userId = await getUserNumericId();
    if (!userId) {
      throw new Error("Usuário não encontrado");
    }

    // Busca todos os lançamentos futuros no período
    const { data, error } = await supabase
      .from('lancamentos_futuros')
      .select(`
        *,
        categoria_trasacoes:categoria_id (
          descricao
        )
      `)
      .eq('usuario_id', userId)
      .eq('status', 'pendente')
      .gte('data_prevista', correctStartDate)
      .lte('data_prevista', correctEndDate)
      .order('data_prevista', { ascending: true });

    if (error) throw error;

    return data || [];

  } catch (error) {
    console.error("Erro ao obter lançamentos futuros:", error);
    throw error;
  }
}

/**
 * Obtém o resumo dos lançamentos futuros para um período.
 * @param startDate Data inicial no formato YYYY-MM-DD
 * @param endDate Data final no formato YYYY-MM-DD
 * @returns Objeto com o resumo dos lançamentos futuros
 */
export async function getFutureLaunchesSummary(
  startDate: string, 
  endDate: string
): Promise<FutureLaunchesSummary> {
  try {
    // Garante que as datas estejam na ordem correta
    const [correctStartDate, correctEndDate] = ensureCorrectDateOrder(startDate, endDate);
    
    const futureLaunches = await getFutureLaunchesByPeriod(correctStartDate, correctEndDate);
    
    console.log("Lançamentos futuros recebidos:", futureLaunches);
    
    // Inicializa o resumo
    const summary: FutureLaunchesSummary = {
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      countIncome: 0,
      countExpense: 0,
      totalCount: 0,
      categoryDistribution: []
    };
    
    // Mapeia as categorias
    const categoryMap: Record<number, { 
      category: string; 
      total: number; 
      count: number;
    }> = {};
    
    // Calcula os totais
    futureLaunches.forEach(launch => {
      try {
        // Verificar se os dados são válidos
        if (!launch || typeof launch.valor !== 'number' && isNaN(Number(launch.valor))) {
          console.warn("Lançamento com valor inválido:", launch);
          return; // Pula este lançamento
        }
        
        const valor = Number(launch.valor);
        
        // Padronização dos tipos - corrigido para aceitar ambos os formatos
        if (launch.tipo === 'receita' || launch.tipo === 'entrada') {
          summary.totalIncome += valor;
          summary.countIncome++;
          console.log(`Adicionando receita: ${launch.descricao}, valor: ${valor}`);
        } else if (launch.tipo === 'despesa' || launch.tipo === 'saida') {
          summary.totalExpense += valor;
          summary.countExpense++;
          console.log(`Adicionando despesa: ${launch.descricao}, valor: ${valor}`);
        } else {
          console.warn(`Tipo de lançamento não reconhecido: ${launch.tipo}. Assumindo como despesa.`);
          summary.totalExpense += valor;
          summary.countExpense++;
        }
        
        // Distribui por categoria
        const categoryId = launch.categoria_id || 0;
        const categoryName = launch.categoria_trasacoes?.descricao || "Sem categoria";
        
        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            category: categoryName,
            total: 0,
            count: 0
          };
        }
        
        categoryMap[categoryId].total += valor;
        categoryMap[categoryId].count += 1;
        
      } catch (error) {
        console.error("Erro ao processar lançamento futuro para resumo:", error, launch);
      }
    });
    
    // Calcula o saldo e o total de lançamentos
    summary.netBalance = summary.totalIncome - summary.totalExpense;
    summary.totalCount = summary.countIncome + summary.countExpense;
    
    // Converte o mapa de categorias em array
    summary.categoryDistribution = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total);
    
    console.log("Resumo calculado:", summary);
    
    return summary;
    
  } catch (error) {
    console.error("Erro ao obter resumo de lançamentos futuros:", error);
    throw error;
  }
} 