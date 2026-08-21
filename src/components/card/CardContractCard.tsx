import React from 'react';
import { BTN_SECONDARY, BTN_DANGER } from '../../lib/uiClasses';
import { isDebitCard } from '../../lib/cardContract';
import { fmtMoney } from '../../lib/utils';
import { Trash2, Pencil } from 'lucide-react';
import type { Customer, CardContract } from '../../types';

interface CardContractCardProps {
  contract: CardContract;
  customer: Customer;
  onEdit: (c: CardContract) => void;
  onDelete: (c: CardContract) => void;
}

export const CardContractCard: React.FC<CardContractCardProps> = ({
  contract: c,
  customer,
  onEdit,
  onDelete,
}) => {
  const debit = isDebitCard(c);

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border text-xs space-y-3 transition-all specular-card ${
        c.IsClosed
          ? 'bg-panel/50 border-line/60 opacity-75'
          : 'bg-panel/85 backdrop-blur-xl border-line/70 hover:border-accent/40 shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-accent text-sm sm:text-base">{c.CardContractNumber}</span>
            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
              c.IsClosed ? 'bg-panel-muted border border-line text-ink-faint' : 'bg-pos-soft border border-pos/30 text-pos'
            }`}>
              {c.IsClosed ? 'ĐÃ ĐÓNG' : 'HIỆU LỰC'}
            </span>
            <span className="text-[10px] text-ink-muted bg-surface/80 px-2.5 py-0.5 rounded-lg border border-line/60 font-semibold">
              {c.CardHolderSide === 'KHLQ' ? 'Chủ thẻ KHLQ' : 'Chủ thẻ KH'}
            </span>
          </div>
          <div className="text-ink font-bold text-xs">{c.CardHolderName || customer.FullName}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(c)}
            className={`${BTN_SECONDARY} text-xs py-1.5 px-3 rounded-xl cursor-pointer shadow-2xs`}
          >
            <Pencil size={12} className="inline mr-1" /> Sửa
          </button>
          <button
            type="button"
            onClick={() => onDelete(c)}
            className={`${BTN_DANGER} text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer shadow-2xs`}
          >
            <Trash2 size={12} /> Xoá
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-line/60 text-xs">
        <div>
          <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider block mb-0.5">Sản phẩm thẻ</span>
          <strong className="text-ink font-semibold">{c.CardProducts || 'Chưa chọn'}</strong>
        </div>
        <div>
          <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider block mb-0.5">Hạn mức cấp</span>
          <strong className="text-accent font-mono font-bold">
            {debit ? '0 VNĐ (Thẻ ghi nợ)' : fmtMoney(c.GrantedLimit || 0)}
          </strong>
        </div>
        <div>
          <span className="text-[10px] text-ink-faint uppercase font-bold tracking-wider block mb-0.5">Mã chính sách</span>
          <strong className="text-accent font-mono font-bold">{c.PolicyCode || 'Chưa chọn'}</strong>
        </div>
      </div>
    </div>
  );
};
