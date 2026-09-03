import React from 'react';
import type { UiClasses } from '../../lib/uiClasses';
import {
  Building2, Home, Hammer, Calculator, ShoppingCart, CreditCard, Handshake, FileSignature
} from 'lucide-react';

export type TemplateType =
  | 'lease_mb'
  | 'construction'
  | 'const_estimate'
  | 'sale_contract'
  | 'lease_house'
  | 'payment_request_sale'
  | 'payment_request_const'
  | 'deposit';

interface TemplateSelectorProps {
  styles?: UiClasses;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (tpl: TemplateType) => void;
}

export const TEMPLATE_LIST: { id: TemplateType; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { id: 'lease_mb', label: '1. HĐ Thuê Mặt Bằng', icon: Building2 },
  { id: 'construction', label: '2. HĐ Thi Công Nhà Ở', icon: Hammer },
  { id: 'const_estimate', label: '3. Dự Toán Thi Công', icon: Calculator },
  { id: 'sale_contract', label: '4. HĐ Mua Bán Hàng Hóa', icon: ShoppingCart },
  { id: 'lease_house', label: '5. HĐ Thuê Nhà Ở', icon: Home },
  { id: 'payment_request_sale', label: '6. Đề Nghị TT (Mua Bán)', icon: CreditCard },
  { id: 'payment_request_const', label: '7. Đề Nghị TT (Thi Công)', icon: CreditCard },
  { id: 'deposit', label: '8. HĐ Đặt Cọc (QSDĐ)', icon: Handshake },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  setSelectedTemplate,
}) => {
  return (
    <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/50 backdrop-blur-md space-y-2.5 font-app">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-accent font-bold text-xs">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
            <FileSignature size={15} />
          </div>
          <span className="uppercase tracking-wider text-[11px]">DANH MỤC BIỂU MẪU HỢP ĐỒNG & CHỨNG TỪ PHÁP LÝ</span>
        </div>
        <span className="text-[11px] text-ink-faint hidden sm:inline">
          Chọn mẫu biểu để tự động điền dữ liệu và kết xuất file Word / PDF
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {TEMPLATE_LIST.map((t) => {
          const isActive = selectedTemplate === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border cursor-pointer ${
                isActive
                  ? 'bg-accent text-accent-ink border-accent shadow-md shadow-accent/20 ring-2 ring-accent/20'
                  : 'bg-surface hover:bg-surface-elevated text-ink-muted border-line/70 hover:border-accent hover:text-accent shadow-2xs'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-accent-ink' : 'text-accent'} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
