import React from 'react';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { Button } from './ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  id: number;
  name: string;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
  className?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  id,
  name,
  onEdit,
  onDelete,
  isDeleting = false,
  className
}) => {
  const { icon: Icon, color, bgColor } = getCategoryIcon(name);
  
  return (
    <div 
      className={cn(
        'relative group overflow-hidden rounded-lg border border-1 transition-all duration-300',
        'hover:shadow-md hover:-translate-y-1 bg-white dark:bg-slate-900',
        className
      )}
      style={{ borderColor: color }}
    >
      {/* Cor de fundo superior */}
      <div 
        className="absolute top-0 left-0 right-0 h-1/3 opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />
      
      <div className="relative flex flex-col items-center p-4">
        {/* Ícone */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
          style={{ backgroundColor: bgColor, color: color }}
        >
          <Icon className="h-6 w-6" />
        </div>
        
        {/* Nome */}
        <h3 className="font-semibold text-lg mb-3">{name}</h3>
        
        {/* Ações */}
        <div className="flex gap-1 mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-blue-500"
            onClick={() => onEdit(id, name)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500"
            onClick={() => onDelete(id)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CategoryCard; 