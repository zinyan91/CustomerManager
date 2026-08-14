import React, { useState, useCallback } from 'react';
import {
  Calculator, Layers, TrendingUp, TrendingDown, ShieldCheck, Award, RefreshCw, BarChart2, AlertTriangle, FileText, PiggyBank, Percent,
} from 'lucide-react';

export type ToolId =
  | 'loan'
  | 'stk_single'
  | 'stk_multi'
  | 'rate_reduction'
  | 'credit_capacity'
  | 'prepayment_analysis'
  | 'repayment_compare'
  | 'rate_conversion'
  | 'overdue_penalty';

export type CategoryId = 'credit' | 'stk' | 'rate';

export interface ToolCategory {
  id: CategoryId;
  label: string;
  icon: React.ElementType;
  tools: { id: ToolId; label: string; icon: React.ElementType }[];
}

export const CALCULATOR_CATEGORIES: ToolCategory[] = [
  {
    id: 'credit',
    label: '1. Khoản Vay & Thu Nợ',
    icon: FileText,
    tools: [
      { id: 'loan', label: '1. Tính Lịch Thu Nợ Khoản Vay', icon: Calculator },
      { id: 'credit_capacity', label: '5. Thẩm Định Hạn Mức (DTI/LTV)', icon: ShieldCheck },
      { id: 'prepayment_analysis', label: '6. Phân Tích Trả Nợ Trước Hạn', icon: Award },
      { id: 'repayment_compare', label: '7. So Sánh Gốc Đều vs Niên Kim', icon: BarChart2 },
    ],
  },
  {
    id: 'stk',
    label: '2. Cho Vay Cầm Cố STK',
    icon: PiggyBank,
    tools: [
      { id: 'stk_single', label: '2. Tính Cầm Cố STK Đơn', icon: Layers },
      { id: 'stk_multi', label: '3. Tính Cầm Cố STK Tái Tục', icon: TrendingUp },
    ],
  },
  {
    id: 'rate',
    label: '3. Lãi Suất & Phạt Quá Hạn',
    icon: Percent,
    tools: [
      { id: 'rate_reduction', label: '4. Tính Giảm Lãi Suất Vay', icon: TrendingDown },
      { id: 'rate_conversion', label: '8. Quy Đổi Lãi Phẳng & EAR', icon: RefreshCw },
      { id: 'overdue_penalty', label: '9. Tính Phạt Chậm Trả Quá Hạn', icon: AlertTriangle },
    ],
  },
];

export function useCalculatorController() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('credit');
  const [activeTool, setActiveTool] = useState<ToolId>('loan');

  const currentCategory = CALCULATOR_CATEGORIES.find(c => c.id === activeCategory) || CALCULATOR_CATEGORIES[0];

  const handleSelectCategory = useCallback((catId: CategoryId) => {
    setActiveCategory(catId);
    const cat = CALCULATOR_CATEGORIES.find(c => c.id === catId);
    if (cat && cat.tools.length > 0) {
      setActiveTool(cat.tools[0].id);
    }
  }, []);

  return {
    activeCategory,
    activeTool,
    setActiveTool,
    currentCategory,
    handleSelectCategory,
    categories: CALCULATOR_CATEGORIES,
  };
}
