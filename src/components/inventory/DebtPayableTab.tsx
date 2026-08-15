import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Building2 } from 'lucide-react';
import {
  computeReceivableItemRow, computeReceivableSummary, nextDebtItemId,
  type ReceivableItem,
} from '../../lib/debt';
import { fmtMoney, fmtNumber, parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtPayableTabProps {
  payables: ReceivableItem[];
  onChangePayables: (items: ReceivableItem[]) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

const MoneyCellInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [valStr, setValStr] = useState<string>(value ? formatMoneyInput(String(value)) : '');
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseMoneyDecimalInput(valStr);
    onChange(parsed);
    setValStr(parsed ? formatMoneyInput(String(parsed)) : '');
  };

  const handleFocus = () => {
    setIsEditing(true);
    setValStr(value ? String(value) : '');
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isEditing ? valStr : value ? formatMoneyInput(String(value)) : ''}
      onChange={e => setValStr(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
    />
  );
};

export const DebtPayableTab: React.FC<DebtPayableTabProps> = ({
  payables,
  onChangePayables,
  showNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newBegDebStr, setNewBegDebStr] = useState('');
  const [newBegCredStr, setNewBegCredStr] = useState('');
  const [newOccDebStr, setNewOccDebStr] = useState('');
  const [newOccCredStr, setNewOccCredStr] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotify('error', 'Vui lòng nhập tên Nhà cung cấp / Đối tác.');
      return;
    }
    const item: ReceivableItem = {
      id: nextDebtItemId(),
      code: newCode.trim() || `NCC${payables.length + 1}`,
      name: newName.trim(),
      beginningDebit: parseMoneyDecimalInput(newBegDebStr),
      beginningCredit: parseMoneyDecimalInput(newBegCredStr),
      occurredDebit: parseMoneyDecimalInput(newOccDebStr),
      occurredCredit: parseMoneyDecimalInput(newOccCredStr),
    };
    onChangePayables([item, ...payables]);
    setNewCode('');
    setNewName('');
    setNewBegDebStr('');
    setNewBegCredStr('');
    setNewOccDebStr('');
    setNewOccCredStr('');
    showNotify('success', `Đã thêm đối tác phải trả: ${item.name}`);
  };

  const updateItem = (id: string, patch: Partial<ReceivableItem>) => {
    onChangePayables(payables.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChangePayables(payables.filter(it => it.id !== id));
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return payables;
    const term = searchTerm.toLowerCase().trim();
    return payables.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [payables, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(payables), [payables]);
  const cellInputCls = 'w-full bg-transparent text-xs p-1 rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className="space-y-4 text-xs">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              BẢNG CÔNG NỢ PHẢI TRẢ
            </h2>
            <p className="text-xs text-ink-faint">
              Theo dõi và kiểm kê các khoản công nợ phải trả Nhà cung cấp / Đối tác kinh doanh
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
          <div>
            <span className="text-[10px] text-ink-faint uppercase font-bold">TỔNG DƯ NỢ ĐẦU KỲ (CÓ)</span>
            <div className="text-sm font-extrabold text-accent font-mono mt-0.5">
              {fmtMoney(summary.totalBeginningCredit)}
            </div>
          </div>
          <Building2 className="w-4 h-4 text-accent opacity-50" />
        </div>

        <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
          <div>
            <span className="text-[10px] text-ink-faint uppercase font-bold">TỔNG PHÁT SINH TRONG KỲ</span>
            <div className="text-sm font-extrabold text-ink font-mono mt-0.5">
              {fmtMoney(summary.totalOccurredCredit)}
            </div>
          </div>
          <Building2 className="w-4 h-4 text-ink-faint opacity-50" />
        </div>

        <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
          <div>
            <span className="text-[10px] text-ink-faint uppercase font-bold">TỔNG DƯ NỢ CUỐI KỲ (CÓ)</span>
            <div className="text-sm font-extrabold text-pos font-mono mt-0.5">
              {fmtMoney(summary.totalEndingCredit)}
            </div>
          </div>
          <Building2 className="w-4 h-4 text-pos opacity-50" />
        </div>
      </div>

      {/* Form Add New Partner */}
      <form onSubmit={handleAddItem} className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
        <div className="text-xs font-bold text-accent uppercase flex items-center space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Thêm Nhà cung cấp / Đối tác phải trả</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 pt-1">
          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Mã NCC</label>
            <input
              type="text"
              placeholder="VD: NCC01"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Tên Nhà cung cấp / Đối tác</label>
            <input
              type="text"
              placeholder="VD: Công ty Xi măng Hà Tiên"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-bold`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Đầu kỳ Nợ (VND)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={newBegDebStr}
              onChange={e => setNewBegDebStr(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Đầu kỳ Có (VND)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={newBegCredStr}
              onChange={e => setNewBegCredStr(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-accent hover:opacity-90 text-accent-ink text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm NCC</span>
            </button>
          </div>
        </div>
      </form>

      {/* Main Table */}
      <div className={`${UI.containerCardBg} rounded-lg p-3 border space-y-3`}>
        <div className="flex items-center justify-between border-b border-line pb-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm theo Mã hoặc Tên đối tác..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
            />
          </div>
          <div className="text-xs text-ink-faint">Hiển thị {filteredItems.length} đối tác</div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2 text-center w-24" rowSpan={2}>MÃ NCC</th>
                <th className="p-2 min-w-[200px]" rowSpan={2}>TÊN NHÀ CUNG CẤP / ĐỐI TÁC</th>
                <th className="p-2 text-center border-l border-line" colSpan={2}>DƯ NỢ ĐẦU KỲ</th>
                <th className="p-2 text-center border-l border-line" colSpan={2}>PHÁT SINH TRONG KỲ</th>
                <th className="p-2 text-center border-l border-line" colSpan={2}>DƯ NỢ CUỐI KỲ</th>
                <th className="p-2 text-center w-10" rowSpan={2}></th>
              </tr>
              <tr>
                <th className="p-2 text-right w-28 border-l border-line">NỢ</th>
                <th className="p-2 text-right w-28">CÓ</th>
                <th className="p-2 text-right w-28 border-l border-line">NỢ</th>
                <th className="p-2 text-right w-28">CÓ</th>
                <th className="p-2 text-right w-28 border-l border-line">NỢ</th>
                <th className="p-2 text-right w-28 font-bold text-pos bg-pos-soft">CÓ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map(rawItem => {
                const c = computeReceivableItemRow(rawItem);
                return (
                  <tr key={c.id} className="hover:bg-panel-muted/50 transition-colors">
                    <td className="p-1 text-center">
                      <input
                        type="text"
                        value={c.code}
                        onChange={e => updateItem(c.id, { code: e.target.value })}
                        className={`${cellInputCls} text-center`}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateItem(c.id, { name: e.target.value })}
                        className={`${cellInputCls} font-bold`}
                      />
                    </td>
                    <td className="p-1 border-l border-line">
                      <MoneyCellInput
                        value={c.beginningDebit}
                        onChange={v => updateItem(c.id, { beginningDebit: v })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-1">
                      <MoneyCellInput
                        value={c.beginningCredit}
                        onChange={v => updateItem(c.id, { beginningCredit: v })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-1 border-l border-line">
                      <MoneyCellInput
                        value={c.occurredDebit}
                        onChange={v => updateItem(c.id, { occurredDebit: v })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-1">
                      <MoneyCellInput
                        value={c.occurredCredit}
                        onChange={v => updateItem(c.id, { occurredCredit: v })}
                        className={`${cellInputCls} text-right`}
                      />
                    </td>
                    <td className="p-1 border-l border-line">
                      <span className="font-mono text-right block px-1 text-ink-muted">
                        {c.endingDebit ? fmtNumber(c.endingDebit) : '-'}
                      </span>
                    </td>
                    <td className="p-1 bg-pos-soft/30 font-bold text-pos">
                      <span className="font-mono text-right block px-1">
                        {c.endingCredit ? fmtNumber(c.endingCredit) : '-'}
                      </span>
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(c.id)}
                        className="p-1 text-ink-faint hover:text-neg rounded transition-colors"
                        title="Xóa nhà cung cấp này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-ink-faint">
                    Chưa có đối tác công nợ nào trong danh sách.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-panel-muted border-t-2 border-line font-bold">
              <tr>
                <td colSpan={2} className="p-2 text-right uppercase">TỔNG CỘNG:</td>
                <td className="p-2 text-right font-mono border-l border-line">{summary.totalBeginningDebit ? fmtNumber(summary.totalBeginningDebit) : '0'}</td>
                <td className="p-2 text-right font-mono">{summary.totalBeginningCredit ? fmtNumber(summary.totalBeginningCredit) : '0'}</td>
                <td className="p-2 text-right font-mono border-l border-line">{summary.totalOccurredDebit ? fmtNumber(summary.totalOccurredDebit) : '0'}</td>
                <td className="p-2 text-right font-mono">{summary.totalOccurredCredit ? fmtNumber(summary.totalOccurredCredit) : '0'}</td>
                <td className="p-2 text-right font-mono border-l border-line">{summary.totalEndingDebit ? fmtNumber(summary.totalEndingDebit) : '0'}</td>
                <td className="p-2 text-right font-mono text-pos bg-pos-soft">{summary.totalEndingCredit ? fmtNumber(summary.totalEndingCredit) : '0'}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
