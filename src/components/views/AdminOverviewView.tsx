import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminOverview } from '../../hooks/useAdminOverview';
import { MODULE_DB_ENFORCED, MODULE_IDS, MODULE_LABELS } from '../../lib/modules';
import { headRow, panel, secondaryBtn, td, th } from '../admin/tableStyles';
import { AdminPageHeader } from '../admin/AdminPageHeader';

export function AdminOverviewView() {
  const { user } = useAuth();
  const { overview, perModule, loading, errors, reload } = useAdminOverview(user?.id ?? null);

  const accountRows: [string, number][] = [
    ['Tổng số tài khoản', overview.totalAccounts],
    ['Master Admin', overview.masterAdmins],
    ['User Admin', overview.userAdmins],
    ['User', overview.users],
    ['Chưa phân quyền', overview.unassigned],
    ['Đang bị khóa', overview.locked],
    ['User bị giới hạn module', overview.restricted],
    ['Khách hàng trên hệ thống', overview.customers],
  ];

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Tổng quan quản trị">
        <button type="button" onClick={reload} disabled={loading} className={`${secondaryBtn} flex items-center gap-2`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Làm mới</span>
        </button>
      </AdminPageHeader>

      {errors.map((message) => (
        <div key={message} role="alert" className="flex items-start gap-2 text-sm text-neg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ))}

      <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
        {([
          ['Tài khoản', overview.totalAccounts],
          ['Khách hàng', overview.customers],
          ['Đang bị khóa', overview.locked],
          ['Chưa phân quyền', overview.unassigned],
        ] as const).map(([label, value]) => <div key={label} className="border-r border-line px-4 py-5 last:border-r-0">
          <dt className="text-sm text-ink-muted">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-ink">{loading || errors.length ? '—' : value.toLocaleString('vi-VN')}</dd>
        </div>)}
      </dl>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
        <div className={panel}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={th}>Tài khoản</th>
                <th className={`${th} text-right border-r-0`}>Số lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {accountRows.map(([label, value]) => (
                <tr key={label}>
                  <td className={td}>{label}</td>
                  <td className={`${td} text-right tabular-nums border-r-0`}>{loading || errors.length ? '—' : value.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={th}>Module</th>
                <th className={`${th} text-right`}>Tài khoản được dùng</th>
                <th className={`${th} text-center border-r-0`}>Chặn ở CSDL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODULE_IDS.map((id) => (
                <tr key={id}>
                  <td className={td}>{MODULE_LABELS[id]}</td>
                  <td className={`${td} text-right tabular-nums`}>{loading || errors.length ? '—' : perModule[id]}</td>
                  <td className={`${td} text-center border-r-0`}>{MODULE_DB_ENFORCED[id] ? 'Có' : 'Không'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
