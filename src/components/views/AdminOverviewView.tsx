import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminOverview } from '../../hooks/useAdminOverview';
import { MODULE_DB_ENFORCED, MODULE_IDS, MODULE_LABELS } from '../../lib/modules';
import { headRow, panel, secondaryBtn, td, th } from '../admin/tableStyles';

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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tổng quan</h1>
        <button type="button" onClick={reload} disabled={loading} className={`${secondaryBtn} flex items-center gap-2`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Làm mới</span>
        </button>
      </div>

      {errors.map((message) => (
        <div key={message} role="alert" className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      ))}

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className={panel}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={th}>Tài khoản</th>
                <th className={`${th} text-right border-r-0`}>Số lượng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {accountRows.map(([label, value]) => (
                <tr key={label}>
                  <td className={td}>{label}</td>
                  <td className={`${td} text-right font-mono border-r-0`}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={panel}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={th}>Module</th>
                <th className={`${th} text-right`}>Tài khoản được dùng</th>
                <th className={`${th} text-center border-r-0`}>Chặn ở CSDL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {MODULE_IDS.map((id) => (
                <tr key={id}>
                  <td className={td}>{MODULE_LABELS[id]}</td>
                  <td className={`${td} text-right font-mono`}>{perModule[id]}</td>
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
