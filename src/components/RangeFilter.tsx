import { Button } from "@/components/ui/button";
import { CalendarIcon, ArrowRightIcon, AlertCircle } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import { useEffect, useState } from "react";
import { isValidIsoDate } from "@/lib/date-utils";

interface RangeFilterProps {
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onApply: () => void;
  isLoading?: boolean;
  presets?: {
    label: string;
    action: () => void;
  }[];
  includeCheckbox?: {
    id: string;
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  };
}

export function RangeFilter({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply,
  isLoading = false,
  presets = [],
  includeCheckbox
}: RangeFilterProps) {
  const [hasError, setHasError] = useState(false);
  
  // Verifica se a data inicial é posterior à data final
  useEffect(() => {
    if (isValidIsoDate(startDate) && isValidIsoDate(endDate)) {
      setHasError(startDate > endDate);
    }
  }, [startDate, endDate]);
  
  // Função que garante que as datas estão na ordem correta antes de aplicar
  const handleApply = () => {
    if (hasError) {
      // Se as datas estiverem na ordem errada, inverte automaticamente
      const tempStart = startDate;
      const tempEnd = endDate;
      setStartDate(tempEnd);
      setEndDate(tempStart);
      
      // Depois de corrigir, chama onApply
      setTimeout(() => {
        onApply();
      }, 100);
    } else {
      // Se estiver tudo certo, apenas chama onApply
      onApply();
    }
  };
  
  return (
    <div className="flex flex-col gap-2 w-full sm:w-auto">
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {presets.map((preset, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={preset.action}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {preset.label}
            </Button>
          ))}
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-end gap-2">
        {/* Data Inicial */}
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground mb-1 font-medium">De:</span>
          <DatePicker date={startDate} setDate={setStartDate} />
        </div>
        
        {/* Seta indicativa de direção */}
        <div className="hidden sm:flex items-center mx-1 mb-2">
          <ArrowRightIcon className={`h-4 w-4 ${hasError ? 'text-red-500' : 'text-muted-foreground'}`} />
        </div>
        
        {/* Data Final */}
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground mb-1 font-medium">Até:</span>
          <DatePicker date={endDate} setDate={setEndDate} />
        </div>
        
        {/* Área do checkbox e botão */}
        <div className="flex flex-col sm:ml-2 w-full sm:w-auto">
          {includeCheckbox && (
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id={includeCheckbox.id}
                checked={includeCheckbox.checked}
                onChange={(e) => includeCheckbox.onCheckedChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label
                htmlFor={includeCheckbox.id}
                className="ml-2 text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {includeCheckbox.label}
              </label>
            </div>
          )}
          
          <Button
            className="w-full"
            onClick={handleApply}
            disabled={isLoading}
          >
            {isLoading ? "Carregando..." : "Aplicar"}
          </Button>
        </div>
      </div>
      
      {/* Alerta visual se data inicial > data final */}
      {hasError && (
        <div className="text-xs text-red-500 mt-1 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Datas invertidas! Ao clicar em Aplicar, vamos ajustar automaticamente.
        </div>
      )}
    </div>
  );
} 