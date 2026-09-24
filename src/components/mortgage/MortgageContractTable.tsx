import React from 'react';
import type { Collateral, CreditContract, MortgageContract } from '../../types';
import { collateralLabels, creditContractLabels } from '../../lib/mortgageContract';
import { fmtDate, fmtMoney } from '../../lib/utils';

const HEAD = 'px-4 py-3 whitespace-nowrap';
const CELL = 'px-4 py-3';

export const MortgageContractTable: React.FC<{
  rows: MortgageContract[];
  page: number;
  totalPages: number;
  total: number;
  collaterals: Collateral[];
  creditContracts: CreditContract[];
  onOpen: (m: MortgageContract) => void;
  onPage: (p: number) => void;
}> = ({ rows, page, totalPages, total, collaterals, creditContracts, onOpen, onPage }) => (
  <div className="rounded-2xl border border-line/70 bg-panel overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-surface border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.11em] text-ink-faint">
          <tr>
            <th className={HEAD}>Số HĐTC</th>
            <th className={HEAD}>Ngày ký</th>
            <th className={HEAD}>Bên thế chấp</th>
            <th className={`${HEAD} text-right`}>Giá trị bảo đảm tối đa</th>
            <th className={HEAD}>Tài sản</th>
            <th className={HEAD}>HĐTD được bảo đảm</th>
            <th className={HEAD}>Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {rows.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-10 text-ink-faint">Chưa có hợp đồng thế chấp.</td></tr>
          ) : rows.map(m => (
            <tr key={m.Id} onClick={() => onOpen(m)} className="cursor-pointer hover:bg-panel-muted/40">
              <td className={`${CELL} font-mono font-bold text-ink`}>{m.MortgageNumber}</td>
              <td className={`${CELL} font-mono`}>{m.SignedDate ? fmtDate(m.SignedDate) : '—'}</td>
              <td className={CELL}>{m.Pledgor || 'Chính khách hàng'}</td>
              <td className={`${CELL} text-right font-mono`}>
                {m.MaxSecuredAmount === null || m.MaxSecuredAmount === undefined ? '—' : fmtMoney(m.MaxSecuredAmount)}
              </td>
              <td className={`${CELL} font-mono`}>{collateralLabels(m.CollateralIds, collaterals).join(', ')}</td>
              <td className={`${CELL} font-mono`}>{creditContractLabels(m.CreditContractIds, creditContracts).join(', ')}</td>
              <td className={CELL}>
                {m.IsReleased
                  ? <span className="text-ink-muted">Đã giải chấp{m.ReleasedDate ? ` · ${fmtDate(m.ReleasedDate)}` : ''}</span>
                  : <span className="font-semibold text-ink">Đang hiệu lực</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {totalPages > 1 && (
      <div className="p-3 border-t border-line/60 flex items-center justify-between text-xs">
        <span className="text-ink-faint text-[11px]">
          Trang <strong className="text-ink">{page}</strong> / {totalPages} (Tổng {total} HĐTC)
        </span>
        <div className="flex gap-1.5">
          <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)}
            className="px-2.5 py-1 rounded-lg border border-line disabled:opacity-40 cursor-pointer">‹</button>
          <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
            className="px-2.5 py-1 rounded-lg border border-line disabled:opacity-40 cursor-pointer">›</button>
        </div>
      </div>
    )}
  </div>
);
