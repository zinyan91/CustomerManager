import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useUserModules } from '../../hooks/useUserModules';
import { canEditModules, effectiveModules } from '../../lib/adminOverview';
import {
  MODULE_DB_ENFORCED, MODULE_IDS, MODULE_LABELS, MODULE_PRESETS,
  moduleFeatures, normalizeModules, sameModules, toggleModule, type ModuleId,
} from '../../lib/modules';
import { roleLabel } from '../../lib/permissions';
import { displayName } from '../../lib/userAdmin';
import { headRow, panel, primaryBtn, secondaryBtn, td, th } from '../admin/tableStyles';
import { AdminPageHeader } from '../admin/AdminPageHeader';

/** Chọn module cho một tài khoản. Lưu xong có hiệu lực ngay ở CSDL (RLS), không cần người đó đăng nhập lại. */
export function UserModulesView() {
  const { userId } = useParams();
  const { user: me, role } = useAuth();
  const { t } = useLang();
  const { users, loading: usersLoading, error: usersError } = useAdminUsers(true);
  const { byUser, loading: modulesLoading, error: modulesError, save } = useUserModules(true, me?.id ?? null);

  const [draft, setDraft] = useState<ModuleId[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const features = useMemo(() => moduleFeatures(t), [t]);
  const target = users.find((u) => u.id === userId) ?? null;
  const stored = target ? effectiveModules(target, byUser[target.id]) : [];
  const current = draft ?? stored;
  const dirty = draft !== null && !sameModules(draft, stored);
  const editable = target ? canEditModules(role, target.role) : false;
  const loadError = usersError ?? modulesError;

  const edit = (next: ModuleId[]) => {
    setNotice(null);
    setSaveError(null);
    setDraft(next);
  };

  const submit = async () => {
    if (!target || !draft) return;
    setSaving(true);
    setSaveError(null);
    try {
      await save(target.id, draft);
      setDraft(null);
      setNotice(`Đã lưu module của ${displayName(target)}.`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Không lưu được module.');
    } finally {
      setSaving(false);
    }
  };

  const back = (
    <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline">
      <ArrowLeft className="w-4 h-4" />
      <span>Người dùng</span>
    </Link>
  );

  if (loadError) {
    return (
      <div className="space-y-3">
        {back}
        <div role="alert" className="flex items-start gap-2 text-sm text-neg">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      </div>
    );
  }

  if (usersLoading || modulesLoading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Đang tải">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="space-y-3">
        {back}
        <p role="alert" className="text-sm text-ink">Không tìm thấy tài khoản này.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {back}
      <AdminPageHeader title={displayName(target)}>
          {editable && (
            <div className="flex flex-wrap items-center gap-2">
              {MODULE_PRESETS.map((p) => (
                <button key={p.id} type="button" disabled={saving} onClick={() => edit(normalizeModules(p.modules))} className={secondaryBtn}>
                  {p.label}
                </button>
              ))}
              <button type="button" disabled={!dirty || saving} onClick={() => void submit()} className={`${primaryBtn} flex items-center gap-2`}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          )}
      </AdminPageHeader>
      <div className="text-sm text-ink-muted">
        {target.email ?? 'Không có email'} · {roleLabel(target.role)}
      </div>
      <div className={panel}>

        {notice && (
          <div role="status" className="px-4 py-2.5 flex items-center gap-2 text-sm text-pos">
            <Check className="w-4 h-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
        {saveError && (
          <div role="alert" className="px-4 py-2.5 flex items-start gap-2 text-sm text-neg">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}
        {!editable && (
          <div className="px-4 py-2.5 text-sm text-ink">{roleLabel(target.role)} luôn dùng được mọi module.</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className={headRow}>
                <th className={`${th} w-px`}>Dùng</th>
                <th className={th}>Module</th>
                <th className={th}>Gồm</th>
                <th className={`${th} text-center border-r-0`}>Chặn ở CSDL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {MODULE_IDS.map((id) => (
                <tr key={id} className="hover:bg-surface">
                  <td className={`${td} text-center`}>
                    <input
                      type="checkbox"
                      checked={current.includes(id)}
                      disabled={!editable || saving}
                      onChange={() => edit(toggleModule(current, id))}
                      aria-label={MODULE_LABELS[id]}
                      className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className={`${td} font-semibold text-ink`}>{MODULE_LABELS[id]}</td>
                  <td className={`${td} text-ink-muted`}>{features[id].join(', ')}</td>
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
