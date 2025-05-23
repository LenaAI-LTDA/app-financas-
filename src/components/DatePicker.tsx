import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { 
  formatDateForDisplay,
  isoStringToDateObject,
  handleCalendarDateChange
} from "@/lib/date-utils";

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  placeholder?: string;
}

export function DatePicker({ date, setDate, placeholder = "Selecione uma data" }: DatePickerProps) {
  // Converter a string ISO para objeto Date para o componente Calendar
  const dateObject = date ? isoStringToDateObject(date) : undefined;
  
  // Função para lidar com a mudança de data
  const handleDateChange = (selectedDate: Date | undefined) => {
    // Converter de volta para string ISO
    const isoDate = handleCalendarDateChange(selectedDate);
    setDate(isoDate);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className="w-full justify-start text-left font-normal"
        >
          {date ? (
            <span>{formatDateForDisplay(date)}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateObject}
          onSelect={handleDateChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
} 