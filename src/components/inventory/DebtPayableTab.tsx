import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Search, Building2, Pencil, X, Save } from 'lucide-react';
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

const EditPayableModal: React.FC<{
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

  const totalDebit = begDebit + occDebit;
  const totalCredit = begCredit + occCredit;
  const netCredit = totalCredit - totalDebit;
  const endDebit = netCredit < 0 ? Math.abs(netCredit) : 0;
  const endCredit = netCredit > 0 ? netCredit : 0;

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
            <h3 className="font-bold text-sm text-ink uppercase">SỬA NHÀ CUNG CẤP: {item.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-panel">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block mb-1 ${UI.labelStyle}`}>Mã NCC</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`w-full p-2 rounded-lg font-mono font-bold ${UI.inputStyle}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block mb-1 ${UI.labelStyle}`}>Tên Nhà cung cấp / Đối tác *</label>
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
              <label className={`block mb-1 text-pos text-[11px] font-bold`}>Phát sinh NỢ trong kỳ (Đã trả)</label>
              <input
                type="text"
                value={occDebStr}
                onChange={e => setOccDebStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-pos font-bold ${UI.inputStyle}`}
              />
            </div>
            <div>
              <label className={`block mb-1 text-warn text-[11px] font-bold`}>Phát sinh CÓ trong kỳ (Mua thêm)</label>
              <input
                type="text"
                value={occCredStr}
                onChange={e => setOccCredStr(formatMoneyInput(e.target.value))}
                className={`w-full p-2 rounded-lg font-mono text-right text-warn font-bold ${UI.inputStyle}`}
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-2.5 rounded-lg bg-accent-soft/40 border border-accent/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-ink-muted uppercase font-bold">DƯ NỢ CUỐI KỲ (ỨNG TRƯỚC)</div>
              <div className="font-mono font-bold text-ink text-sm mt-0.5">
                {fmtMoney(endDebit)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-pos uppercase font-bold">DƯ CÓ CUỐI KỲ (PHẢI TRẢ)</div>
              <div className="font-mono font-black text-pos text-sm mt-0.5">
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

export const DebtPayableTab: React.FC<DebtPayableTabProps> = ({
  payables,
  onChangePayables,
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
    showNotify('success', `Đã thêm đối tác: ${item.name}`);
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
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Tên Nhà cung cấp / Đối tác *</label>
            <input
              type="text"
              placeholder="VD: Công ty Xi măng Hà Tiên"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-bold text-ink`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Dư Nợ đầu kỳ</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={newBegDebStr}
              onChange={e => setNewBegDebStr(formatMoneyInput(e.target.value))}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
            />
          </div>

          <div>
            <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Dư Có đầu kỳ</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={newBegCredStr}
              onChange={e => setNewBegCredStr(formatMoneyInput(e.target.value))}
              className={`w-full rounded p-1.5 text-xs border ${UI.inputStyle} font-mono text-right`}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-accent hover:opacity-90 text-accent-ink text-xs font-bold py-1.5 px-3 rounded flex items-center justify-center space-x-1 shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm NCC</span>
            </button>
          </div>
        </div>
      </form>

      {/* Main Table */}
      <div className={`${UI.containerCardBg} rounded-xl border border-line overflow-hidden shadow-xs`}>
        <div className="p-3 border-b border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
                <th className="p-2 text-center w-20" rowSpan={2}>THAO TÁC</th>
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
            <tbody className="divide-y divide-line font-mono">
              {filteredItems.map(rawItem => {
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
                      {c.beginningDebit ? fmtNumber(c.beginningDebit) : '0'}
                    </td>
                    <td className="p-2.5 text-right text-ink">
                      {c.beginningCredit ? fmtNumber(c.beginningCredit) : '0'}
                    </td>
                    <td className="p-2.5 text-right border-l border-line font-bold text-pos">
                      {c.occurredDebit ? fmtNumber(c.occurredDebit) : '0'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-warn">
                      {c.occurredCredit ? fmtNumber(c.occurredCredit) : '0'}
                    </td>
                    <td className="p-2.5 border-l border-line text-right text-ink-muted">
                      {c.endingDebit ? fmtNumber(c.endingDebit) : '-'}
                    </td>
                    <td className="p-2.5 bg-pos-soft/30 font-bold text-pos text-right">
                      {c.endingCredit ? fmtNumber(c.endingCredit) : '-'}
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
                          title="Sửa nhà cung cấp này"
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
                          title="Xóa nhà cung cấp này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-ink-faint italic font-app">
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

      {/* Edit Modal */}
      {editingItem && (
        <EditPayableModal
          item={editingItem}
          onSave={updated => {
            updateItem(updated.id, updated);
            showNotify('success', `Đã cập nhật nhà cung cấp "${updated.name}" thành công.`);
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};
