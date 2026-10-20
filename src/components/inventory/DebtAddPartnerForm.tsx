import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ReceivableItem } from '../../lib/debt';
import { nextDebtItemId } from '../../lib/debt';
import { parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtAddPartnerFormProps {
  type: 'payable' | 'receivable';
  itemCount: number;
  onAdd: (item: ReceivableItem) => void;
  onError: (msg: string) => void;
}

export const DebtAddPartnerForm: React.FC<DebtAddPartnerFormProps> = ({
  type,
  itemCount,
  onAdd,
  onError,
}) => {
  const isPayable = type === 'payable';
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [begDebStr, setBegDebStr] = useState('');
  const [begCredStr, setBegCredStr] = useState('');
  const [occDebStr, setOccDebStr] = useState('');
  const [occCredStr, setOccCredStr] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError(isPayable ? 'Vui lòng nhập tên Nhà cung cấp / Đối tác.' : 'Vui lòng nhập tên Khách hàng nợ.');
      return;
    }

    const defaultCode = isPayable ? `NCC${itemCount + 1}` : `KH${itemCount + 1}`;
    const item: ReceivableItem = {
      id: nextDebtItemId(),
      code: code.trim() || defaultCode,
      name: name.trim(),
      beginningDebit: parseMoneyDecimalInput(begDebStr),
      beginningCredit: parseMoneyDecimalInput(begCredStr),
      occurredDebit: parseMoneyDecimalInput(occDebStr),
      occurredCredit: parseMoneyDecimalInput(occCredStr),
    };

    onAdd(item);
    setCode('');
    setName('');
    setBegDebStr('');
    setBegCredStr('');
    setOccDebStr('');
    setOccCredStr('');
  };

  return (
    <form
      data-workspace-panel
      onSubmit={handleSubmit}
      className={`${UI.containerCardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3 font-app animate-in fade-in duration-150`}
    >
      <div className="text-xs font-bold text-accent uppercase tracking-wider flex items-center space-x-2 border-b border-line/60 pb-2.5">
        <div className="p-1 rounded-lg bg-accent-soft text-accent shrink-0">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <span>{isPayable ? 'Thêm Nhà cung cấp / Đối tác phải trả' : 'Thêm Khách hàng nợ mới'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 pt-1">
        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            {isPayable ? 'Mã NCC' : 'Mã Khách hàng'}
          </label>
          <input
            type="text"
            placeholder={isPayable ? 'VD: NCC01' : 'VD: KH01'}
            value={code}
            onChange={e => setCode(e.target.value)}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-mono`}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            {isPayable ? 'Tên Nhà cung cấp / Đối tác *' : 'Tên Khách hàng nợ *'}
          </label>
          <input
            type="text"
            placeholder={isPayable ? 'VD: Công ty Xi măng Hà Tiên' : 'VD: Nguyễn Văn A (Đại lý VLXD)'}
            value={name}
            onChange={e => setName(e.target.value)}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-bold text-ink`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            Dư Nợ đầu kỳ
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={begDebStr}
            onChange={e => setBegDebStr(formatMoneyInput(e.target.value))}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>

        <div>
          <label className="block text-[10px] text-ink-faint uppercase font-bold tracking-wider mb-1">
            Dư Có đầu kỳ
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={begCredStr}
            onChange={e => setBegCredStr(formatMoneyInput(e.target.value))}
            className={`w-full rounded-xl p-2 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-accent hover:opacity-90 text-accent-ink text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-accent/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isPayable ? 'Thêm NCC' : 'Thêm KH'}</span>
          </button>
        </div>
      </div>
    </form>
  );
};
