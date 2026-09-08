import React from 'react';
import { FileText, Save, History, Download, Printer, Package, Trash2 } from 'lucide-react';
import { getComputedBankAccText, type StatementSellerInfo } from '../../lib/statement';
import { BANK_LIST } from '../../lib/documentOptions';
import { CustomerPicker } from '../ui/CustomerPicker';
import type { Customer } from '../../types';
import { UI } from '../../lib/uiClasses';

interface PurchaseStatementSellerCardProps {
  sellerInfo: StatementSellerInfo;
  onChangeSellerInfo: (info: StatementSellerInfo) => void;
  itemsCount: number;
  onSaveToDb: () => void;
  onOpenHistory: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
  onOpenInventoryPicker: () => void;
  onClearAllItems: () => void;
  customers?: Customer[];
}

export const PurchaseStatementSellerCard: React.FC<PurchaseStatementSellerCardProps> = ({
  sellerInfo,
  onChangeSellerInfo,
  itemsCount,
  onSaveToDb,
  onOpenHistory,
  onExportExcel,
  onPrint,
  onOpenInventoryPicker,
  onClearAllItems,
  customers = [],
}) => {
  return (
    <div className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 font-app animate-in fade-in duration-150`}>
      {/* Title & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-line/60 pb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-accent-soft rounded-2xl text-accent shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              BẢNG KÊ THU MUA HÀNG HÓA, DỊCH VỤ
            </h2>
            <p className="text-xs text-ink-faint font-medium">
              Lập và xuất biểu mẫu Bảng kê Mẫu số 01/TNDN (Thông tư 78/2014/TT-BTC)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSaveToDb}
            title="Lưu chứng từ Bảng kê vào CSDL Supabase"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu CSDL</span>
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            title="Xem danh sách các Bảng kê đã lưu trong CSDL"
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

      {/* Information & Payment Method Controls */}
      <div className="p-3.5 rounded-xl border border-line/70 bg-surface/60 backdrop-blur-md space-y-3">
        {/* Seller Legal Identity Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
              Bên bán hàng (Họ tên)
            </label>
            <input
              type="text"
              value={sellerInfo.sellerName}
              onChange={e => onChangeSellerInfo({ ...sellerInfo, sellerName: e.target.value })}
              className={`w-full rounded-xl p-2 font-bold ${UI.inputStyle}`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
              Địa chỉ Bên bán
            </label>
            <input
              type="text"
              value={sellerInfo.sellerAddress}
              onChange={e => onChangeSellerInfo({ ...sellerInfo, sellerAddress: e.target.value })}
              className={`w-full rounded-xl p-2 ${UI.inputStyle}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider">
                Bên mua hàng (Họ tên & Địa chỉ)
              </label>
            </div>
            {customers.length > 0 && (
              <CustomerPicker
                customers={customers}
                selectedCustomerId={null}
                onSelectCustomer={(id) => {
                  const c = customers.find(item => item.Id === id);
                  if (c) {
                    onChangeSellerInfo({
                      ...sellerInfo,
                      buyerName: c.FullName,
                      buyerIdCard: c.NationalId || sellerInfo.buyerIdCard,
                      buyerAddress: c.Address || sellerInfo.buyerAddress || '',
                    });
                  }
                }}
                placeholder="— Chọn Bên mua từ danh sách khách hàng —"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Họ tên Bên mua"
                value={sellerInfo.buyerName}
                onChange={e => onChangeSellerInfo({ ...sellerInfo, buyerName: e.target.value })}
                className={`w-full rounded-xl p-2 font-bold ${UI.inputStyle}`}
              />
              <input
                type="text"
                placeholder="Địa chỉ Bên mua"
                value={sellerInfo.buyerAddress || ''}
                onChange={e => onChangeSellerInfo({ ...sellerInfo, buyerAddress: e.target.value })}
                className={`w-full rounded-xl p-2 ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
              Ngày lập bảng kê
            </label>
            <input
              type="text"
              value={sellerInfo.statementDateStr}
              onChange={e => onChangeSellerInfo({ ...sellerInfo, statementDateStr: e.target.value })}
              className={`w-full rounded-xl p-2 font-mono ${UI.inputStyle}`}
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
                title="Xóa toàn bộ mặt hàng trong bảng kê"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Method Selector & Dynamic Payment Details */}
        <div className="pt-2 border-t border-line/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="font-bold text-warn text-[11px] uppercase tracking-wider">
              HÌNH THỨC NHẬN THANH TOÁN CỦA BÊN BÁN
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="stmtPayMethod"
                  checked={(sellerInfo.paymentMethod || 'transfer') === 'cash'}
                  onChange={() => onChangeSellerInfo({ ...sellerInfo, paymentMethod: 'cash' })}
                  className="accent-accent"
                />
                <span>💵 Tiền mặt</span>
              </label>
              <label className="flex items-center space-x-1.5 cursor-pointer font-bold">
                <input
                  type="radio"
                  name="stmtPayMethod"
                  checked={(sellerInfo.paymentMethod || 'transfer') === 'transfer'}
                  onChange={() => onChangeSellerInfo({ ...sellerInfo, paymentMethod: 'transfer' })}
                  className="accent-accent"
                />
                <span>🏦 Chuyển khoản</span>
              </label>
            </div>
          </div>

          {/* Cash Mode Preview */}
          {sellerInfo.paymentMethod === 'cash' ? (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono">
              <span className="font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400">
                Thông tin thanh toán hiển thị trên chứng từ:
              </span>{' '}
              <span className="font-bold">Tiền mặt</span>
            </div>
          ) : (
            /* Bank Transfer Fields */
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
                    Số tài khoản (STK)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 9975639612"
                    value={sellerInfo.bankAccNo !== undefined ? sellerInfo.bankAccNo : ''}
                    onChange={e => onChangeSellerInfo({ ...sellerInfo, bankAccNo: e.target.value })}
                    className={`w-full rounded-xl p-2 font-mono font-bold text-accent ${UI.inputStyle}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
                    Ngân hàng
                  </label>
                  <select
                    value={sellerInfo.bankName || ''}
                    onChange={e => onChangeSellerInfo({ ...sellerInfo, bankName: e.target.value })}
                    className={`w-full rounded-xl p-2 ${UI.inputStyle}`}
                  >
                    <option value="">-- Chọn Ngân hàng --</option>
                    {BANK_LIST.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
                    Chi nhánh (Nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CN TP.HCM"
                    value={sellerInfo.bankBranch || ''}
                    onChange={e => onChangeSellerInfo({ ...sellerInfo, bankBranch: e.target.value })}
                    className={`w-full rounded-xl p-2 ${UI.inputStyle}`}
                  />
                </div>
              </div>

              {/* Auto-assembled Preview Tag for Transfer Info */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
                    Thông tin chuyển khoản hiển thị trên chứng từ:
                  </span>
                  <span className="font-bold">
                    {getComputedBankAccText(sellerInfo)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
