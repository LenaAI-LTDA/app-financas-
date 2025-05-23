import React from 'react';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryIconProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  tooltipText?: string;
  showTooltip?: boolean;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  size = 'md',
  className,
  tooltipText,
  showTooltip = false,
}) => {
  const { icon: Icon, color, bgColor } = getCategoryIcon(name);
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12', 
    xl: 'w-16 h-16',
  };
  
  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };
  
  const icon = (
    <div
      className={cn(
        'rounded-full flex items-center justify-center transition-transform',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: color,
      }}
    >
      <Icon className={iconSizes[size]} />
    </div>
  );
  
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {icon}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText || name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return icon;
};

export default CategoryIcon; 