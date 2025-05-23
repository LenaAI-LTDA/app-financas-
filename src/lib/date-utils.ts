/**
 * Utilitários para manipulação de datas
 * 
 * Esta abordagem usa strings no formato ISO (YYYY-MM-DD) para evitar problemas com fusos horários
 * e comportamentos inconsistentes dos objetos Date do JavaScript.
 */

/**
 * Converte uma data ISO (YYYY-MM-DD) para o formato de exibição brasileiro (DD/MM/YYYY)
 */
export function formatDateForDisplay(dateString: string): string {
  // Verifica se a data é válida
  if (!isValidIsoDate(dateString)) {
    console.error('Data inválida:', dateString);
    return 'Data inválida';
  }
  
  // Divide a string ISO por traço e inverte a ordem
  const parts = dateString.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Converte uma data no formato brasileiro (DD/MM/YYYY) para o formato ISO (YYYY-MM-DD)
 */
export function formatDisplayToIsoDate(displayDate: string): string {
  // Divide a string por barra
  const parts = displayDate.split('/');
  if (parts.length !== 3) {
    console.error('Formato de data inválido:', displayDate);
    return '';
  }
  
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Extrai o mês de uma data no formato ISO (YYYY-MM-DD)
 */
export function extractMonthFromIsoDate(dateString: string): string {
  // Verifica se a data é válida
  if (!isValidIsoDate(dateString)) {
    console.error('Data inválida para extração de mês:', dateString);
    return '';
  }
  
  // Retorna o ano e o mês no formato YYYY-MM
  const parts = dateString.split('-');
  return `${parts[0]}-${parts[1]}`;
}

/**
 * Retorna a data atual no formato ISO (YYYY-MM-DD)
 */
export function getCurrentIsoDate(): string {
  const now = new Date();
  
  // Usa valores locais (sem UTC) para evitar problemas de fuso horário
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converte um objeto Date para uma string ISO (YYYY-MM-DD)
 * Útil para manipular saídas de componentes de calendário
 */
export function dateObjectToIsoString(dateObj: Date | undefined): string {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return getCurrentIsoDate();
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string ISO (YYYY-MM-DD) para um objeto Date
 * Útil para interagir com componentes que esperam um objeto Date
 */
export function isoStringToDateObject(isoDate: string): Date {
  // Verifica se a data é válida
  if (!isValidIsoDate(isoDate)) {
    console.error('Data ISO inválida para conversão:', isoDate);
    return new Date();
  }
  
  const [year, month, day] = isoDate.split('-').map(Number);
  
  // Cria um objeto Date com os valores locais, não em UTC
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Verifica se uma string está no formato ISO de data (YYYY-MM-DD)
 */
export function isValidIsoDate(dateString: string): boolean {
  if (!dateString) return false;
  
  // Verifica se a string está no formato correto
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  // Verifica se a data é válida
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (month < 1 || month > 12) return false;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
}

/**
 * Manipula a mudança de data vinda de um calendário
 * Converte o objeto Date para uma string ISO
 */
export function handleCalendarDateChange(dateObj: Date | undefined): string {
  return dateObjectToIsoString(dateObj);
}

/**
 * Retorna o mês atual no formato MM
 */
export function getCurrentMonth(): string {
  return getCurrentIsoDate().split('-')[1];
}

/**
 * Retorna o ano atual
 */
export function getCurrentYear(): number {
  return parseInt(getCurrentIsoDate().split('-')[0]);
} 