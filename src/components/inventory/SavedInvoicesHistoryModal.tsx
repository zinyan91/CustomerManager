import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { SavedRetailInvoice } from '../../lib/statementDb';
import { UI } from '../../lib/uiClasses';

interface SavedInvoicesHistoryModalProps {
  isOpen: boolean;
  savedInvoices: SavedRetailInvoice[];
  onClose: () => void;
  onSelectInvoice: (inv: SavedRetailInvoice) => void;
  onDeleteInvoice: (id: string, e: React.MouseEvent) => void;
}

export const SavedInvoicesHistoryModal: React.FC<SavedInvoicesHistoryModalProps> = ({
  isOpen,
  savedInvoices,
  onClose,
  onSelectInvoice,
  onDeleteInvoice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-2xl max-w-2xl w-full p-5 border border-line/70 space-y-4 max-h-[85vh] flex flex-col shadow-2xl font-app animate-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-ink uppercase">Lịch sử Hóa Đơn Bán Lẻ đã lưu trong CSDL</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-faint hover:text-ink font-bold text-sm px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {savedInvoices.length === 0 ? (
            <div className="text-center text-ink-faint py-8 text-xs">
              Chưa có Hóa đơn nào được lưu trong CSDL. Bấm nút <strong>"Lưu CSDL"</strong> để lưu hóa đơn hiện tại.
            </div>
          ) : (
            savedInvoices.map(inv => (
              <div
                key={inv.id}
                onClick={() => onSelectInvoice(inv)}
                className="p-3.5 border border-line/70 rounded-xl hover:border-accent hover:bg-accent-soft/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-ink text-sm">
                    Khách hàng: {inv.headerInfo.buyerName || 'Chưa đặt tên'}
                  </div>
                  <div className="text-ink-faint flex items-center space-x-3 text-[11px]">
                    <span>Ngày lập: {inv.invoiceDate}</span>
                    <span>•</span>
                    <span>Cửa hàng: {inv.headerInfo.shopName || '---'}</span>
                    <span>•</span>
                    <span>{inv.items.length} mặt hàng</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => onDeleteInvoice(inv.id, e)}
                    className="text-ink-faint hover:text-neg p-1.5 rounded-lg hover:bg-neg-soft transition-colors cursor-pointer"
                    title="Xóa Hóa đơn này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
