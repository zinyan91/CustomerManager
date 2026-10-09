import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOfficeI18n } from '../i18n';
import { listInvitableUsers, listMembers, setMember, type InvitableUser, type MemberRole, type SharedMember } from './collabApi';

export interface ShareDialogProps {
  docId: string;
  /** Tiêu đề hộp thoại; mặc định là của bảng tính. */
  title?: string;
  onClose: () => void;
}

/** Mời từng tài khoản vào bảng tính chung, đổi quyền sửa/xem, gỡ. Chỉ chủ và Master Admin mở được (máy chủ cũng kiểm lại). */
export const ShareDialog: React.FC<ShareDialogProps> = ({ docId, title, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.share;
  const [members, setMembers] = useState<SharedMember[] | null>(null);
  const [users, setUsers] = useState<InvitableUser[]>([]);
  const [pick, setPick] = useState('');
  const [role, setRole] = useState<MemberRole>('editor');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [list, invitable] = await Promise.all([listMembers(docId), listInvitableUsers()]);
    setMembers(list);
    setUsers(invitable);
  }, [docId]);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setProblem(null);
      try {
        await action();
        await reload();
      } catch (caught) {
        setProblem(caught instanceof Error ? caught.message : String(caught));
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  useEffect(() => {
    void run(async () => undefined);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [run, onClose]);

  const nameOf = (fullName: string) => fullName || t.unnamed;
  const available = useMemo(() => users.filter((user) => !(members ?? []).some((member) => member.userId === user.id)), [users, members]);
  const roleLabel = (value: MemberRole) => (value === 'editor' ? t.editor : t.viewer);

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="calc-dialog share-dialog" role="dialog" aria-label={title ?? t.title}>
        <div className="calc-dialog-title">{title ?? t.title}</div>
        <div className="calc-dialog-body">
          <h3 className="share-heading">{t.members}</h3>
          {members !== null && members.length === 0 && <p className="share-note">{t.none}</p>}
          <ul className="share-members">
            {(members ?? []).map((member) => (
              <li key={member.userId}>
                <span className="share-name">{nameOf(member.fullName)}</span>
                <select
                  aria-label={`${nameOf(member.fullName)}: ${roleLabel(member.role)}`}
                  value={member.role}
                  disabled={busy}
                  onChange={(event) => void run(() => setMember(docId, member.userId, event.target.value as MemberRole))}
                >
                  <option value="editor">{t.editor}</option>
                  <option value="viewer">{t.viewer}</option>
                </select>
                <button type="button" className="wr-text-btn" disabled={busy} onClick={() => void run(() => setMember(docId, member.userId, null))}>
                  {t.remove}
                </button>
              </li>
            ))}
          </ul>

          {members !== null && (
            <div className="share-invite">
              {available.length === 0 ? (
                <p className="share-note">{t.noOneToInvite}</p>
              ) : (
                <>
                  <select aria-label={t.pickUser} value={pick} disabled={busy} onChange={(event) => setPick(event.target.value)}>
                    <option value="">{t.pickUser}</option>
                    {available.map((user) => (
                      <option key={user.id} value={user.id}>
                        {nameOf(user.fullName)}
                      </option>
                    ))}
                  </select>
                  <select aria-label={t.editor} value={role} disabled={busy} onChange={(event) => setRole(event.target.value as MemberRole)}>
                    <option value="editor">{t.editor}</option>
                    <option value="viewer">{t.viewer}</option>
                  </select>
                  <button
                    type="button"
                    className="wr-text-btn is-primary"
                    disabled={busy || !pick}
                    onClick={() =>
                      void run(async () => {
                        await setMember(docId, pick, role);
                        setPick('');
                      })
                    }
                  >
                    {t.invite}
                  </button>
                </>
              )}
            </div>
          )}
          {problem && (
            <p className="calc-dialog-problem" role="alert">
              {problem}
            </p>
          )}
        </div>
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn is-primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
