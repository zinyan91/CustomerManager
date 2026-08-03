import React from 'react';
import { Building2, Trash2, Loader2 } from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import type { ThemeStyles } from '../../lib/themeStyles';
import { fmtMoney, fmtDate, formatAssetType } from '../../lib/utils';
import { isLtvException } from '../../lib/collateralMath';

interface CollateralTableProps {
  styles: ThemeStyles;
  isLight: boolean;
  filteredCollaterals: Collateral[];
  paginatedCollaterals: Collateral[];
  customers: Customer[];
  selectedCollateral: Collateral | null;
  handleSelectRow: (c: Collateral) => void;
  colPage: number;
  setColPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  getEffectiveLtv: (c: Collateral) => number;
  onDelete: (c: Collateral) => void;
  deletingId: number | null;
}

export const CollateralTable: React.FC<CollateralTableProps> = ({
  styles,
  isLight,
  filteredCollaterals,
  paginatedCollaterals,
  customers,
  selectedCollateral,
  handleSelectRow,
  colPage,
  setColPage,
  totalPages,
  getEffectiveLtv,
  onDelete,
  deletingId,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
      <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
        <span className="font-bold flex items-center space-x-2 text-xs">
          <Building2 className="w-4 h-4 text-sky-500" />
          <span>DANH SÁCH TÀI SẢN BẢO ĐẢM ({filteredCollaterals.length} TẢI SẢN)</span>
        </span>
        <span className="text-[11px] text-slate-400">Nhấp vào dòng để xem chi tiết / chỉnh sửa</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className={styles.tableHeaderStyle}>
            <tr>
              <th className="p-3 whitespace-nowrap">KHÁCH HÀNG / CIF</th>
              <th className="p-3 whitespace-nowrap">LOẠI TSBĐ</th>
              <th className="p-3 whitespace-nowrap">MÃ / SỐ GCN / ĐỊA CHỈ</th>
              <th className="p-3 whitespace-nowrap text-right">GIÁ TRỊ ĐỊNH GIÁ</th>
              <th className="p-3 whitespace-nowrap text-center">TỈ LỆ LTV</th>
              <th className="p-3 whitespace-nowrap text-right">HẠN MỨC CHO VAY TỐI ĐA</th>
              <th className="p-3 whitespace-nowrap text-center">NGÀY ĐỊNH GIÁ</th>
              <th className="p-3 whitespace-nowrap text-center">HẠN ĐỊNH GIÁ</th>
              <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
            {paginatedCollaterals.length === 0 ? (
              <tr><td colSpan={9} className="text-center p-8 text-slate-400">Không tìm thấy tài sản bảo đảm nào.</td></tr>
            ) : paginatedCollaterals.map(col => {
              const cust = customers.find(c => c.Id === col.CustomerId);
              const isSelected = selectedCollateral?.Id === col.Id;
              const val = col.AppraisedValue || col.Value || 0;
              const effectiveLtv = getEffectiveLtv(col);
              const maxLoan = val * effectiveLtv / 100;
              const isException = isLtvException(col);

              return (
                <tr key={col.Id} onClick={() => handleSelectRow(col)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/50 border-l-4 border-l-sky-500 font-semibold'
                      : styles.tableRowHover
                  }`}>
                  <td className="p-3 whitespace-nowrap">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{cust ? cust.FullName : `ID #${col.CustomerId}`}</div>
                    <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400">{cust ? `CIF: ${cust.CifKh}` : ''}</div>
                  </td>
                  <td className="p-3 font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                    {formatAssetType(col.AssetType)}
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                    <div className="font-bold">{col.AssetCode || '—'}</div>
                    <div className="text-[10px] text-slate-400 font-sans truncate max-w-xs">{col.Address}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {fmtMoney(val)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${
                      isException
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                        : 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800'
                    }`}>
                      {effectiveLtv}%
                    </span>
                    {isException && (
                      <div
                        className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                        title="Tài sản hạn chế nhận nhưng được gán LTV > 0. Cần có phê duyệt ngoại lệ."
                      >
                        ⚠ NGOẠI LỆ
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-sky-600 dark:text-sky-300 whitespace-nowrap">
                    {fmtMoney(maxLoan)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap text-slate-500 font-mono">
                    {fmtDate(col.AppraisalDate)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap text-slate-500 font-mono">
                    {fmtDate(col.AppraisalExpiryDate)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      // Chặn nổi bọt để không kích hoạt chọn dòng của <tr>
                      onClick={(e) => { e.stopPropagation(); onDelete(col); }}
                      disabled={deletingId === col.Id}
                      className="p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Xoá tài sản bảo đảm"
                    >
                      {deletingId === col.Id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className={`p-3 border-t flex items-center justify-between text-xs ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="text-slate-400">Trang {colPage} / {totalPages}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setColPage(p => Math.max(1, p - 1))}
              disabled={colPage === 1}
              className="px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-40"
            >
              Trang trước
            </button>
            <button
              onClick={() => setColPage(p => Math.min(totalPages, p + 1))}
              disabled={colPage === totalPages}
              className="px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
