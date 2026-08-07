import React from 'react';
import { Building2, Trash2, Loader2 } from 'lucide-react';
import type { Collateral, Customer } from '../../types';
import type { UiClasses } from '../../lib/uiClasses';
import { fmtMoney, fmtDate } from '../../lib/utils';
import { isLtvException, appraisalStatus, appraisalExpiryDate, assetClassLabel, collateralValue, maxLoanFromCollateral, getEffectiveLtv } from '../../lib/collateralMath';
import { AdaptiveTable } from '../AdaptiveTable';

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
  onDelete,
  deletingId,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-lg overflow-hidden border`}>
      <div className={`p-3 border-b flex items-center justify-between ${'bg-panel-muted border-line'}`}>
        <span className="font-bold flex items-center space-x-2 text-xs">
          <Building2 className="w-4 h-4 text-accent" />
          <span>DANH SÁCH TÀI SẢN BẢO ĐẢM ({filteredCollaterals.length} TẢI SẢN)</span>
        </span>
        <span className="text-[11px] text-ink-faint">Nhấp vào dòng để xem chi tiết / chỉnh sửa</span>
      </div>

      <AdaptiveTable
        rows={paginatedCollaterals}
        rowKey={c => c.Id}
        onRowClick={handleSelectRow}
        isSelected={c => selectedCollateral?.Id === c.Id}
        emptyText="Không tìm thấy tài sản bảo đảm nào."
        cardTitle={c => {
          const cust = customers.find(x => x.Id === c.CustomerId);
          return cust ? cust.FullName : `ID #${c.CustomerId}`;
        }}
        cardSubtitle={c => {
          const cust = customers.find(x => x.Id === c.CustomerId);
          return cust ? cust.CifKh : '';
        }}
        actions={c => (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(c); }}
            disabled={deletingId === c.Id}
            className="p-1.5 rounded-lg border border-transparent text-ink-faint hover:text-neg hover:bg-neg-soft hover:border-neg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Xoá tài sản bảo đảm"
          >
            {deletingId === c.Id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        columns={[
          { key: 'kh', label: 'Khách hàng / CIF', priority: 3, render: c => {
            const cust = customers.find(x => x.Id === c.CustomerId);
            return (
              <>
                <div className="font-bold text-ink">{cust ? cust.FullName : `ID #${c.CustomerId}`}</div>
                <div className="text-[10px] font-mono text-accent">{cust ? `CIF: ${cust.CifKh}` : ''}</div>
              </>
            );
          } },
          { key: 'loai', label: 'Loại TSBĐ', priority: 1,
            render: c => <span className="font-semibold text-accent">{assetClassLabel(c.AssetType)}</span> },
          { key: 'ma', label: 'Mã / Số GCN / Địa chỉ', priority: 2, render: c => (
            <div className="font-mono text-ink-muted">
              <div className="font-bold">{c.AssetCode || '—'}</div>
              <div className="text-[10px] text-ink-faint font-app truncate max-w-xs">{c.Address}</div>
            </div>
          ) },
          { key: 'giaTri', label: 'Giá trị định giá', priority: 1, align: 'right',
            render: c => <span className="font-mono font-bold text-pos">{fmtMoney(collateralValue(c))}</span> },
          { key: 'ltv', label: 'Tỉ lệ LTV', priority: 1, align: 'center', render: c => (
            <>
              <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs border ${
                isLtvException(c) ? 'bg-warn-soft text-warn border-warn/30' : 'bg-accent-soft text-accent border-accent/30'
              }`}>{getEffectiveLtv(c)}%</span>
              {isLtvException(c) && (
                <div className="mt-1 text-[10px] font-bold text-warn"
                  title="Tài sản hạn chế nhận nhưng được gán LTV > 0. Cần có phê duyệt ngoại lệ.">
                  ⚠ NGOẠI LỆ
                </div>
              )}
            </>
          ) },
          { key: 'hanMuc', label: 'Hạn mức cho vay tối đa', priority: 1, align: 'right',
            render: c => <span className="font-mono font-bold text-accent">{fmtMoney(maxLoanFromCollateral(c))}</span> },
          { key: 'ngayDG', label: 'Ngày định giá', priority: 3, align: 'center',
            render: c => <span className="text-ink-faint font-mono">{fmtDate(c.AppraisalDate)}</span> },
          { key: 'hanDG', label: 'Hạn định giá', priority: 2, align: 'center', render: c => {
            const st = appraisalStatus(c);
            return (
              <div className="font-mono">
                <span className={st === 'expired' ? 'text-neg font-bold' : st === 'expiring_soon' ? 'text-warn font-bold' : 'text-ink-faint'}>
                  {fmtDate(c.AppraisalExpiryDate || appraisalExpiryDate(c))}
                </span>
                {st === 'expired' && <div className="text-[10px] font-bold text-neg">HẾT HIỆU LỰC</div>}
                {st === 'expiring_soon' && <div className="text-[10px] font-bold text-warn">SẮP HẾT HẠN</div>}
                {st === 'missing' && <div className="text-[10px] font-bold text-ink-faint">CHƯA ĐỊNH GIÁ</div>}
              </div>
            );
          } },
        ]}
      />

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
