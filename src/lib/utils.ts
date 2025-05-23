import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL'
  }).format(value);
}

// Observação: todas as funções de data foram movidas para o arquivo date-utils.ts
// Isso garante uma abordagem uniforme para manipulação de datas em todo o projeto
// utilizando strings ISO para evitar problemas de fuso horário
