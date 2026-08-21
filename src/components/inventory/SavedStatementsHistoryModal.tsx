import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { SavedPurchaseStatement } from '../../lib/statementDb';
import { UI } from '../../lib/uiClasses';

interface SavedStatementsHistoryModalProps {
  isOpen: boolean;
  savedStatements: SavedPurchaseStatement[];
  onClose: () => void;
  onSelectStatement: (stmt: SavedPurchaseStatement) => void;
  onDeleteStatement: (id: string, e: React.MouseEvent) => void;
}

export const SavedStatementsHistoryModal: React.FC<SavedStatementsHistoryModalProps> = ({
  isOpen,
  savedStatements,
  onClose,
  onSelectStatement,
  onDeleteStatement,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-app" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-2xl max-w-2xl w-full p-5 border border-line/70 space-y-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <History className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-ink uppercase">Lịch sử Bảng Kê Thu Mua đã lưu trong CSDL</h3>
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
          {savedStatements.length === 0 ? (
            <div className="text-center text-ink-faint py-8 text-xs">
              Chưa có Bảng kê nào được lưu trong CSDL. Bấm nút <strong>"Lưu CSDL"</strong> để lưu bảng kê hiện tại.
            </div>
          ) : (
            savedStatements.map(stmt => (
              <div
                key={stmt.id}
                onClick={() => onSelectStatement(stmt)}
                className="p-3.5 border border-line/70 rounded-xl hover:border-accent hover:bg-accent-soft/20 cursor-pointer flex items-center justify-between transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="font-bold text-ink text-sm">
                    Bên bán: {stmt.sellerInfo.sellerName || 'Chưa đặt tên'}
                  </div>
                  <div className="text-ink-faint flex items-center space-x-3 text-[11px]">
                    <span>Ngày lập: {stmt.statementDate}</span>
                    <span>•</span>
                    <span>Bên mua: {stmt.sellerInfo.buyerName || '---'}</span>
                    <span>•</span>
                    <span>{stmt.items.length} mặt hàng</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => onDeleteStatement(stmt.id, e)}
                    className="text-ink-faint hover:text-neg p-1.5 rounded-lg hover:bg-neg-soft transition-colors cursor-pointer"
                    title="Xóa Bảng kê này"
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
