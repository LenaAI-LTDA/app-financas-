import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Helper function to get the current user ID
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

// Helper function to get the numeric user ID from the 'usuarios' table
export const getUserNumericId = async (): Promise<number | null> => {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_user', userId)
      .single();
    
    if (error) throw error;
    
    return data?.id || null;
  } catch (error) {
    console.error('Error getting user numeric ID:', error);
    return null;
  }
};

// Helper function to create the lancamentos_futuros table if it doesn't exist
export const createFutureTransactionsTable = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS lancamentos_futuros (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL,
          tipo TEXT NOT NULL,
          data_prevista DATE NOT NULL,
          descricao TEXT NOT NULL,
          valor DECIMAL(10,2) NOT NULL,
          categoria_id INTEGER REFERENCES categoria_trasacoes(id),
          mes_previsto TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pendente',
          data_efetivacao DATE,
          transacao_id INTEGER REFERENCES transacoes(id),
          recorrente TEXT DEFAULT 'FALSE',
          periodicidade TEXT,
          parcelamento TEXT DEFAULT 'FALSE',
          numero_parcelas INTEGER,
          parcela_atual INTEGER,
          pagador_recebedor TEXT,
          ultima_atualizacao TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS lancamentos_futuros_usuario_id_idx ON lancamentos_futuros(usuario_id);
        CREATE INDEX IF NOT EXISTS lancamentos_futuros_mes_previsto_idx ON lancamentos_futuros(mes_previsto);
      `
    });
    
    if (error) {
      console.error('Erro ao criar tabela de lançamentos futuros:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar tabela de lançamentos futuros:', error);
    return false;
  }
};

// Função para criar um lançamento futuro
export const createFutureTransaction = async (
  tipo: string,
  dataPrevista: Date,
  descricao: string,
  valor: number,
  categoriaId: number | null,
  recorrente: boolean = false,
  periodicidade?: string,
  parcelamento: boolean = false,
  numeroParcelas?: number,
  parcelaAtual: number = 1
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    // Obter o ID numérico do usuário
    const numericUserId = await getUserNumericId();
    
    if (!numericUserId) {
      console.error('ID do usuário não encontrado');
      return { success: false, error: 'ID do usuário não encontrado' };
    }
    
    // Formatar o mês previsto
    const mesPrevisto = `${dataPrevista.getFullYear()}-${String(dataPrevista.getMonth() + 1).padStart(2, '0')}`;
    
    // Inserir o lançamento futuro
    const { data, error } = await supabase
      .from('lancamentos_futuros')
      .insert({
        usuario_id: numericUserId,
        tipo,
        data_prevista: dataPrevista.toISOString(),
        descricao,
        valor,
        categoria_id: categoriaId,
        mes_previsto: mesPrevisto,
        status: 'pendente',
        recorrente: recorrente ? 'TRUE' : 'FALSE',
        periodicidade: recorrente ? periodicidade : null,
        parcelamento: parcelamento ? 'TRUE' : 'FALSE',
        numero_parcelas: parcelamento ? numeroParcelas : null,
        parcela_atual: parcelamento ? parcelaAtual : null
      })
      .select();
      
    if (error) {
      console.error('Erro ao criar lançamento futuro:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('Erro ao criar lançamento futuro:', error);
    return { success: false, error };
  }
}

// Função para efetivar um lançamento futuro (converter em transação real)
export const effectuateFutureTransaction = async (
  futureTransactionId: number
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    // Obter dados do lançamento futuro
    const { data: futureTransaction, error: fetchError } = await supabase
      .from('lancamentos_futuros')
      .select('*')
      .eq('id', futureTransactionId)
      .single();
      
    if (fetchError || !futureTransaction) {
      console.error('Erro ao obter lançamento futuro:', fetchError);
      return { success: false, error: fetchError || 'Lançamento não encontrado' };
    }
    
    // Criar a transação real
    const { data: transaction, error: createError } = await supabase
      .from('transacoes')
      .insert({
        usuario_id: futureTransaction.usuario_id,
        tipo: futureTransaction.tipo,
        data: new Date().toISOString(),
        descricao: futureTransaction.descricao,
        valor: futureTransaction.valor,
        categoria_id: futureTransaction.categoria_id,
        mes: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      })
      .select();
      
    if (createError) {
      console.error('Erro ao criar transação:', createError);
      return { success: false, error: createError };
    }
    
    // Atualizar o status do lançamento futuro
    const { error: updateError } = await supabase
      .from('lancamentos_futuros')
      .update({
        status: 'pago',
        data_efetivacao: new Date().toISOString(),
        transacao_id: transaction[0].id
      })
      .eq('id', futureTransactionId);
      
    if (updateError) {
      console.error('Erro ao atualizar lançamento futuro:', updateError);
      return { success: false, error: updateError };
    }
    
    // Se for um lançamento recorrente, criar a próxima recorrência
    if (futureTransaction.recorrente === 'TRUE' && futureTransaction.periodicidade) {
      try {
        const nextDate = calculateNextRecurrenceDate(
          new Date(futureTransaction.data_prevista), 
          futureTransaction.periodicidade
        );
        
        await createFutureTransaction(
          futureTransaction.tipo,
          nextDate,
          futureTransaction.descricao,
          futureTransaction.valor,
          futureTransaction.categoria_id,
          true,
          futureTransaction.periodicidade
        );
      } catch (recurrenceError) {
        console.error('Erro ao criar próxima recorrência:', recurrenceError);
        // Não falharemos a operação principal se a criação da recorrência falhar
      }
    }
    
    // Não precisamos criar próximas parcelas, pois todas já foram criadas no momento inicial
    // Removemos o código que criava a próxima parcela aqui
    
    return { success: true, data: transaction };
    
  } catch (error) {
    console.error('Erro ao efetivar lançamento futuro:', error);
    return { success: false, error };
  }
}

// Função auxiliar para calcular a próxima data de recorrência
const calculateNextRecurrenceDate = (currentDate: Date, periodicidade: string): Date => {
  const nextDate = new Date(currentDate);
  
  switch (periodicidade) {
    case 'diario':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'semanal':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'quinzenal':
      nextDate.setDate(nextDate.getDate() + 15);
      break;
    case 'mensal':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'bimestral':
      nextDate.setMonth(nextDate.getMonth() + 2);
      break;
    case 'trimestral':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semestral':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'anual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setMonth(nextDate.getMonth() + 1); // padrão: mensal
  }
  
  return nextDate;
};
