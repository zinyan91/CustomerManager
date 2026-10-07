import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useUserScope } from '../../context/UserScopeContext';
import { createStorageRepo, removeStorageRepo, updateStorageRepo } from '../../lib/api/storageReposApi';
import { STORAGE_KIND_LABELS, type StorageRepo, type StorageRepoKind } from '../../types/storageRepo';

interface StorageReposSectionProps {
  repos: StorageRepo[];
  onChanged: () => void | Promise<void>;
}

const FIELD =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-slate-500';

export function StorageReposSection({ repos, onChanged }: StorageReposSectionProps) {
  const { managedUsers } = useUserScope();
  const users = useMemo(() => managedUsers.filter((u) => u.role !== 'unassigned'), [managedUsers]);
  const userName = (id: string | null) => users.find((u) => u.userId === id)?.fullName ?? '';

  const hasShared = repos.some((r) => r.kind === 'shared');
  const hasDispatch = repos.some((r) => r.kind === 'dispatch');
  const hasForm = repos.some((r) => r.kind === 'form');
  const assignedIds = new Set(repos.filter((r) => r.kind === 'personal').map((r) => r.assignedUserId));
  const freeUsers = users.filter((u) => !assignedIds.has(u.userId));

  const firstKind: StorageRepoKind = !hasShared ? 'shared' : !hasDispatch ? 'dispatch' : !hasForm ? 'form' : 'personal';
  const [kind, setKind] = useState<StorageRepoKind>(firstKind);
  const [userId, setUserId] = useState('');
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [repoInput, setRepoInput] = useState<string | null>(null);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<StorageRepo | null>(null);
  const [editName, setEditName] = useState('');
  const [editRepoId, setEditRepoId] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const picked = users.find((u) => u.userId === userId);
  // Tạo thư mục mới thì chưa có ID để nhập; chỉ đăng ký thư mục có sẵn mới cần ID
  const suggestion = useMemo(() => {
    if (kind === 'shared') return 'Kho chung';
    if (kind === 'dispatch') return 'Văn thư';
    if (kind === 'form') return 'Biểu mẫu';
    return picked?.fullName ? `Kho của ${picked.fullName}` : '';
  }, [kind, picked]);

  const name = nameInput ?? suggestion;
  const repoId = repoInput ?? '';

  const resetForm = () => {
    setNameInput(null);
    setRepoInput(null);
    setUserId('');
    setExisting(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const created = await createStorageRepo({
        name,
        repoId: existing ? repoId.trim() : '',
        kind,
        assignedUserId: kind === 'personal' ? userId : null,
        createRemote: !existing,
      });
      setOkMsg(`Đã ${existing ? 'đăng ký' : 'tạo'} kho ${created.repoId}.`);
      resetForm();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được repo.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (repo: StorageRepo) => {
    setEditing(repo);
    setEditName(repo.name);
    setEditRepoId(repo.repoId);
    setEditError(null);
    setOkMsg(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const idChanged = editRepoId.trim() !== editing.repoId;
    if (idChanged && !window.confirm(`Đổi Repository ID từ ${editing.repoId} sang ${editRepoId.trim()}? Các văn bản đang trỏ tới repo cũ sẽ được cập nhật theo. Thư mục trên Google Drive không bị đổi tên.`)) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const result = await updateStorageRepo(editing, { name: editName, repoId: editRepoId.trim() });
      setOkMsg(`Đã lưu "${editName.trim()}".${result.documents > 0 ? ` Đã cập nhật đường dẫn kho trong ${result.documents} văn bản.` : ''}`);
      setEditing(null);
      await onChanged();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Không sửa được repo.');
    } finally {
      setEditBusy(false);
    }
  };

  const handleRemove = async (repo: StorageRepo) => {
    if (!window.confirm(`Gỡ "${repo.name}" khỏi danh sách? Thư mục trên Google Drive vẫn được giữ nguyên.`)) return;
    setError(null);
    setOkMsg(null);
    try {
      await removeStorageRepo(repo.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gỡ được repo.');
    }
  };

  const kindOptions: Array<{ value: StorageRepoKind; disabled: boolean }> = [
    { value: 'shared', disabled: hasShared },
    { value: 'dispatch', disabled: hasDispatch },
    { value: 'form', disabled: hasForm },
    { value: 'personal', disabled: freeUsers.length === 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <th className="py-2 px-3">Tên</th>
              <th className="py-2 px-3">Loại</th>
              <th className="py-2 px-3">Repository ID</th>
              <th className="py-2 px-3">Gán cho</th>
              <th className="py-2 px-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {repos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 px-3 text-center text-slate-500">
                  Chưa có repo nào.
                </td>
              </tr>
            )}
            {repos.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{r.name}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{STORAGE_KIND_LABELS[r.kind]}</td>
                <td className="py-2 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">{r.repoId}</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{userName(r.assignedUserId) || '—'}</td>
                <td className="py-2 px-3 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => startEdit(r)}
                    aria-label={`Sửa ${r.name}`}
                    title="Sửa repo"
                    className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(r)}
                    aria-label={`Gỡ ${r.name}`}
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form onSubmit={handleUpdate} aria-label="Sửa repo" className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sửa repo: {STORAGE_KIND_LABELS[editing.kind]}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-repo-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tên hiển thị</label>
              <input id="edit-repo-name" value={editName} onChange={(e) => setEditName(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor="edit-repo-id" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ID thư mục Google Drive</label>
              <input id="edit-repo-id" value={editRepoId} onChange={(e) => setEditRepoId(e.target.value)} className={`${FIELD} font-mono`} placeholder="1AbC..." />
            </div>
          </div>
          {editError && (
            <div role="alert" className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{editError}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={editBusy || !editName.trim() || !editRepoId.trim()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 flex items-center gap-2"
            >
              {editBusy && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu thay đổi</span>
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={editBusy}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleCreate} className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Thêm repo</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="repo-kind" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Loại</label>
            <select
              id="repo-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as StorageRepoKind);
                setNameInput(null);
                setRepoInput(null);
              }}
              className={FIELD}
            >
              {kindOptions.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {STORAGE_KIND_LABELS[o.value]}
                  {o.disabled ? ' (đã có)' : ''}
                </option>
              ))}
            </select>
          </div>

          {kind === 'personal' && (
            <div>
              <label htmlFor="repo-user" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gán cho tài khoản</label>
              <select
                id="repo-user"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setNameInput(null);
                  setRepoInput(null);
                }}
                className={FIELD}
              >
                <option value="">Chọn tài khoản</option>
                {freeUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>{u.fullName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="repo-name" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tên hiển thị</label>
            <input id="repo-name" value={name} onChange={(e) => setNameInput(e.target.value)} className={FIELD} />
          </div>

          {existing && (
            <div>
              <label htmlFor="repo-id" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ID thư mục Google Drive</label>
              <input id="repo-id" value={repoId} onChange={(e) => setRepoInput(e.target.value)} className={`${FIELD} font-mono`} placeholder="1AbC..." />
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={existing} onChange={(e) => setExisting(e.target.checked)} />
          <span>Thư mục đã có sẵn trong Shared Drive (chỉ đăng ký, không tạo mới)</span>
        </label>

        {error && (
          <div role="alert" className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {okMsg && (
          <div role="status" className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{okMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !name.trim() || (existing && !repoId.trim()) || (kind === 'personal' && !userId)}
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{busy ? 'Đang xử lý...' : existing ? 'Đăng ký thư mục' : 'Tạo thư mục trong Shared Drive'}</span>
        </button>
      </form>
    </div>
  );
}
