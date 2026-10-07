import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserScope } from '../../context/UserScopeContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useCustomerTransfer } from '../../hooks/useCustomerTransfer';
import { useUserModules } from '../../hooks/useUserModules';
import {
  TRANSFER_COUNT_KEYS, TRANSFER_COUNT_LABELS, confirmQuestion, transferBlocker, transferTargets, transferWarning,
  type TransferCounts,
} from '../../lib/customerTransfer';
import { displayName } from '../../lib/userAdmin';
import { fmtDate } from '../../lib/utils';
import { headRow, panel, primaryBtn, td, th } from '../admin/tableStyles';

const SELECT =
  'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100';

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

/** Chuyển khách hàng từ tài khoản này sang tài khoản khác, kèm toàn bộ hồ sơ gắn khách. Chỉ hai vai trò quản trị; luật thật nằm ở hàm transfer_customers. */
export function CustomerTransferView() {
  const { user: me } = useAuth();
  const { managedUsers, refreshUsers } = useUserScope();
  const { users, loading: usersLoading, error: usersError } = useAdminUsers(true);
  const { byUser: modulesByUser } = useUserModules(true, me?.id ?? null);

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const t = useCustomerTransfer(fromId || null);

  const countOf = useMemo(() => new Map(managedUsers.map((u) => [u.userId, u.customerCount])), [managedUsers]);
  const nameOf = useMemo(() => new Map(users.map((u) => [u.id, displayName(u)])), [users]);
  const targets = useMemo(() => transferTargets(users, fromId || null), [users, fromId]);
  const target = users.find((u) => u.id === toId) ?? null;

  const blocker = transferBlocker({ fromId: fromId || null, toId: toId || null, selectedCount: t.selected.size });
  const warning = transferWarning(target, target ? modulesByUser[target.id] : undefined);
  const allChecked = t.customers.length > 0 && t.customers.every((c) => t.selected.has(c.id));
  const name = (id: string | null) => (id ? nameOf.get(id) ?? 'Tài khoản đã xóa' : 'Tài khoản đã xóa');

  const changeFrom = (id: string) => {
    setFromId(id);
    if (id === toId) setToId('');
    setNotice(null);
    setActionError(null);
  };

  const submit = async () => {
    if (blocker || !t.counts) return;
    if (!window.confirm(confirmQuestion(t.counts, name(fromId), name(toId)))) return;
    setNotice(null);
    setActionError(null);
    try {
      const done = await t.run(toId);
      await refreshUsers();
      setNotice(`Đã chuyển ${done.customers} khách hàng từ ${name(fromId)} sang ${name(toId)}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không chuyển giao được.');
    }
  };

  const shownError = actionError ?? usersError ?? t.error;
  const counts: TransferCounts | null = t.counts;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Chuyển giao khách hàng</h1>

      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Chuyển từ</span>
          <select value={fromId} onChange={(e) => changeFrom(e.target.value)} className={SELECT} disabled={usersLoading}>
            <option value="">— Chọn người chuyển —</option>
            {users.filter((u) => u.role !== null).map((u) => (
              <option key={u.id} value={u.id}>{displayName(u)} ({countOf.get(u.id) ?? 0} khách)</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>Chuyển sang</span>
          <select value={toId} onChange={(e) => { setToId(e.target.value); setNotice(null); }} className={SELECT} disabled={usersLoading}>
            <option value="">— Chọn người nhận —</option>
            {targets.map((u) => (
              <option key={u.id} value={u.id}>{displayName(u)} ({countOf.get(u.id) ?? 0} khách)</option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {shownError && (
        <div role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{shownError}</span>
        </div>
      )}
      {warning && (
        <div role="note" className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{warning}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div className={panel}>
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0">
                <tr className={headRow}>
                  <th className={`${th} w-px`}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      disabled={t.customers.length === 0 || t.running}
                      onChange={t.toggleEvery}
                      aria-label="Chọn tất cả khách hàng"
                      className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className={th}>Mã CIF</th>
                  <th className={`${th} border-r-0`}>Họ tên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {t.customers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-10 text-center text-slate-500 dark:text-slate-400">
                      {t.loadingCustomers ? (
                        <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Đang tải...</span>
                      ) : fromId ? 'Tài khoản này không có khách hàng nào.' : 'Chọn người chuyển để xem khách hàng.'}
                    </td>
                  </tr>
                ) : (
                  t.customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className={`${td} text-center`}>
                        <input
                          type="checkbox"
                          checked={t.selected.has(c.id)}
                          disabled={t.running}
                          onChange={() => t.toggle(c.id)}
                          aria-label={`Chọn ${c.name || c.cif}`}
                          className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className={`${td} font-mono`}>{c.cif || '—'}</td>
                      <td className={`${td} border-r-0`}>{c.name || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-300">
            Đã chọn {t.selected.size} / {t.customers.length} khách
          </div>
        </div>

        <div className="space-y-3">
          <div className={panel}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={headRow}>
                  <th className={th}>Sẽ chuyển</th>
                  <th className={`${th} text-right border-r-0`}>Số lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {TRANSFER_COUNT_KEYS.map((key) => (
                  <tr key={key}>
                    <td className={td}>{TRANSFER_COUNT_LABELS[key]}</td>
                    <td className={`${td} text-right font-mono border-r-0`}>{counts ? counts[key] : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={Boolean(blocker) || !counts || t.running}
            title={blocker ?? undefined}
            className={`${primaryBtn} w-full flex items-center justify-center gap-2`}
          >
            {t.running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            <span>Chuyển giao</span>
          </button>
        </div>
      </div>

      <div className={panel}>
        <div className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-slate-100">Nhật ký chuyển giao</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={th}>Thời gian</th>
                <th className={th}>Từ</th>
                <th className={th}>Sang</th>
                <th className={`${th} text-right`}>Khách hàng</th>
                <th className={`${th} text-right`}>Khoản vay</th>
                <th className={`${th} border-r-0`}>Người thực hiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {t.history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {t.historyLoading ? 'Đang tải...' : 'Chưa có lần chuyển giao nào.'}
                  </td>
                </tr>
              ) : (
                t.history.map((h) => (
                  <tr key={h.id}>
                    <td className={`${td} whitespace-nowrap`}>{fmtDate(h.transferredAt)} {timeOf(h.transferredAt)}</td>
                    <td className={td}>{name(h.fromUserId)}</td>
                    <td className={td}>{name(h.toUserId)}</td>
                    <td className={`${td} text-right font-mono`}>{h.customerCount}</td>
                    <td className={`${td} text-right font-mono`}>{h.counts.loans}</td>
                    <td className={`${td} border-r-0`}>{name(h.transferredBy)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
