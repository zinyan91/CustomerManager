import React, { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { getVersionContent } from '../../collab/collabApi';
import { useOfficeI18n } from '../../i18n';
import { WriterEditor } from '../editor/WriterEditor';
import type { PaginationResult } from '../utils/pagination';
import { parseSharedContent, type SharedContent } from '../utils/sharedContent';

export interface WriterVersionPreviewProps {
  docId: string;
  versionId: number;
  name: string;
  onClose: () => void;
}

const PREVIEW_ZOOM = 70;

/** Xem một mốc của văn bản ở chế độ chỉ đọc: trình soạn khóa, không đụng tới bản hiện hành. */
export const WriterVersionPreview: React.FC<WriterVersionPreviewProps> = ({ docId, versionId, name, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.history;
  const [content, setContent] = useState<SharedContent | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationResult>({ breaks: [], pageCount: 1, pageOfBlock: [], unitPositions: [] });

  useEffect(() => {
    let cancelled = false;
    getVersionContent(docId, versionId)
      .then((value) => !cancelled && setContent(parseSharedContent(value)))
      .catch((caught) => !cancelled && setProblem(caught instanceof Error ? caught.message : String(caught)));
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      cancelled = true;
      document.removeEventListener('keydown', onKey);
    };
  }, [docId, versionId, onClose]);

  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="calc-dialog version-preview" role="dialog" aria-label={t.previewTitle(name)}>
        <div className="calc-dialog-title">{t.previewTitle(name)}</div>
        {problem && (
          <p className="calc-dialog-problem" role="alert">
            {problem}
          </p>
        )}
        {content && (
          <div className="writer-scroll version-preview-doc">
            <WriterEditor
              initialContent={content.doc}
              pageSetup={content.pageSetup}
              zoom={PREVIEW_ZOOM}
              pageCount={pagination.pageCount}
              onReady={(editor: Editor) => editor.setEditable(false, false)}
              onChange={() => {}}
              onPaginate={setPagination}
            />
          </div>
        )}
        <div className="version-preview-actions">
          <button type="button" className="wr-text-btn" onClick={onClose}>
            {t.previewClose}
          </button>
        </div>
      </div>
    </div>
  );
};
