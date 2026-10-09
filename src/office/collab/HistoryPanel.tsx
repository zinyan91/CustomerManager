import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useOfficeI18n } from '../i18n';
import { VersionPreview } from './VersionPreview';
import { listInvitableUsers, listVersions, type SharedVersion } from './collabApi';

export interface HistoryPanelProps {
  docId: string;
  /** Có quyền lưu mốc và khôi phục (chủ và người được sửa). */
  canWrite: boolean;
  me: { id: string; name: string };
  /** Hiện nút Xem (xem trước chỉ-đọc). Mặc định có; văn bản chưa có xem trước nên tắt. */
  preview?: boolean;
  onSave: (label: string) => Promise<void>;
  onRestore: (versionId: number) => Promise<void>;
  onClose: () => void;
}

/** Ngăn Lịch sử: các mốc đã lưu của bảng tính chung, lưu mốc mới, khôi phục một mốc (có xác nhận, không xóa gì). */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({ docId, canWrite, me, preview = true, onSave, onRestore, onClose }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.history;
  const [versions, setVersions] = useState<SharedVersion[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [viewing, setViewing] = useState<SharedVersion | null>(null);

  const reload = useCallback(async () => {
    setVersions(await listVersions(docId));
  }, [docId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([reload(), listInvitableUsers()])
      .then(([, users]) => !cancelled && setNames(new Map(users.map((user) => [user.id, user.fullName]))))
      .catch((caught) => !cancelled && setProblem(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await action();
    } catch (caught) {
      setProblem(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (id: string) => (id === me.id ? me.name || t.you : names.get(id) || t.someone);
  const when = (iso: string) => (Date.parse(iso) ? new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') : '');

  return (
    <aside className="activity-panel" aria-label={t.title}>
      <div className="activity-head">
        <strong>{t.title}</strong>
        <button type="button" className="office-icon-btn" onClick={onClose} aria-label={t.close}>
          <X size={16} />
        </button>
      </div>
      {canWrite && (
        <div className="history-save">
          <input type="text" value={label} maxLength={120} placeholder={t.labelPlaceholder} aria-label={t.labelPlaceholder} onChange={(event) => setLabel(event.target.value)} />
          <button
            type="button"
            className="wr-text-btn is-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await onSave(label.trim());
                setLabel('');
                await reload();
              })
            }
          >
            {t.save}
          </button>
        </div>
      )}
      {problem && (
        <p className="calc-dialog-problem" role="alert">
          {problem}
        </p>
      )}
      {versions !== null && versions.length === 0 && !problem && <p className="share-note">{t.empty}</p>}
      <ul className="activity-list">
        {(versions ?? []).map((version) => (
          <li key={version.id}>
            <div className="activity-who">
              <span>{version.label || t.unnamed}</span>
              <small>{when(version.createdAt)}</small>
            </div>
            <div className="activity-line">{nameOf(version.createdBy)}</div>
            {preview && (
              <button type="button" className="wr-text-btn history-restore" aria-label={`${t.view}: ${version.label || t.unnamed}`} onClick={() => setViewing(version)}>
                {t.view}
              </button>
            )}
            {canWrite && (
              <button
                type="button"
                className="wr-text-btn history-restore"
                disabled={busy}
                aria-label={`${t.restore}: ${version.label || t.unnamed}`}
                onClick={() => {
                  if (!window.confirm(t.confirmRestore(version.label || t.unnamed))) return;
                  void run(() => onRestore(version.id));
                }}
              >
                {t.restore}
              </button>
            )}
          </li>
        ))}
      </ul>
      {viewing && <VersionPreview docId={docId} versionId={viewing.id} name={viewing.label || t.unnamed} onClose={() => setViewing(null)} />}
    </aside>
  );
};
