import React from 'react';
import { Archive as ArchiveIcon, History, Share2 } from 'lucide-react';
import { useOfficeI18n } from '../i18n';
import { ActivityPanel } from './ActivityPanel';
import { HistoryPanel } from './HistoryPanel';
import { ShareDialog } from './ShareDialog';
import { canEdit, type SharedKind, type SharedRole } from './collabApi';

export type SharedPanel = 'activity' | 'history' | null;

export interface SharedDocActionsProps {
  /** Đã là tài liệu chung (có Nhật ký, Lịch sử). */
  shared: boolean;
  /** Có hiện nút Chia sẻ: nháp riêng luôn hiện, tài liệu chung chỉ cho chủ và Master Admin. */
  showShare: boolean;
  sharing: boolean;
  panel: SharedPanel;
  onPanel: (next: SharedPanel) => void;
  onShare: () => void;
}

/** Các nút Nhật ký, Lịch sử, Chia sẻ trên thanh tiêu đề của một tài liệu có thể chia sẻ. */
export const SharedDocActions: React.FC<SharedDocActionsProps> = ({ shared, showShare, sharing, panel, onPanel, onShare }) => {
  const { m } = useOfficeI18n();
  const toggle = (name: Exclude<SharedPanel, null>) => onPanel(panel === name ? null : name);
  return (
    <>
      {shared && (
        <>
          <button type="button" className="office-header-link" onClick={() => toggle('activity')} aria-pressed={panel === 'activity'}>
            <History size={14} />
            <span>{m.ribbon.activity.open}</span>
          </button>
          <button type="button" className="office-header-link" onClick={() => toggle('history')} aria-pressed={panel === 'history'}>
            <ArchiveIcon size={14} />
            <span>{m.ribbon.history.open}</span>
          </button>
        </>
      )}
      {showShare && (
        <button type="button" className="office-header-link" onClick={onShare} disabled={sharing}>
          <Share2 size={14} />
          <span>{m.ribbon.share.button}</span>
        </button>
      )}
    </>
  );
};

export interface SharedDocPanelsProps {
  docId: string;
  kind: SharedKind;
  role: SharedRole;
  me: { id: string; name: string };
  seq: number;
  panel: SharedPanel;
  onClosePanel: () => void;
  shareOpen: boolean;
  shareTitle: string;
  onCloseShare: () => void;
  onSaveMilestone: (label: string) => Promise<void>;
  onRestore: (versionId: number) => Promise<void>;
  /** Hộp xem trước mốc của loại tài liệu này; không truyền thì Lịch sử không có nút Xem. */
  renderPreview?: (preview: { versionId: number; name: string; onClose: () => void }) => React.ReactNode;
}

/** Ngăn Nhật ký, ngăn Lịch sử và hộp Chia sẻ của một tài liệu chung. */
export const SharedDocPanels: React.FC<SharedDocPanelsProps> = ({ docId, kind, role, me, seq, panel, onClosePanel, shareOpen, shareTitle, onCloseShare, onSaveMilestone, onRestore, renderPreview }) => (
  <>
    {panel === 'activity' && <ActivityPanel docId={docId} seq={seq} me={me} kind={kind} onClose={onClosePanel} />}
    {panel === 'history' && (
      <HistoryPanel docId={docId} canWrite={canEdit(role)} me={me} renderPreview={renderPreview} onSave={onSaveMilestone} onRestore={onRestore} onClose={onClosePanel} />
    )}
    {shareOpen && <ShareDialog docId={docId} title={shareTitle} onClose={onCloseShare} />}
  </>
);
