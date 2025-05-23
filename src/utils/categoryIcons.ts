import { 
  FaUtensils, FaShoppingBag, FaBriefcase, FaHome, FaCar, 
  FaPlane, FaMedkit, FaGraduationCap, FaGamepad, FaMoneyBillWave,
  FaBuilding, FaFileInvoiceDollar, FaBusAlt, FaWifi, FaBaby,
  FaShoppingCart, FaTshirt, FaWrench, FaDumbbell, FaQuestion,
  FaCreditCard, FaGift, FaLaptop, FaMobile, FaBookOpen,
  FaMusic, FaTheaterMasks, FaPiggyBank, FaEnvelope, FaCalendarAlt,
  FaPencilAlt, FaSpa, FaChartLine, FaHandHoldingUsd, FaUniversity
} from 'react-icons/fa';
import { IconType } from 'react-icons';

export interface CategoryIcon {
  icon: IconType;
  color: string;
  bgColor: string;
}

// Definição de cores por categoria
const categoryIcons: Record<string, CategoryIcon> = {
  // Categorias de despesas comuns
  "alimentacao": { 
    icon: FaUtensils, 
    color: "#ef4444", 
    bgColor: "#fee2e2" 
  },
  "restaurante": { 
    icon: FaUtensils, 
    color: "#ef4444", 
    bgColor: "#fee2e2" 
  },
  "mercado": { 
    icon: FaShoppingCart, 
    color: "#f97316", 
    bgColor: "#ffedd5" 
  },
  "compras": { 
    icon: FaShoppingBag, 
    color: "#f97316", 
    bgColor: "#ffedd5" 
  },
  "transporte": { 
    icon: FaCar, 
    color: "#2563eb", 
    bgColor: "#dbeafe" 
  },
  "uber": { 
    icon: FaCar, 
    color: "#2563eb", 
    bgColor: "#dbeafe" 
  },
  "onibus": { 
    icon: FaBusAlt, 
    color: "#2563eb", 
    bgColor: "#dbeafe" 
  },
  "moradia": { 
    icon: FaHome, 
    color: "#9333ea", 
    bgColor: "#f3e8ff" 
  },
  "aluguel": { 
    icon: FaHome, 
    color: "#9333ea", 
    bgColor: "#f3e8ff" 
  },
  "saude": { 
    icon: FaMedkit, 
    color: "#ec4899", 
    bgColor: "#fce7f3" 
  },
  "academia": { 
    icon: FaDumbbell, 
    color: "#8b5cf6", 
    bgColor: "#ede9fe" 
  },
  "lazer": { 
    icon: FaGamepad, 
    color: "#10b981", 
    bgColor: "#d1fae5" 
  },
  "educacao": { 
    icon: FaGraduationCap, 
    color: "#0ea5e9", 
    bgColor: "#e0f2fe" 
  },
  "vestuario": { 
    icon: FaTshirt, 
    color: "#7c3aed", 
    bgColor: "#ede9fe" 
  },
  "viagem": { 
    icon: FaPlane, 
    color: "#6366f1", 
    bgColor: "#e0e7ff" 
  },
  
  // Categorias financeiras
  "impostos": { 
    icon: FaFileInvoiceDollar, 
    color: "#dc2626", 
    bgColor: "#fee2e2" 
  },
  "investimentos": { 
    icon: FaChartLine, 
    color: "#059669", 
    bgColor: "#d1fae5" 
  },
  "salario": { 
    icon: FaMoneyBillWave, 
    color: "#16a34a", 
    bgColor: "#dcfce7" 
  },
  "freelance": { 
    icon: FaLaptop, 
    color: "#16a34a", 
    bgColor: "#dcfce7" 
  },
  "consultoria": { 
    icon: FaBriefcase, 
    color: "#0284c7", 
    bgColor: "#e0f2fe" 
  },
  "banco": { 
    icon: FaUniversity, 
    color: "#4f46e5", 
    bgColor: "#e0e7ff" 
  },
  
  // Serviços e outros
  "servicos": { 
    icon: FaWrench, 
    color: "#475569", 
    bgColor: "#f1f5f9" 
  },
  "internet": { 
    icon: FaWifi, 
    color: "#0ea5e9", 
    bgColor: "#e0f2fe" 
  },
  "assinaturas": { 
    icon: FaCalendarAlt, 
    color: "#8b5cf6", 
    bgColor: "#ede9fe" 
  },
  "presente": { 
    icon: FaGift, 
    color: "#ec4899", 
    bgColor: "#fce7f3" 
  },
  "default": { 
    icon: FaQuestion, 
    color: "#6b7280", 
    bgColor: "#f3f4f6" 
  }
};

// Função para obter ícone baseado no nome da categoria
export const getCategoryIcon = (categoryName: string): CategoryIcon => {
  // Normaliza o nome da categoria (minúsculas, sem acentos)
  const normalizedName = categoryName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  // Tenta encontrar uma correspondência exata
  if (categoryIcons[normalizedName]) {
    return categoryIcons[normalizedName];
  }
  
  // Tenta encontrar uma correspondência parcial
  for (const key of Object.keys(categoryIcons)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return categoryIcons[key];
    }
  }
  
  // Retorna o ícone padrão se não encontrar correspondência
  return categoryIcons.default;
};

// Gera uma cor única baseada no texto (para categorias não mapeadas)
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}; 