import React from 'react';
import type { ThemeStyles } from '../../lib/themeStyles';

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
  styles: ThemeStyles;
  isLight: boolean;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (tpl: TemplateType) => void;
}

export const TEMPLATE_LIST: { id: TemplateType; label: string }[] = [
  { id: 'lease_mb', label: '1. HĐ Thuê Mặt Bằng' },
  { id: 'construction', label: '2. HĐ Thi Công Nhà Ở' },
  { id: 'const_estimate', label: '3. Bảng Dự Toán Thi Công' },
  { id: 'sale_contract', label: '4. HĐ Mua Bán Hàng Hóa' },
  { id: 'lease_house', label: '5. HĐ Thuê Nhà Ở' },
  { id: 'payment_request_sale', label: '6. Đề Nghị Thanh Toán (HĐ Mua Bán)' },
  { id: 'payment_request_const', label: '7. Đề Nghị Thanh Toán (HĐ Thi Công)' },
  { id: 'deposit', label: '8. HĐ Đặt Cọc (Chuyển Nhượng QSDĐ)' },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  styles,
  isLight,
  selectedTemplate,
  setSelectedTemplate,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-3 border shadow-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mr-1 hidden sm:block">
          Mẫu biểu:
        </div>
        {TEMPLATE_LIST.map((t) => {
          const isActive = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 border ${
                isActive
                  ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/25 ring-2 ring-sky-500/20'
                  : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200/70'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
