import React from 'react';
import { FileText } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';

export type TemplateType = 'lease_mb' | 'construction' | 'sale_contract' | 'lease_house' | 'payment_request';

interface TemplateSelectorProps {
  styles: ThemeStyles;
  isLight: boolean;
  selectedTemplate: TemplateType;
  setSelectedTemplate: (tpl: TemplateType) => void;
}

export const TEMPLATE_LIST: { id: TemplateType; label: string }[] = [
  { id: 'lease_mb', label: '1. HĐ Thuê Mặt Bằng' },
  { id: 'construction', label: '2. HĐ Thi Công Nhà Ở Dân Dụng' },
  { id: 'sale_contract', label: '3. HĐ Mua Bán Hàng Hóa Nguyên Văn' },
  { id: 'lease_house', label: '4. HĐ Thuê Nhà Ở Dân Dụng' },
  { id: 'payment_request', label: '5. Giấy Đề Nghị Thanh Toán' },
];

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  styles,
  isLight,
  selectedTemplate,
  setSelectedTemplate,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-3 border flex flex-wrap items-center gap-2`}>
      <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-1.5 px-2">
        <FileText className="w-4 h-4" />
        <span>CHỌN MẪU BIỂU MẪU:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {TEMPLATE_LIST.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelectedTemplate(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-left border ${selectedTemplate === t.id
              ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/30'
              : isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-sky-50 hover:border-sky-200'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
          >
            <div>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
