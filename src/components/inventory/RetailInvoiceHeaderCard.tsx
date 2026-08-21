import React from 'react';
import { Receipt, Save, History, Download, Printer, Package, Trash2 } from 'lucide-react';
import type { RetailInvoiceHeader } from '../../lib/statement';
import { UI } from '../../lib/uiClasses';

interface RetailInvoiceHeaderCardProps {
  headerInfo: RetailInvoiceHeader;
  onChangeHeader: (header: RetailInvoiceHeader) => void;
  itemsCount: number;
  onSaveToDb: () => void;
  onOpenHistory: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  onOpenInventoryPicker: () => void;
  onClearAllItems: () => void;
}

export const RetailInvoiceHeaderCard: React.FC<RetailInvoiceHeaderCardProps> = ({
  headerInfo,
  onChangeHeader,
  itemsCount,
  onSaveToDb,
  onOpenHistory,
  onExportExcel,
  onPrint,
  onOpenInventoryPicker,
  onClearAllItems,
}) => {
  return (
    <div className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 font-app animate-in fade-in duration-150`}>
      {/* Title + Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-accent-soft rounded-2xl text-accent shadow-2xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              HÓA ĐƠN BÁN LẺ (RETAIL INVOICE)
            </h2>
            <p className="text-xs text-ink-faint font-medium">
              Lập và xuất chứng từ hóa đơn bán buôn/bán lẻ cho khách hàng
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSaveToDb}
            title="Lưu chứng từ Hóa đơn vào CSDL Supabase"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu CSDL</span>
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            title="Xem danh sách các Hóa đơn đã lưu trong CSDL"
            className="bg-surface hover:bg-surface-elevated text-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 border border-line/70 transition-all cursor-pointer shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-accent" />
            <span>Lịch sử</span>
          </button>
          <button
            type="button"
            onClick={onExportExcel}
            className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
          <button
            type="button"
            onClick={onPrint}
            className="bg-surface hover:bg-surface-elevated text-ink text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 border border-line/70 transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-ink-muted" />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Parameters Form */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-line/70 bg-surface/60 backdrop-blur-md">
        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">Tên Cửa hàng / Tiệm</label>
          <input
            type="text"
            value={headerInfo.shopName}
            onChange={e => onChangeHeader({ ...headerInfo, shopName: e.target.value })}
            placeholder="VD: SALON & SPA MINH THƯ"
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-bold`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">Họ tên người mua hàng</label>
          <input
            type="text"
            value={headerInfo.buyerName}
            onChange={e => onChangeHeader({ ...headerInfo, buyerName: e.target.value })}
            placeholder="VD: Chị Tâm"
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-bold`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">Địa chỉ mua hàng</label>
          <input
            type="text"
            value={headerInfo.buyerAddress}
            onChange={e => onChangeHeader({ ...headerInfo, buyerAddress: e.target.value })}
            placeholder="VD: Phường 1, Tây Ninh"
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle}`}
          />
        </div>
      </div>

      {/* Action Button: Nạp từ Kho hàng */}
      <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenInventoryPicker}
            className="bg-accent-soft hover:bg-accent hover:text-accent-ink text-accent text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all border border-accent/30 cursor-pointer shadow-2xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>📥 Chọn từ Kho hàng</span>
          </button>

          {itemsCount > 0 && (
            <button
              type="button"
              onClick={onClearAllItems}
              className="bg-surface hover:bg-neg-soft text-neg text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center space-x-1 border border-line/70 hover:border-neg transition-colors cursor-pointer shadow-2xs"
              title="Xóa toàn bộ mặt hàng trong hóa đơn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa hết</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
