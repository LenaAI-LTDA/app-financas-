import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  onClear: () => void;
  children: React.ReactNode;
  className?: string;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  title = "Filtros",
  isOpen,
  onClose,
  onApply,
  onClear,
  children,
  className,
}) => {
  // Estado interno para armazenar filtros temporários
  const [filters, setFilters] = React.useState<any>({});
  
  // Referência para o formulário para acesso direto
  const formRef = React.useRef<HTMLFormElement>(null);
  
  // Ao fechar o painel, resetar os filtros temporários
  React.useEffect(() => {
    if (!isOpen) {
      setFilters({});
    }
  }, [isOpen]);
  
  // Handler para aplicar os filtros
  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };
  
  // Handler para limpar os filtros
  const handleClear = () => {
    setFilters({});
    onClear();
  };
  
  if (!isOpen) return null;
  
  return (
    <Card className={cn("w-full shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar painel de filtros"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleApply} ref={formRef}>
          <div className="space-y-4">
            {/* Conteúdo do filtro (passado como children) */}
            {children}
            
            {/* Botões de ação */}
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                size="sm"
              >
                Limpar
              </Button>
              <Button type="submit" size="sm">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Componente de campo de filtro
interface FilterFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const FilterField: React.FC<FilterFieldProps> = ({
  label,
  children,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
};

FilterPanel.Field = FilterField;

export { FilterPanel }; 