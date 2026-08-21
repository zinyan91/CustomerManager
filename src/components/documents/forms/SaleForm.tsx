import React from 'react';
import { Plus, Trash2, FolderPlus } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../../lib/documentOptions';
import type { UiClasses } from '../../../lib/uiClasses';
import type { SaleItem } from '../DocumentForm';
import type { SaleCatalogProfile } from '../../../lib/saleCatalogStore';

export interface SaleFormProps {
  styles: UiClasses;
  saleContractDate: string;
  setSaleContractDate: (v: string) => void;
  saleBuyerName: string;
  setSaleBuyerName: (v: string) => void;
  saleBuyerAddress: string;
  setSaleBuyerAddress: (v: string) => void;
  saleSellerName: string;
  setSaleSellerName: (v: string) => void;
  saleSellerCccd: string;
  setSaleSellerCccd: (v: string) => void;
  saleSellerCccdDate: string;
  setSaleSellerCccdDate: (v: string) => void;
  saleSellerCccdPlace: string;
  setSaleSellerCccdPlace: (v: string) => void;
  salePayMethod: 'cash' | 'transfer';
  setSalePayMethod: (v: 'cash' | 'transfer') => void;
  saleBankOwner: string;
  setSaleBankOwner: (v: string) => void;
  saleBankAccNo: string;
  setSaleBankAccNo: (v: string) => void;
  saleBankName: string;
  setSaleBankName: (v: string) => void;
  saleBankBranch: string;
  setSaleBankBranch: (v: string) => void;
  saleStartDate: string;
  setSaleStartDate: (v: string) => void;
  saleEndDate: string;
  setSaleEndDate: (v: string) => void;
  salePaymentStage1: string;
  setSalePaymentStage1: (v: string) => void;
  saleItems: SaleItem[];
  setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  handleAddSaleItem: () => void;
  catalogs?: SaleCatalogProfile[];
  currentCatalogId?: string;
  onSelectCatalogId?: (id: string) => void;
  onOpenCatalogModal?: () => void;
}

export const SaleForm: React.FC<SaleFormProps> = ({
  styles,
  saleContractDate,
  setSaleContractDate,
  saleBuyerName,
  setSaleBuyerName,
  saleBuyerAddress,
  setSaleBuyerAddress,
  saleSellerName,
  setSaleSellerName,
  saleSellerCccd,
  setSaleSellerCccd,
  saleSellerCccdDate,
  setSaleSellerCccdDate,
  saleSellerCccdPlace,
  setSaleSellerCccdPlace,
  salePayMethod,
  setSalePayMethod,
  saleBankOwner,
  setSaleBankOwner,
  saleBankAccNo,
  setSaleBankAccNo,
  saleBankName,
  setSaleBankName,
  saleBankBranch,
  setSaleBankBranch,
  saleStartDate,
  setSaleStartDate,
  saleEndDate,
  setSaleEndDate,
  salePaymentStage1,
  setSalePaymentStage1,
  saleItems,
  setSaleItems,
  handleAddSaleItem,
  catalogs = [],
  currentCatalogId = '',
  onSelectCatalogId,
  onOpenCatalogModal,
}) => {
  const totalAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 text-xs font-app animate-in fade-in duration-150`}>
      <div className="flex items-center justify-between border-b pb-2.5 border-line/60">
        <div className="font-bold text-accent uppercase tracking-wider text-xs">
          THÔNG TIN HỢP ĐỒNG MUA BÁN HÀNG HÓA & DANH MỤC SẢN PHẨM
        </div>
      </div>

      {/* Thông tin Bên Mua (Bên A) */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-accent text-xs uppercase border-b pb-1.5 border-line/60">BÊN MUA (BÊN A)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên Bên Mua</label>
            <input
              type="text"
              value={saleBuyerName}
              onChange={e => setSaleBuyerName(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Địa chỉ Bên A</label>
            <input
              type="text"
              value={saleBuyerAddress}
              onChange={e => setSaleBuyerAddress(e.target.value)}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* Thông tin Bên Bán (Bên B) */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-accent text-xs uppercase border-b pb-1.5 border-line/60">BÊN BÁN (BÊN B)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Họ tên Bên Bán</label>
            <input
              type="text"
              value={saleSellerName}
              onChange={e => setSaleSellerName(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>CCCD số</label>
            <input
              type="text"
              value={saleSellerCccd}
              onChange={e => setSaleSellerCccd(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày cấp CCCD</label>
            <input
              type="text"
              placeholder="VD: 25/05/2023"
              value={saleSellerCccdDate}
              onChange={e => setSaleSellerCccdDate(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Nơi cấp CCCD</label>
            <select
              value={saleSellerCccdPlace}
              onChange={e => setSaleSellerCccdPlace(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-semibold ${styles.inputStyle}`}
            >
              {CCCD_ISSUE_PLACES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-line/60">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Phương thức nhận tiền</label>
            <select
              value={salePayMethod}
              onChange={e => setSalePayMethod(e.target.value as 'cash' | 'transfer')}
              className={`w-full rounded-xl p-2.5 font-semibold ${styles.inputStyle}`}
            >
              <option value="transfer">Chuyển khoản Ngân hàng</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>
          {salePayMethod === 'transfer' && (
            <>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Tên chủ tài khoản</label>
                <input
                  type="text"
                  value={saleBankOwner}
                  onChange={e => setSaleBankOwner(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Số tài khoản</label>
                <input
                  type="text"
                  value={saleBankAccNo}
                  onChange={e => setSaleBankAccNo(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-accent ${styles.inputStyle}`}
                />
              </div>
              <div>
                <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngân hàng & Chi nhánh</label>
                <div className="flex gap-1.5">
                  <select
                    value={saleBankName}
                    onChange={e => setSaleBankName(e.target.value)}
                    className={`w-1/2 rounded-xl p-2 font-semibold ${styles.inputStyle}`}
                  >
                    {BANK_LIST.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Chi nhánh..."
                    value={saleBankBranch}
                    onChange={e => setSaleBankBranch(e.target.value)}
                    className={`w-1/2 rounded-xl p-2 ${styles.inputStyle}`}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Điều khoản hợp đồng */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-line/70 bg-surface/60 space-y-2.5 shadow-2xs">
        <div className="font-bold text-warn text-xs uppercase border-b pb-1.5 border-line/60">ĐIỀU KHOẢN & TIẾN ĐỘ</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày ký hợp đồng</label>
            <DateInput
              value={saleContractDate}
              onChange={setSaleContractDate}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày giao hàng</label>
            <DateInput
              value={saleStartDate}
              onChange={setSaleStartDate}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Ngày thanh toán hết</label>
            <DateInput
              value={saleEndDate}
              onChange={setSaleEndDate}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 text-[11px] ${styles.labelStyle}`}>Đặt cọc Đợt 1 (VNĐ)</label>
            <input
              type="text"
              value={salePaymentStage1}
              onChange={e => setSalePaymentStage1(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono font-bold text-pos ${styles.inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* Danh mục mặt hàng & Catalog Preset Selector */}
      <div className="border rounded-xl overflow-hidden border-line/70 bg-surface/60 shadow-2xs">
        <div className="p-3.5 bg-surface border-b border-line/70 font-bold flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-accent uppercase text-xs tracking-wide">
              DANH MỤC MẶT HÀNG MUA BÁN ({saleItems.length} SẢN PHẨM)
            </span>
            <span className="font-mono text-ink text-xs">
              - Tổng: <strong className="text-accent">{totalAmount.toLocaleString('vi-VN')} đ</strong>
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Catalog Selector Dropdown */}
            {catalogs.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-ink-faint hidden sm:inline">Mẫu ngành:</span>
                <select
                  value={currentCatalogId}
                  onChange={e => onSelectCatalogId?.(e.target.value)}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold border ${styles.inputStyle}`}
                >
                  {catalogs.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.items.length} SP)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Manage / Add New Catalog Button */}
            {onOpenCatalogModal && (
              <button
                type="button"
                onClick={onOpenCatalogModal}
                className="flex items-center space-x-1.5 bg-surface hover:bg-surface-elevated border border-line/70 text-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Tạo bộ mẫu mới hoặc quản lý các mẫu đã lưu"
              >
                <FolderPlus className="w-3.5 h-3.5 text-accent" />
                <span>Quản lý mẫu</span>
              </button>
            )}

            {/* Add Item Button */}
            <button
              type="button"
              onClick={handleAddSaleItem}
              className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-accent/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mặt hàng</span>
            </button>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint">
              <tr>
                <th className="px-2.5 py-2 w-12 text-center">STT</th>
                <th className="px-2.5 py-2 min-w-[14rem]">TÊN MẶT HÀNG</th>
                <th className="px-2.5 py-2 text-center w-24">ĐVT</th>
                <th className="px-2.5 py-2 text-center w-20">SL</th>
                <th className="px-2.5 py-2 text-right w-32">ĐƠN GIÁ (VNĐ)</th>
                <th className="px-2.5 py-2 text-right w-36">THÀNH TIỀN (VNĐ)</th>
                <th className="px-2.5 py-2 text-center w-12">XÓA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {saleItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-panel-muted/40 transition-colors">
                  <td className="px-2.5 py-2 text-center font-bold text-ink-muted">
                    {idx + 1}
                  </td>
                  <td className="px-2.5 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => {
                        const next = [...saleItems];
                        next[idx].name = e.target.value;
                        setSaleItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 font-medium ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={e => {
                        const next = [...saleItems];
                        next[idx].unit = e.target.value;
                        setSaleItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 text-center ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => {
                        const next = [...saleItems];
                        next[idx].quantity = Number(e.target.value) || 1;
                        setSaleItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 text-center font-mono ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={item.price}
                      onChange={e => {
                        const next = [...saleItems];
                        next[idx].price = Number(e.target.value) || 0;
                        setSaleItems(next);
                      }}
                      className={`w-full rounded-lg p-1.5 text-right font-mono ${styles.inputStyle}`}
                    />
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-accent">
                    {(item.quantity * item.price).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2.5 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setSaleItems(saleItems.filter(i => i.id !== item.id))}
                      className="p-1 rounded-lg text-neg hover:bg-neg-soft transition-colors cursor-pointer"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
