import { useState, type FormEvent } from 'react';
import type { TeamAssignment, TeamRole } from '../../types/team';
import type { AdminUser } from '../../lib/userAdmin';
import { displayName } from '../../lib/userAdmin';

const field = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink';
const button = 'rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer';

export function TeamManagementForms({ teamId, users, onCreate, onAssign }: {
  teamId: string;
  users: AdminUser[];
  onCreate: (name: string) => Promise<void>;
  onAssign: (input: TeamAssignment) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [teamRole, setTeamRole] = useState<TeamRole>('member');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submit = async (event: FormEvent, action: () => Promise<void>, success: string) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {notice && <p role="status" className="text-sm text-ink">{notice}</p>}
      <form className="space-y-3 rounded-lg border border-line bg-panel p-5" onSubmit={event => void submit(event, async () => {
        await onCreate(name); setName('');
      }, 'Đã tạo team.')}>
        <h2 className="font-semibold text-ink">Tạo team</h2>
        <label className="block text-sm text-ink">Tên team
          <input className={`${field} mt-1.5`} value={name} onChange={event => setName(event.target.value)} required maxLength={100} />
        </label>
        <button className={button} disabled={busy || !name.trim()}>Tạo team</button>
      </form>
      {teamId && <form className="space-y-3 rounded-lg border border-line bg-panel p-5" onSubmit={event => void submit(event, async () => {
        await onAssign({ teamId, userId, teamRole, reason }); setReason('');
      }, 'Đã cập nhật vai trò trong team.')}>
        <h2 className="font-semibold text-ink">Gán thành viên</h2>
        <label className="block text-sm text-ink">Tài khoản
          <select className={`${field} mt-1.5`} value={userId} onChange={event => setUserId(event.target.value)} required>
            <option value="">Chọn tài khoản</option>
            {users.filter(user => !user.disabled && user.role).map(user => <option key={user.id} value={user.id}>{displayName(user)}</option>)}
          </select>
        </label>
        <label className="block text-sm text-ink">Vai trò trong team
          <select className={`${field} mt-1.5`} value={teamRole} onChange={event => setTeamRole(event.target.value as TeamRole)}>
            <option value="member">Thành viên</option><option value="leader">Leader</option>
          </select>
        </label>
        <label className="block text-sm text-ink">Lý do thay đổi
          <input className={`${field} mt-1.5`} value={reason} onChange={event => setReason(event.target.value)} required maxLength={1000} />
        </label>
        <button className={button} disabled={busy || !userId || !reason.trim()}>Lưu vai trò trong team</button>
      </form>}
    </div>
  );
}
