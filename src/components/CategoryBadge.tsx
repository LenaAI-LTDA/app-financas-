import React from 'react';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animateHover?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  onClick?: () => void;
  clickable?: boolean;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name,
  size = 'md',
  className,
  animateHover = true,
  showTooltip = false,
  tooltipText,
  onClick,
  clickable = false
}) => {
  const { icon: Icon, color, bgColor } = getCategoryIcon(name);
  
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2 gap-1',
    md: 'text-sm py-1 px-3 gap-1.5',
    lg: 'text-base py-1.5 px-4 gap-2'
  };
  
  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };
  
  const badge = (
    <div 
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        sizeClasses[size],
        animateHover && 'hover:scale-105 hover:shadow-md',
        clickable && 'cursor-pointer active:scale-95',
        className
      )}
      style={{ 
        backgroundColor: bgColor,
        color: color,
        borderColor: color,
        borderWidth: '1px'
      }}
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <Icon className={iconSizes[size]} />
      <span>{name}</span>
    </div>
  );

  // Envolver com Tooltip se necessário
  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText || name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
};

export default CategoryBadge; 