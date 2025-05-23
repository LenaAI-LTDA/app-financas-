import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCurrentMonth, getCurrentYear } from '@/lib/date-utils';

interface MonthSelectorProps {
  onMonthChange: (month: string, year: number) => void;
}

const MonthSelector = ({ onMonthChange }: MonthSelectorProps) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState(getCurrentYear().toString());
  const [openPopover, setOpenPopover] = useState(false);
  
  // Efeito para chamar onMonthChange quando o componente é montado
  useEffect(() => {
    onMonthChange(selectedMonth, parseInt(selectedYear));
  }, []);

  // Manipular a mudança para o mês anterior
  const handlePreviousMonth = () => {
    let newMonth = parseInt(selectedMonth);
    let newYear = parseInt(selectedYear);
    
    // Decrementa o mês, ajustando o ano se necessário
    if (newMonth === 1) {
      newMonth = 12;
      newYear -= 1;
    } else {
      newMonth -= 1;
    }
    
    // Formata o mês com zero à esquerda
    const formattedMonth = newMonth.toString().padStart(2, '0');
    
    // Atualiza os estados
    setSelectedMonth(formattedMonth);
    setSelectedYear(newYear.toString());
    
    // Notifica o componente pai
    onMonthChange(formattedMonth, newYear);
  };

  // Manipular a mudança para o próximo mês
  const handleNextMonth = () => {
    let newMonth = parseInt(selectedMonth);
    let newYear = parseInt(selectedYear);
    
    // Incrementa o mês, ajustando o ano se necessário
    if (newMonth === 12) {
      newMonth = 1;
      newYear += 1;
    } else {
      newMonth += 1;
    }
    
    // Formata o mês com zero à esquerda
    const formattedMonth = newMonth.toString().padStart(2, '0');
    
    // Atualiza os estados
    setSelectedMonth(formattedMonth);
    setSelectedYear(newYear.toString());
    
    // Notifica o componente pai
    onMonthChange(formattedMonth, newYear);
  };

  // Manipular a seleção direta de mês e ano
  const handleMonthYearSelect = () => {
    // Notifica o componente pai com os valores selecionados
    onMonthChange(selectedMonth, parseInt(selectedYear));
    setOpenPopover(false);
  };

  // Mapeia nomes de meses em português
  const getMonthName = (monthNum: string): string => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return monthNames[parseInt(monthNum) - 1];
  };
  
  // Lista de meses para o seletor
  const months = Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const monthStr = monthNum.toString().padStart(2, '0');
    return {
      value: monthStr,
      label: getMonthName(monthStr)
    }
  });
  
  // Lista de anos para o seletor (últimos 2 anos até os próximos 7)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => (currentYear - 2 + i).toString());
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePreviousMonth}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="font-medium">
              {getMonthName(selectedMonth)} {selectedYear}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-4 w-[300px]">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Selecionar mês e ano</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-sm">Mês</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm">Ano</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full mt-2" onClick={handleMonthYearSelect}>
                Ir para este mês
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handleNextMonth}
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthSelector;
