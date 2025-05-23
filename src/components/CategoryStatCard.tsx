import React from 'react';
import { cn } from '@/lib/utils';
import CategoryIcon from './CategoryIcon';
import { Progress } from './ui/progress';
import { formatCurrency } from '@/lib/utils';

interface CategoryStatProps {
  name: string;
  value: number;
  totalValue: number;
  percentage?: number;
  showPercentage?: boolean;
  showValue?: boolean;
  showProgress?: boolean;
  className?: string;
}

const CategoryStatCard: React.FC<CategoryStatProps> = ({
  name,
  value,
  totalValue,
  percentage: providedPercentage,
  showPercentage = true,
  showValue = true,
  showProgress = true,
  className,
}) => {
  // Calcular a porcentagem se não fornecida
  const percentage = providedPercentage ?? totalValue > 0 
    ? Math.round((value / totalValue) * 100) 
    : 0;
  
  // Obter valores formatados
  const formattedValue = formatCurrency(value);
  const formattedPercentage = `${percentage}%`;
  
  return (
    <div 
      className={cn(
        'flex items-start space-x-4 rounded-lg border p-4 transition-all hover:bg-accent/50',
        className
      )}
    >
      <CategoryIcon name={name} size="md" />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium">{name}</p>
          {showPercentage && (
            <span className="text-sm font-semibold">{formattedPercentage}</span>
          )}
        </div>
        
        {showProgress && (
          <Progress value={percentage} className="h-2" />
        )}
        
        {showValue && (
          <p className="text-sm text-muted-foreground">
            {formattedValue}
          </p>
        )}
      </div>
    </div>
  );
};

export default CategoryStatCard; 