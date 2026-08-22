import React from 'react';
import {
  Building2, Home, Car, PiggyBank, Wrench, Layers, Trash2, Edit3,
  Loader2, AlertTriangle, CheckCircle2, Clock, ShieldAlert, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import { fmtMoney, fmtDate } from '../../lib/utils';
import {
  isLtvException, appraisalStatus, appraisalExpiryDate, assetClassLabel,
  collateralValue, maxLoanFromCollateral, getEffectiveLtv,
} from '../../lib/collateralMath';

interface CollateralTableProps {
  filteredCollaterals: Collateral[];
  paginatedCollaterals: Collateral[];
  customers: Customer[];
  selectedCollateral: Collateral | null;
  handleSelectRow: (c: Collateral) => void;
  colPage: number;
  setColPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  onDelete: (c: Collateral) => void;
  deletingId: number | null;
}

function getAssetIcon(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('đất ở') || t.includes('nhà')) return Home;
  if (t.includes('phương tiện') || t.includes('xe') || t.includes('vận tải')) return Car;
  if (t.includes('tiền gửi') || t.includes('stk') || t.includes('sổ')) return PiggyBank;
  if (t.includes('máy móc') || t.includes('thiết bị')) return Wrench;
  if (t.includes('bất động sản') || t.includes('bđs')) return Building2;
  return Layers;
}

export const CollateralTable: React.FC<CollateralTableProps> = ({
  filteredCollaterals,
  paginatedCollaterals,
  customers,
  selectedCollateral,
  handleSelectRow,
  colPage,
  setColPage,
  totalPages,
  onDelete,
  deletingId,
}) => {
  const pageTotalValue = paginatedCollaterals.reduce((sum, c) => sum + collateralValue(c), 0);
  const pageTotalMaxLoan = paginatedCollaterals.reduce((sum, c) => sum + maxLoanFromCollateral(c), 0);

  return (
    <div className="rounded-2xl overflow-hidden border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150">
      {/* Table Header Bar */}
      <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <span className="font-bold flex items-center space-x-2 text-xs text-ink">
          <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-[11px]">
            DANH SÁCH TÀI SẢN BẢO ĐẢM ({filteredCollaterals.length} TÀI SẢN)
          </span>
        </span>
        <span className="text-[11px] text-ink-faint font-medium">
          Nhấp vào dòng để xem chi tiết hoặc chỉnh sửa
        </span>
      </div>

      {/* Desktop / Tablet Scrollable Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.11em] text-ink-faint">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">MÃ TSBĐ / ĐỊA CHỈ</th>
              <th className="px-4 py-3 whitespace-nowrap">CHỦ SỞ HỮU / CIF</th>
              <th className="px-4 py-3 whitespace-nowrap">LOẠI TÀI SẢN</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">GIÁ TRỊ ĐỊNH GIÁ</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">TỶ LỆ LTV</th>
              <th className="px-4 py-3 whitespace-nowrap text-right">SỨC CẤP TỐI ĐA</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">NGÀY ĐỊNH GIÁ</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">HẠN ĐỊNH GIÁ</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">TRẠNG THÁI</th>
              <th className="px-4 py-3 whitespace-nowrap text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {paginatedCollaterals.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 px-4 text-ink-faint">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Building2 className="w-8 h-8 text-ink-faint opacity-50" />
                    <span className="text-xs font-semibold">Không tìm thấy tài sản bảo đảm nào phù hợp bộ lọc.</span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedCollaterals.map(c => {
                const isSelected = selectedCollateral?.Id === c.Id;
                const cust = customers.find(x => x.Id === c.CustomerId);
                const st = appraisalStatus(c);
                const isException = isLtvException(c);
                const ltvVal = getEffectiveLtv(c);
                const IconComponent = getAssetIcon(c.AssetType || '');
                const expDate = c.AppraisalExpiryDate || appraisalExpiryDate(c);

                return (
                  <tr
                    key={c.Id}
                    onClick={() => handleSelectRow(c)}
                    className={`transition-colors cursor-pointer group hover:bg-accent/[0.04] ${
                      isSelected ? 'bg-accent-soft/40 ring-1 ring-accent/30' : ''
                    }`}
                  >
                    {/* Mã & Địa chỉ */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-surface border border-line/60 text-accent group-hover:border-accent/40 transition-colors shrink-0">
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-ink text-xs truncate">
                            {c.AssetCode || `TSBĐ #${c.Id}`}
                          </div>
                          {c.Address && (
                            <div className="text-[11px] text-ink-faint truncate max-w-[220px]" title={c.Address}>
                              {c.Address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Khách hàng & CIF */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-ink text-xs truncate max-w-[180px]">
                        {cust ? cust.FullName : `Khách hàng #${c.CustomerId}`}
                      </div>
                      {cust && (
                        <div className="font-mono text-[10px] text-accent font-semibold">
                          CIF: {cust.CifKh}
                        </div>
                      )}
                    </td>

                    {/* Phân loại tài sản */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-surface border border-line/70 text-ink-muted">
                        {assetClassLabel(c.AssetType)}
                      </span>
                    </td>

                    {/* Giá trị định giá */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-pos text-xs">
                        {fmtMoney(collateralValue(c))}
                      </span>
                    </td>

                    {/* Tỷ lệ LTV & Thanh đo mini */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${
                              isException
                                ? 'bg-warn-soft text-warn border-warn/30'
                                : ltvVal > 75
                                ? 'bg-pos-soft text-pos border-pos/30'
                                : 'bg-accent-soft text-accent border-accent/30'
                            }`}
                          >
                            {ltvVal}%
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-14 h-1 rounded-full bg-surface border border-line/60 overflow-hidden mt-1">
                          <div
                            className={`h-full ${isException ? 'bg-warn' : ltvVal > 75 ? 'bg-pos' : 'bg-accent'}`}
                            style={{ width: `${Math.min(100, ltvVal)}%` }}
                          />
                        </div>
                        {isException && (
                          <span
                            className="mt-0.5 text-[9px] font-bold text-warn flex items-center gap-0.5"
                            title="Tài sản hạn chế nhận nhưng được gán LTV > 0. Cần có phê duyệt ngoại lệ."
                          >
                            <AlertTriangle className="w-2.5 h-2.5" /> NGOẠI LỆ
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sức cấp tín dụng tối đa */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-accent text-xs">
                        {fmtMoney(maxLoanFromCollateral(c))}
                      </span>
                    </td>

                    {/* Ngày định giá */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-ink-faint text-xs">
                      {fmtDate(c.AppraisalDate) || '—'}
                    </td>

                    {/* Hạn định giá */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-ink text-xs font-semibold">
                      {fmtDate(expDate) || '—'}
                    </td>

                    {/* Trạng thái hiệu lực (Tách riêng 1 cột độc lập) */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {st === 'expired' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-neg-soft text-neg border border-neg/30 shadow-2xs">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          <span>Hết hiệu lực</span>
                        </span>
                      )}
                      {st === 'expiring_soon' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-warn-soft text-warn border border-warn/30 shadow-2xs">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>Sắp hết hạn</span>
                        </span>
                      )}
                      {st === 'missing' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface text-ink-faint border border-line/60 shadow-2xs">
                          <span>Chưa định giá</span>
                        </span>
                      )}
                      {st === 'valid' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-pos-soft text-pos border border-pos/30 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>Đang hiệu lực</span>
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRow(c);
                          }}
                          className="p-1.5 rounded-lg text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors cursor-pointer"
                          title="Chỉnh sửa tài sản"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c);
                          }}
                          disabled={deletingId === c.Id}
                          className="p-1.5 rounded-lg text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors disabled:opacity-40 cursor-pointer"
                          title="Xóa tài sản"
                        >
                          {deletingId === c.Id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Frosted Summary Footer */}
          {paginatedCollaterals.length > 0 && (
            <tfoot className="sticky bottom-0 z-10 bg-surface/95 backdrop-blur-md border-t-2 border-line/80 font-bold text-xs text-ink">
              <tr>
                <td colSpan={3} className="px-4 py-3 uppercase tracking-wider text-[10px] text-ink-faint">
                  TỔNG CỘNG TRANG HIỆN HÀNH ({paginatedCollaterals.length} TSBĐ)
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-pos text-xs">
                  {fmtMoney(pageTotalValue)}
                </td>
                <td className="px-4 py-3 text-center text-ink-faint text-[11px]">—</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-accent text-xs">
                  {fmtMoney(pageTotalMaxLoan)}
                </td>
                <td colSpan={4} className="px-4 py-3 text-center text-ink-faint text-[10px]">
                  Hiển thị {paginatedCollaterals.length} / {filteredCollaterals.length} TSBĐ
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 sm:px-4 border-t border-line/60 bg-surface/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-ink-faint text-[11px]">
            Trang <strong className="text-ink">{colPage}</strong> / {totalPages} (Tổng {filteredCollaterals.length} TSBĐ)
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setColPage(p => Math.max(1, p - 1))}
              disabled={colPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line/70 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed bg-surface cursor-pointer shadow-2xs transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trang trước</span>
            </button>
            <button
              type="button"
              onClick={() => setColPage(p => Math.min(totalPages, p + 1))}
              disabled={colPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line/70 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed bg-surface cursor-pointer shadow-2xs transition-colors"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

