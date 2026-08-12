import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Users, Upload } from 'lucide-react';
import {
  computeReceivableItemRow, computeReceivableSummary, nextDebtItemId, parseReceivableText,
  type ReceivableItem,
} from '../../lib/debt';
import { fmtMoney, parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtReceivableTabProps {
  receivables: ReceivableItem[];
  onChangeReceivables: (items: ReceivableItem[]) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

const MoneyCellInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const [dangGo, setDangGo] = useState<string | null>(null);
  const shown = dangGo ?? (value === 0 ? '' : value.toLocaleString('vi-VN'));

  return (
    <input
      type="text"
      inputMode="decimal"
      value={shown}
      onChange={e => {
        setDangGo(e.target.value);
        onChange(parseMoneyDecimalInput(e.target.value));
      }}
      onBlur={() => setDangGo(null)}
      className={className}
    />
  );
};

export const DebtReceivableTab: React.FC<DebtReceivableTabProps> = ({
  receivables,
  onChangeReceivables,
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
      showNotify('error', 'Vui lòng nhập tên khách hàng nợ.');
      return;
    }
    const item: ReceivableItem = {
      id: nextDebtItemId(),
      code: newCode.trim() || `KH${receivables.length + 1}`,
      name: newName.trim(),
      beginningDebit: parseMoneyDecimalInput(newBegDebStr),
      beginningCredit: parseMoneyDecimalInput(newBegCredStr),
      occurredDebit: parseMoneyDecimalInput(newOccDebStr),
      occurredCredit: parseMoneyDecimalInput(newOccCredStr),
    };
    onChangeReceivables([item, ...receivables]);
    setNewCode('');
    setNewName('');
    setNewBegDebStr('');
    setNewBegCredStr('');
    setNewOccDebStr('');
    setNewOccCredStr('');
    showNotify('success', `Đã thêm khách hàng nợ: ${item.name}`);
  };

  const updateItem = (id: string, patch: Partial<ReceivableItem>) => {
    onChangeReceivables(receivables.map(it => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    onChangeReceivables(receivables.filter(it => it.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseReceivableText(text);
        if (parsed.length > 0) {
          onChangeReceivables(parsed);
          showNotify('success', `Đã nạp ${parsed.length} khách hàng công nợ từ tệp ${file.name}`);
        } else {
          showNotify('error', 'Không tìm thấy dữ liệu công nợ hợp lệ trong tệp.');
        }
      } catch (err: any) {
        showNotify('error', 'Lỗi khi đọc tệp: ' + (err?.message || 'Định dạng tệp không hỗ trợ'));
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return receivables;
    const term = searchTerm.toLowerCase().trim();
    return receivables.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [receivables, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(receivables), [receivables]);
  const cellInputCls = 'w-full bg-transparent text-xs p-1 rounded border border-transparent hover:border-line focus:border-accent focus:bg-panel outline-none transition-colors font-mono';

  return (
    <div className="space-y-4 text-xs">
      {/* Top Controls & Upload */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              BẢNG CÔNG NỢ PHẢI THU (TK 131)
            </h2>
            <p className="text-xs text-ink-faint">
              Theo dõi và kiểm kê các khoản công nợ phải thu từ Khách hàng kinh doanh
            </p>
          </div>
        </div>

        <label className="bg-panel-muted hover:bg-line text-ink text-xs px-3 py-1.5 rounded-md font-bold flex items-center space-x-1.5 cursor-pointer border border-line transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>Nạp tệp Excel/CSV Phải thu</span>
          <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">TỔNG KHÁCH HÀNG NỢ</div>
            <div className="text-xl font-extrabold text-accent mt-0.5 font-mono">
              {summary.totalItems} <span className="text-xs font-normal text-ink-faint">đối tác</span>
            </div>
          </div>
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className={`${UI.containerCardBg} rounded-lg p-3 border flex items-center justify-between`}>
          <div>
            <div className="text-[10px] font-bold text-ink-faint uppercase">PHÁT SINH NỢ / CÓ TRONG KỲ</div>
            <div className="text-sm font-bold text-ink mt-0.5 font-mono">
              + {fmtMoney(summary.totalOccurredDebit)}
            </div>
            <div className="text-xs font-semibold text-neg font-mono">
              − {fmtMoney(summary.totalOccurredCredit)}
            </div>
          </div>
        </div>

        <div className="rounded-lg p-3 border border-pos/30 bg-pos-soft flex items-center justify-between">
          <div>
            <div className="text-[10px] font-extrabold text-pos uppercase tracking-wide">
              TỔNG SỐ DƯ PHẢI THU CUỐI KỲ (TK 131)
            </div>
            <div className="text-xl font-black text-pos mt-0.5 font-mono">
              {fmtMoney(summary.totalEndingDebit)}
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className={`${UI.containerCardBg} rounded-lg p-3 border space-y-2`}>
        <div className="text-xs font-bold text-accent uppercase tracking-wide flex items-center space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Thêm Khách hàng nợ mới</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <input
            type="text"
            placeholder="Mã KH"
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
          />
          <input
            type="text"
            placeholder="Tên khách hàng *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} lg:col-span-2`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Đầu kỳ Nợ"
            value={newBegDebStr}
            onChange={e => setNewBegDebStr(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Phát sinh Nợ"
            value={newOccDebStr}
            onChange={e => setNewOccDebStr(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <button
            type="submit"
            className="bg-accent hover:opacity-90 text-accent-ink text-xs font-bold px-3 py-1.5 rounded flex items-center justify-center space-x-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm KH</span>
          </button>
        </div>
      </form>

      {/* Main Table Card */}
      <div className={`${UI.containerCardBg} rounded-lg p-3 border space-y-3`}>
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm kiếm mã KH, tên khách hàng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
            />
          </div>

          <div className="text-xs text-ink-faint">
            Hiển thị <strong>{filteredItems.length}</strong> / <strong>{receivables.length}</strong> đối tác
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2 text-center w-28" rowSpan={2}>MÃ KH</th>
                <th className="p-2 min-w-[220px]" rowSpan={2}>TÊN KHÁCH HÀNG</th>
                <th className="p-1.5 text-center border-l border-line" colSpan={2}>SỐ DƯ ĐẦU KỲ</th>
                <th className="p-1.5 text-center border-l border-line" colSpan={2}>PHÁT SINH TRONG KỲ</th>
                <th className="p-1.5 text-center border-l border-line bg-pos-soft text-pos font-bold" colSpan={2}>SỐ DƯ CUỐI KỲ</th>
                <th className="p-2 text-center w-10" rowSpan={2}></th>
              </tr>
              <tr>
                <th className="p-1.5 text-right border-l border-line">NỢ (VND)</th>
                <th className="p-1.5 text-right">CÓ (VND)</th>
                <th className="p-1.5 text-right border-l border-line">NỢ (VND)</th>
                <th className="p-1.5 text-right">CÓ (VND)</th>
                <th className="p-1.5 text-right border-l border-line bg-pos-soft text-pos font-bold">NỢ (VND)</th>
                <th className="p-1.5 text-right bg-pos-soft text-pos font-bold">CÓ (VND)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredItems.map(rawItem => {
                const c = computeReceivableItemRow(rawItem);
                return (
                  <tr key={c.id} className="hover:bg-panel-muted/50 transition-colors">
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.code}
                        onChange={e => updateItem(c.id, { code: e.target.value })}
                        className={`${cellInputCls} text-center font-bold`}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={c.name}
                        onChange={e => updateItem(c.id, { name: e.target.value })}
                        className={`${cellInputCls} font-semibold`}
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
                    <td className="p-2 text-right font-mono font-bold text-pos border-l border-line bg-pos-soft/40">
                      {c.endingDebit > 0 ? c.endingDebit.toLocaleString('vi-VN') : 0}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-pos bg-pos-soft/40">
                      {c.endingCredit > 0 ? c.endingCredit.toLocaleString('vi-VN') : 0}
                    </td>
                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(c.id)}
                        className="text-ink-faint hover:text-neg transition-colors p-1"
                        title="Xóa đối tác này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
              <tr>
                <td className="p-2 text-center" colSpan={2}>TỔNG CỘNG ({summary.totalItems} KHÁCH HÀNG)</td>
                <td className="p-2 text-right font-mono border-l border-line">{summary.totalBeginningDebit.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right font-mono">{summary.totalBeginningCredit.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right font-mono border-l border-line">{summary.totalOccurredDebit.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right font-mono">{summary.totalOccurredCredit.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right font-mono border-l border-line text-pos text-sm bg-pos-soft/60">{summary.totalEndingDebit.toLocaleString('vi-VN')}</td>
                <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60">{summary.totalEndingCredit.toLocaleString('vi-VN')}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
