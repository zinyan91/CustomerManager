import React from 'react';
import type { UiClasses } from '../../lib/uiClasses';

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
  styles: UiClasses;
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
  selectedTemplate,
  setSelectedTemplate,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-lg p-3 border`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-bold text-ink-faint tracking-tight px-2 mr-1 hidden sm:block">
          Mẫu biểu:
        </div>
        {TEMPLATE_LIST.map((t) => {
          const isActive = selectedTemplate === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTemplate(t.id)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center space-x-2 border ${
                isActive
                  ? 'bg-accent border-accent text-accent-ink  ring-2 '
                  : 'bg-panel-muted border-line text-ink-muted hover:bg-panel-muted'
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
