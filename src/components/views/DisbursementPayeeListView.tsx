import React, { useState, useEffect, useMemo } from 'react';
import { Landmark, Plus, Search, Edit3, Trash2, X } from 'lucide-react';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import { DateInput } from '../DateInput';
import { Toast, type ToastMessage } from '../Toast';
import {
  fetchDisbursementPayeesDb,
  upsertDisbursementPayeeDb,
  deleteDisbursementPayeeDb,
  type DisbursementPayee,
} from '../../lib/disbursementDb';
import { CCCD_ISSUE_PLACES, BANK_LIST } from '../../lib/documentOptions';
import { fmtDate, formatNationalId, parseNationalIdInput } from '../../lib/utils';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const EMPTY_PAYEE: DisbursementPayee = {
  Id: '',
  FullName: '',
  NationalId: '',
  IdCardIssueDate: '',
  IdCardIssuePlace: '',
  AccountNumber: '',
  BankName: '',
  BankBranch: '',
};

export const DisbursementPayeeListView: React.FC = () => {
  const [payees, setPayees] = useState<DisbursementPayee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayee, setEditingPayee] = useState<DisbursementPayee>(EMPTY_PAYEE);
  const [notification, setNotification] = useState<ToastMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchDisbursementPayeesDb();
      setPayees(data);
    } catch {
      setNotification({ type: 'error', message: 'Lỗi tải danh sách thông tin giải ngân.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayees = useMemo(() => {
    let list = payees;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = payees.filter((p) => {
        const name = (p.FullName || '').toLowerCase();
        const cccd = (p.NationalId || '').toLowerCase();
        const stk = (p.AccountNumber || '').toLowerCase();
        const bank = (p.BankName || '').toLowerCase();
        const branch = (p.BankBranch || '').toLowerCase();
        return (
          name.includes(q) ||
          cccd.includes(q) ||
          stk.includes(q) ||
          bank.includes(q) ||
          branch.includes(q)
        );
      });
    }
    return [...list].sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
  }, [payees, searchTerm]);

  const handleOpenCreate = () => {
    setEditingPayee({ ...EMPTY_PAYEE });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (payee: DisbursementPayee) => {
    setEditingPayee({ ...payee });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayee.FullName.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập Họ và tên người thụ hưởng.' });
      return;
    }

    setSaving(true);
    try {
      const saved = await upsertDisbursementPayeeDb({
        ...editingPayee,
        FullName: editingPayee.FullName.trim().toUpperCase(),
        NationalId: parseNationalIdInput(editingPayee.NationalId),
        AccountNumber: editingPayee.AccountNumber?.trim() || '',
        BankBranch: editingPayee.BankBranch?.trim() || '',
      });

      setPayees((prev) => {
        const idx = prev.findIndex((p) => p.Id === saved.Id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      setIsModalOpen(false);
      setNotification({
        type: 'success',
        message: editingPayee.Id ? 'Đã cập nhật thông tin giải ngân thành công.' : 'Đã thêm thông tin giải ngân mới thành công.',
      });
    } catch {
      setNotification({ type: 'error', message: 'Không thể lưu thông tin. Vui lòng thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thông tin giải ngân của "${name}"?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteDisbursementPayeeDb(id);
      setPayees((prev) => prev.filter((p) => p.Id !== id));
      setNotification({ type: 'success', message: `Đã xóa thông tin của "${name}".` });
    } catch {
      setNotification({ type: 'error', message: 'Không thể xóa thông tin giải ngân.' });
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<DisbursementPayee>[] = [
    {
      key: 'name',
      label: 'Họ và tên',
      priority: 1,
      render: (p) => (
        <span className="font-bold text-ink text-xs">{p.FullName}</span>
      ),
    },
    {
      key: 'cccd',
      label: 'Số CCCD',
      priority: 1,
      render: (p) => (
        <div>
          <div className="font-mono text-ink text-xs font-semibold">
            {formatNationalId(p.NationalId) || '—'}
          </div>
          {(p.IdCardIssueDate || p.IdCardIssuePlace) && (
            <div
              className="text-[10px] text-ink-faint flex flex-wrap items-center gap-1 mt-0.5"
              title={`Cấp ngày: ${p.IdCardIssueDate ? fmtDate(p.IdCardIssueDate) : '—'} | Nơi cấp: ${p.IdCardIssuePlace || '—'}`}
            >
              {p.IdCardIssueDate && <span>Cấp: {fmtDate(p.IdCardIssueDate)}</span>}
              {p.IdCardIssueDate && p.IdCardIssuePlace && <span>•</span>}
              {p.IdCardIssuePlace && <span className="truncate max-w-[150px]">{p.IdCardIssuePlace}</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stk',
      label: 'Số tài khoản (STK)',
      priority: 1,
      render: (p) => (
        <span className="font-mono text-accent text-xs font-bold tracking-tight">
          {p.AccountNumber || '—'}
        </span>
      ),
    },
    {
      key: 'bank',
      label: 'Ngân hàng',
      priority: 2,
      render: (p) => (
        <span className="text-xs font-semibold text-ink-muted">
          {p.BankName || '—'}
        </span>
      ),
    },
    {
      key: 'branch',
      label: 'Chi nhánh',
      priority: 2,
      render: (p) => (
        <span className="text-xs text-ink-muted">
          {p.BankBranch || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4 md:space-y-4.5 w-full pb-8">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel/70 p-4 sm:p-5 rounded-2xl border border-line/70 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-accent-soft text-accent">
              <Landmark className="w-5 h-5" />
            </span>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-ink uppercase">
              THÔNG TIN GIẢI NGÂN
            </h1>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Quản lý thông tin tài khoản và đối tác thụ hưởng giải ngân
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="bg-accent hover:opacity-90 text-accent-ink text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>THÊM THÔNG TIN MỚI</span>
        </button>
      </div>

      {/* 2. Main Content Card */}
      <div className="bg-panel rounded-2xl border border-line/70 shadow-xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-3 sm:p-4 border-b border-line/60 bg-surface/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder="Tìm theo Họ tên, CCCD, STK, Ngân hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-line/60 bg-surface/70 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="text-[11px] font-bold text-ink-faint self-end sm:self-center">
            Tổng cộng: <span className="text-accent font-mono font-bold">{filteredPayees.length}</span> người thụ hưởng
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-auto min-h-[350px]">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-ink-faint text-xs">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-accent mr-3"></div>
              <span>Đang tải thông tin giải ngân...</span>
            </div>
          ) : (
            <DataTable
              rows={filteredPayees}
              rowKey={(p) => p.Id}
              onRowClick={handleOpenEdit}
              emptyText="Chưa có thông tin giải ngân nào. Bấm nút Thêm mới ở trên để bắt đầu."
              cardTitle={(p) => p.FullName}
              cardSubtitle={(p) => `${p.AccountNumber} (${p.BankName})`}
              actions={(p) => (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(p);
                    }}
                    className="border border-line/80 bg-panel-muted/80 hover:bg-accent hover:text-accent-ink hover:border-accent text-ink px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.Id, p.FullName);
                    }}
                    disabled={deletingId === p.Id}
                    title="Xóa thông tin"
                    className="border border-line/80 bg-panel-muted/80 hover:border-neg/50 text-neg p-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center transition-all disabled:opacity-60 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              columns={columns}
            />
          )}
        </div>
      </div>

      {/* 3. Modal Thêm / Sửa Thông tin giải ngân */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-panel w-full max-w-lg rounded-2xl border border-line/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-line/60 flex items-center justify-between bg-surface/50">
              <div className="font-bold text-sm text-ink flex items-center gap-2">
                <Landmark className="w-4 h-4 text-accent" />
                <span>
                  {editingPayee.Id ? 'CẬP NHẬT THÔNG TIN GIẢI NGÂN' : 'THÊM THÔNG TIN GIẢI NGÂN MỚI'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-faint hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Họ tên */}
              <div>
                <label className={LABEL}>
                  Họ và tên người thụ hưởng <span className="text-neg">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="VD: NGUYỄN VĂN A"
                  value={editingPayee.FullName}
                  onChange={(e) => setEditingPayee({ ...editingPayee, FullName: e.target.value })}
                  className={`${INPUT} uppercase font-bold text-accent`}
                />
              </div>

              {/* CCCD, ngày cấp, nơi cấp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Số CCCD</label>
                  <input
                    type="text"
                    placeholder="12 chữ số"
                    value={formatNationalId(editingPayee.NationalId)}
                    onChange={(e) =>
                      setEditingPayee({
                        ...editingPayee,
                        NationalId: parseNationalIdInput(e.target.value),
                      })
                    }
                    className={`${INPUT} font-mono`}
                  />
                </div>

                <div>
                  <label className={LABEL}>Ngày cấp CCCD</label>
                  <DateInput
                    value={editingPayee.IdCardIssueDate || ''}
                    onChange={(v) => setEditingPayee({ ...editingPayee, IdCardIssueDate: v })}
                    className={INPUT}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={LABEL}>Nơi cấp CCCD</label>
                  <select
                    value={editingPayee.IdCardIssuePlace || ''}
                    onChange={(e) =>
                      setEditingPayee({ ...editingPayee, IdCardIssuePlace: e.target.value })
                    }
                    className={INPUT}
                  >
                    <option value="">-- Chọn nơi cấp --</option>
                    {CCCD_ISSUE_PLACES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STK, Ngân hàng, Chi nhánh */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line/50">
                <div>
                  <label className={LABEL}>Số tài khoản (STK)</label>
                  <input
                    type="text"
                    placeholder="VD: 19033481284"
                    value={editingPayee.AccountNumber}
                    onChange={(e) =>
                      setEditingPayee({ ...editingPayee, AccountNumber: e.target.value })
                    }
                    className={`${INPUT} font-mono font-bold text-accent`}
                  />
                </div>

                <div>
                  <label className={LABEL}>Ngân hàng</label>
                  <select
                    value={editingPayee.BankName}
                    onChange={(e) =>
                      setEditingPayee({ ...editingPayee, BankName: e.target.value })
                    }
                    className={INPUT}
                  >
                    <option value="">-- Chọn ngân hàng --</option>
                    {BANK_LIST.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className={LABEL}>Chi nhánh</label>
                  <input
                    type="text"
                    placeholder="VD: Chi nhánh TP.HCM"
                    value={editingPayee.BankBranch || ''}
                    onChange={(e) =>
                      setEditingPayee({ ...editingPayee, BankBranch: e.target.value })
                    }
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-line/60 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-line text-ink-muted hover:bg-surface transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-accent hover:opacity-90 text-accent-ink px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Đang lưu...' : editingPayee.Id ? 'CẬP NHẬT' : 'LƯU THÔNG TIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
