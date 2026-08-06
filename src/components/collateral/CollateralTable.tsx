import React from 'react';
import { Building2, Trash2, Loader2 } from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import type { UiClasses } from '../../lib/uiClasses';
import { fmtMoney, fmtDate } from '../../lib/utils';
import { isLtvException, appraisalStatus, appraisalExpiryDate, assetClassLabel } from '../../lib/collateralMath';

interface CollateralTableProps {
  styles: UiClasses;
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
      <div className={`p-3 border-b flex items-center justify-between ${'bg-panel-muted border-line'}`}>
        <span className="font-bold flex items-center space-x-2 text-xs">
          <Building2 className="w-4 h-4 text-accent" />
          <span>DANH SÁCH TÀI SẢN BẢO ĐẢM ({filteredCollaterals.length} TẢI SẢN)</span>
        </span>
        <span className="text-[11px] text-ink-faint">Nhấp vào dòng để xem chi tiết / chỉnh sửa</span>
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
          <tbody className={`divide-y ${'divide-line'}`}>
            {paginatedCollaterals.length === 0 ? (
              <tr><td colSpan={9} className="text-center p-8 text-ink-faint">Không tìm thấy tài sản bảo đảm nào.</td></tr>
            ) : paginatedCollaterals.map(col => {
              const cust = customers.find(c => c.Id === col.CustomerId);
              const isSelected = selectedCollateral?.Id === col.Id;
              const val = col.AppraisedValue || col.Value || 0;
              const effectiveLtv = getEffectiveLtv(col);
              const maxLoan = val * effectiveLtv / 100;
              const isException = isLtvException(col);
              const dgStatus = appraisalStatus(col);

              return (
                <tr key={col.Id} onClick={() => handleSelectRow(col)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-accent-soft border-l-2 border-l-accent font-semibold'
                      : styles.tableRowHover
                  }`}>
                  <td className="p-3 whitespace-nowrap">
                    <div className="font-bold text-ink">{cust ? cust.FullName : `ID #${col.CustomerId}`}</div>
                    <div className="text-[10px] font-mono text-accent">{cust ? `CIF: ${cust.CifKh}` : ''}</div>
                  </td>
                  <td className="p-3 font-semibold text-accent whitespace-nowrap">
                    {assetClassLabel(col.AssetType)}
                  </td>
                  <td className="p-3 font-mono text-ink-muted">
                    <div className="font-bold">{col.AssetCode || '—'}</div>
                    <div className="text-[10px] text-ink-faint font-sans truncate max-w-xs">{col.Address}</div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-pos whitespace-nowrap">
                    {fmtMoney(val)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${
                      isException
                        ? 'bg-warn-soft text-warn border-warn/30 '
                        : 'bg-accent-soft text-accent border-accent/30'
                    }`}>
                      {effectiveLtv}%
                    </span>
                    {isException && (
                      <div
                        className="mt-1 text-[10px] font-bold text-warn"
                        title="Tài sản hạn chế nhận nhưng được gán LTV > 0. Cần có phê duyệt ngoại lệ."
                      >
                        ⚠ NGOẠI LỆ
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-accent  whitespace-nowrap">
                    {fmtMoney(maxLoan)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap text-ink-faint font-mono">
                    {fmtDate(col.AppraisalDate)}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap font-mono">
                    <span className={
                      dgStatus === 'expired' ? 'text-neg font-bold'
                      : dgStatus === 'expiring_soon' ? 'text-warn font-bold'
                      : 'text-ink-faint'
                    }>
                      {fmtDate(col.AppraisalExpiryDate || appraisalExpiryDate(col))}
                    </span>
                    {dgStatus === 'expired' && (
                      <div className="text-[10px] font-bold text-neg"
                        title="Định giá đã hết hiệu lực, không được tính vào khả năng bảo đảm cho tới khi định giá lại.">
                        HẾT HIỆU LỰC
                      </div>
                    )}
                    {dgStatus === 'expiring_soon' && (
                      <div className="text-[10px] font-bold text-warn">
                        SẮP HẾT HẠN
                      </div>
                    )}
                    {dgStatus === 'missing' && (
                      <div className="text-[10px] font-bold text-ink-faint">CHƯA ĐỊNH GIÁ</div>
                    )}
                  </td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(col); }}
                      disabled={deletingId === col.Id}
                      className="p-1.5 rounded-lg border border-transparent text-ink-faint hover:text-neg hover:bg-neg hover:border-neg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {totalPages > 1 && (
        <div className={`p-3 border-t flex items-center justify-between text-xs ${'bg-panel-muted border-line'}`}>
          <span className="text-ink-faint">Trang {colPage} / {totalPages}</span>
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
