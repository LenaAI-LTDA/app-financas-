import React from 'react';
import { cn } from '@/lib/utils';
import CategoryStatCard from './CategoryStatCard';

export interface CategoryStat {
  id: number | string;
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface CategoryStatsGridProps {
  stats: CategoryStat[];
  totalValue: number;
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
  maxItems?: number;
  className?: string;
  showPercentage?: boolean;
  showValue?: boolean;
  showProgress?: boolean;
}

const CategoryStatsGrid: React.FC<CategoryStatsGridProps> = ({
  stats,
  totalValue,
  title,
  emptyMessage = "Nenhuma categoria encontrada",
  loading = false,
  maxItems,
  className,
  showPercentage = true,
  showValue = true,
  showProgress = true,
}) => {
  // Limitar o número de items se necessário
  const displayedStats = maxItems ? stats.slice(0, maxItems) : stats;
  
  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : displayedStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedStats.map((stat) => (
            <CategoryStatCard
              key={stat.id}
              name={stat.name}
              value={stat.value}
              totalValue={totalValue}
              percentage={stat.percentage}
              showPercentage={showPercentage}
              showValue={showValue}
              showProgress={showProgress}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default CategoryStatsGrid; 