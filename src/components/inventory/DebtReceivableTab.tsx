import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Users, Pencil, X, Save } from 'lucide-react';
import {
  computeReceivableItemRow, computeReceivableSummary, nextDebtItemId,
  type ReceivableItem,
} from '../../lib/debt';
import { fmtMoney, fmtNumber, parseMoneyDecimalInput, formatMoneyInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface DebtReceivableTabProps {
  receivables: ReceivableItem[];
  onChangeReceivables: (items: ReceivableItem[]) => void;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

const EditReceivableModal: React.FC<{
  item: ReceivableItem;
  onSave: (updated: ReceivableItem) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [begDebStr, setBegDebStr] = useState(item.beginningDebit ? formatMoneyInput(String(item.beginningDebit)) : '');
  const [begCredStr, setBegCredStr] = useState(item.beginningCredit ? formatMoneyInput(String(item.beginningCredit)) : '');
  const [occDebStr, setOccDebStr] = useState(item.occurredDebit ? formatMoneyInput(String(item.occurredDebit)) : '');
  const [occCredStr, setOccCredStr] = useState(item.occurredCredit ? formatMoneyInput(String(item.occurredCredit)) : '');

  const begDebit = parseMoneyDecimalInput(begDebStr);
  const begCredit = parseMoneyDecimalInput(begCredStr);
  const occDebit = parseMoneyDecimalInput(occDebStr);
  const occCredit = parseMoneyDecimalInput(occCredStr);

  // Ending balance calculation
  const totalDebit = begDebit + occDebit;
  const totalCredit = begCredit + occCredit;
  const netDebit = totalDebit - totalCredit;
  const endDebit = netDebit > 0 ? netDebit : 0;
  const endCredit = netDebit < 0 ? Math.abs(netDebit) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...item,
      code: code.trim() || item.code,
      name: name.trim(),
      beginningDebit: begDebit,
      beginningCredit: begCredit,
      occurredDebit: occDebit,
      occurredCredit: occCredit,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className={`${UI.containerCardBg} rounded-xl border border-line-strong shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 text-xs`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="p-3.5 border-b border-line bg-panel-muted/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pencil className="w-4 h-4 text-accent" />
            <h3 className="font-bold text-sm text-ink uppercase">SỬA CÔNG NỢ KHÁCH HÀNG: {item.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Mã khách hàng</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`w-full p-2 rounded-lg font-mono font-bold ${UI.inputStyle}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block mb-1 ${UI.labelStyle}`}>Tên khách hàng nợ *</label>
              <input
                type="text"
                value={name}
                required
                onChange={e => setName(e.target.value)}
                className={`w-full p-2 rounded-lg font-bold text-ink ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 text-ink-faint text-[11px] font-semibold`}>Dư NỢ đầu kỳ (VNĐ)</label>
              <input
                type="text"
                value={begDebStr}
                onChange={e => setBegDebStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-ink-faint text-[11px] font-semibold`}>Dư CÓ đầu kỳ (VNĐ)</label>
              <input
                type="text"
                value={begCredStr}
                onChange={e => setBegCredStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right ${UI.inputStyle}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-line">
            <div>
              <label className={`block mb-1 text-pos text-[11px] font-bold`}>Phát sinh NỢ trong kỳ (+)</label>
              <input
                type="text"
                value={occDebStr}
                onChange={e => setOccDebStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-pos font-bold ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-neg text-[11px] font-bold`}>Phát sinh CÓ trong kỳ (−)</label>
              <input
                type="text"
                value={occCredStr}
                onChange={e => setOccCredStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-neg font-bold ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-lg bg-accent-soft/40 border border-accent/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-pos uppercase font-bold">DƯ NỢ CUỐI KỲ DỰ TÍNH</div>
              <div className="font-mono font-bold text-pos text-sm mt-0.5">
                {fmtMoney(endDebit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink-muted uppercase font-bold">DƯ CÓ CUỐI KỲ DỰ TÍNH</div>
              <div className="font-mono font-bold text-ink text-sm mt-0.5">
                {fmtMoney(endCredit)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-line text-ink-muted hover:bg-panel-muted text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-accent text-accent-ink font-bold text-xs flex items-center space-x-1.5 hover:opacity-90 shadow-xs transition-opacity"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DebtReceivableTab: React.FC<DebtReceivableTabProps> = ({
  receivables,
  onChangeReceivables,
  showNotify,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<ReceivableItem | null>(null);
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

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return receivables;
    const term = searchTerm.toLowerCase().trim();
    return receivables.filter(
      it => it.code.toLowerCase().includes(term) || it.name.toLowerCase().includes(term)
    );
  }, [receivables, searchTerm]);

  const summary = useMemo(() => computeReceivableSummary(receivables), [receivables]);

  return (
    <div className="space-y-4 text-xs">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-accent-soft rounded-lg text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-accent tracking-tight uppercase">
              BẢNG CÔNG NỢ PHẢI THU
            </h2>
            <p className="text-xs text-ink-faint">
              Theo dõi và kiểm kê các khoản công nợ phải thu từ Khách hàng kinh doanh
            </p>
          </div>
        </div>
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
              TỔNG SỐ DƯ PHẢI THU CUỐI KỲ
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
            placeholder="Mã KH (tùy chọn)"
            value={newCode}
            onChange={e => setNewCode(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono`}
          />
          <input
            type="text"
            placeholder="Tên Khách hàng *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-bold text-ink sm:col-span-2 lg:col-span-1`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Dư Nợ đầu kỳ"
            value={newBegDebStr}
            onChange={e => setNewBegDebStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Dư Có đầu kỳ"
            value={newBegCredStr}
            onChange={e => setNewBegCredStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Phát sinh Nợ"
            value={newOccDebStr}
            onChange={e => setNewOccDebStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right text-pos`}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="Phát sinh Có"
            value={newOccCredStr}
            onChange={e => setNewOccCredStr(formatMoneyInput(e.target.value))}
            className={`rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right text-neg`}
          />
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3 py-1.5 rounded flex items-center space-x-1 shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào bảng</span>
          </button>
        </div>
      </form>

      {/* Main Table */}
      <div className={`${UI.containerCardBg} rounded-xl border border-line overflow-hidden shadow-xs`}>
        <div className="p-3 border-b border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên khách hàng..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-md text-xs border ${UI.inputStyle}`}
            />
          </div>
          <div className="text-xs text-ink-faint">Hiển thị {filteredItems.length} khách hàng</div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line z-10">
              <tr>
                <th className="p-2 text-center w-24" rowSpan={2}>MÃ KH</th>
                <th className="p-2 min-w-[200px]" rowSpan={2}>TÊN KHÁCH HÀNG</th>
                <th className="p-1.5 text-center border-l border-line" colSpan={2}>SỐ DƯ ĐẦU KỲ</th>
                <th className="p-1.5 text-center border-l border-line" colSpan={2}>PHÁT SINH TRONG KỲ</th>
                <th className="p-1.5 text-center border-l border-line bg-pos-soft text-pos font-bold" colSpan={2}>SỐ DƯ CUỐI KỲ</th>
                <th className="p-2 text-center w-20" rowSpan={2}>THAO TÁC</th>
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
            <tbody className="divide-y divide-line font-mono">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-ink-faint italic font-app">
                    Chưa có đối tác công nợ nào trong danh sách.
                  </td>
                </tr>
              ) : (
                filteredItems.map(rawItem => {
                  const c = computeReceivableItemRow(rawItem);
                  return (
                    <tr
                      key={c.id}
                      onDoubleClick={() => setEditingItem(rawItem)}
                      className="hover:bg-panel-muted/50 transition-colors cursor-pointer group"
                      title="Nhấp đúp hoặc bấm nút Sửa để chỉnh sửa"
                    >
                      <td className="p-2.5 text-center font-bold text-accent">{c.code}</td>
                      <td className="p-2.5 font-semibold text-ink font-app">{c.name}</td>
                      <td className="p-2.5 text-right border-l border-line text-ink">
                        {c.beginningDebit > 0 ? fmtNumber(c.beginningDebit) : '0'}
                      </td>
                      <td className="p-2.5 text-right text-ink">
                        {c.beginningCredit > 0 ? fmtNumber(c.beginningCredit) : '0'}
                      </td>
                      <td className="p-2.5 text-right border-l border-line font-bold text-pos">
                        {c.occurredDebit > 0 ? fmtNumber(c.occurredDebit) : '0'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-neg">
                        {c.occurredCredit > 0 ? fmtNumber(c.occurredCredit) : '0'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-pos border-l border-line bg-pos-soft/40">
                        {c.endingDebit > 0 ? fmtNumber(c.endingDebit) : '0'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-pos bg-pos-soft/40">
                        {c.endingCredit > 0 ? fmtNumber(c.endingCredit) : '0'}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setEditingItem(rawItem);
                            }}
                            className="p-1 rounded text-ink-faint hover:text-accent hover:bg-accent-soft transition-colors"
                            title="Sửa đối tác này"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              removeItem(c.id);
                            }}
                            className="p-1 rounded text-ink-faint hover:text-neg hover:bg-neg-soft transition-colors"
                            title="Xóa đối tác này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-accent-soft font-bold border-t-2 border-accent/30 sticky bottom-0 z-10">
              <tr>
                <td className="p-2 text-center" colSpan={2}>TỔNG CỘNG ({fmtNumber(summary.totalItems)} KHÁCH HÀNG)</td>
                <td className="p-2 text-right font-mono border-l border-line">{fmtNumber(summary.totalBeginningDebit)}</td>
                <td className="p-2 text-right font-mono">{fmtNumber(summary.totalBeginningCredit)}</td>
                <td className="p-2 text-right font-mono border-l border-line">{fmtNumber(summary.totalOccurredDebit)}</td>
                <td className="p-2 text-right font-mono">{fmtNumber(summary.totalOccurredCredit)}</td>
                <td className="p-2 text-right font-mono border-l border-line text-pos text-sm bg-pos-soft/60">{fmtNumber(summary.totalEndingDebit)}</td>
                <td className="p-2 text-right font-mono text-pos text-sm bg-pos-soft/60">{fmtNumber(summary.totalEndingCredit)}</td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <EditReceivableModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật công nợ "${updated.name}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};
