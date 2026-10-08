import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useArchive } from '../../../hooks/useArchive';
import { joinArchivePath } from '../../../lib/archivePath';
import { archiveStatusMessage } from '../../../lib/archiveStatus';
import { browseFolder } from '../../../lib/dispatch/folderBrowse';
import { folderIdMap, validateEntryName } from '../../../lib/drive/driveOps';
import { formatBytes } from '../../../lib/formatBytes';
import { canUploadToRepo, repoLabel } from '../../../lib/storageRepos';
import type { DispatchDocument } from '../../../types/dispatch';
import { useOfficeI18n } from '../../i18n';
import { hasExtension, type ArchiveSaveTarget } from './officeArchive';

export interface ArchiveDialogProps {
  mode: 'open' | 'save';
  /** Đuôi tệp được chọn khi mở (chữ thường, có dấu chấm). */
  extensions: readonly string[];
  /** Tên tệp gợi ý khi lưu. */
  defaultName?: string;
  onClose: () => void;
  onOpen?: (doc: DispatchDocument) => Promise<void>;
  onSave?: (target: ArchiveSaveTarget) => Promise<void>;
}

/** Duyệt Kho lưu trữ để chọn tệp cần mở hoặc chọn thư mục và tên tệp cần lưu. Việc mở hay lưu do nơi gọi làm; lỗi hiện lại trong hộp. */
export const ArchiveDialog: React.FC<ArchiveDialogProps> = ({ mode, extensions, defaultName = '', onClose, onOpen, onSave }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.archive;
  const { role, user } = useAuth();
  const userId = user?.id ?? null;
  const archive = useArchive('storage');
  const { repos, selectedRepo, selectRepo, documents, folders, driveEntries, driveRoot, driveWrite, status } = archive;
  const [current, setCurrent] = useState('');
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => setCurrent(''), [driveRoot]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const listing = useMemo(() => browseFolder(documents, folders, current), [documents, folders, current]);
  const files = useMemo(() => (mode === 'open' ? listing.files.filter((f) => hasExtension(f.fileName, extensions)) : []), [mode, listing.files, extensions]);
  const crumbs = current.split('/').filter(Boolean);
  const writable = driveWrite && canUploadToRepo(role, userId, selectedRepo);
  const statusMessage = status.kind === 'no_repo' ? t.noRepo : archiveStatusMessage(status, false);
  const ready = status.kind === 'ready';

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

  const save = () => {
    const invalid = validateEntryName(name);
    if (invalid) {
      setProblem(invalid);
      return;
    }
    if (!driveRoot || !onSave) return;
    void run(() =>
      onSave({
        rootId: driveRoot,
        folder: current,
        name: name.trim(),
        existingPaths: driveEntries.map((entry) => entry.path),
        folderIds: folderIdMap(driveEntries),
      }),
    );
  };

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="calc-dialog archive-dialog" role="dialog" aria-label={mode === 'open' ? t.openTitle : t.saveTitle}>
        <div className="calc-dialog-title">{mode === 'open' ? t.openTitle : t.saveTitle}</div>

        {repos.length > 1 && (
          <div className="archive-repos" role="tablist" aria-label={t.repo}>
            {repos.map((repo) => (
              <button key={repo.id} type="button" role="tab" aria-selected={repo.id === selectedRepo?.id} className={repo.id === selectedRepo?.id ? 'is-active' : ''} onClick={() => selectRepo(repo.id)}>
                {repoLabel(repo, userId)}
              </button>
            ))}
          </div>
        )}

        <div className="archive-crumbs">
          <button type="button" onClick={() => setCurrent('')}>
            {t.root}
          </button>
          {crumbs.map((part, index) => (
            <span key={`${part}-${index}`}>
              <ChevronRight size={13} aria-hidden="true" />
              <button type="button" onClick={() => setCurrent(joinArchivePath(...crumbs.slice(0, index + 1)))}>
                {part}
              </button>
            </span>
          ))}
        </div>

        <div className="archive-list">
          {status.kind === 'loading' && (
            <p className="archive-note">
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {t.loading}
            </p>
          )}
          {statusMessage && (
            <p className="archive-note is-problem" role="alert">
              {statusMessage}
            </p>
          )}
          {mode === 'save' && ready && !writable && (
            <p className="archive-note is-problem" role="alert">
              {t.readOnly}
            </p>
          )}
          {ready && listing.folders.length === 0 && files.length === 0 && <p className="archive-note">{mode === 'open' && listing.files.length > 0 ? t.noFiles : t.emptyFolder}</p>}
          <ul>
            {listing.folders.map((folder) => (
              <li key={folder.path}>
                <button type="button" onClick={() => setCurrent(folder.path)}>
                  <Folder size={16} aria-hidden="true" />
                  <span className="archive-name">{folder.name}</span>
                </button>
              </li>
            ))}
            {files.map((file) => (
              <li key={file.filePath}>
                <button type="button" disabled={busy} onClick={() => onOpen && void run(() => onOpen(file))}>
                  <FileText size={16} aria-hidden="true" />
                  <span className="archive-name">{file.fileName}</span>
                  <small>{formatBytes(file.fileSize)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {mode === 'save' && (
          <label className="calc-dialog-field archive-name-field">
            <span>{t.fileName}</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && writable && !busy && save()} />
          </label>
        )}
        {problem && (
          <p className="calc-dialog-problem archive-problem" role="alert">
            {problem}
          </p>
        )}
        <div className="calc-dialog-actions">
          <button type="button" className="wr-text-btn" disabled={busy} onClick={onClose}>
            {t.cancel}
          </button>
          {mode === 'save' && (
            <button type="button" className="wr-text-btn is-primary" disabled={busy || !ready || !writable} onClick={save}>
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
              {t.save}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
