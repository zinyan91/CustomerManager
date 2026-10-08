import React, { useEffect, useRef } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { cellName } from '../engine/cellRef';

/** Mọi ghi chú của trang tính đang xem; bấm một dòng để đến ô đó. */
export const CommentsDialog: React.FC<{ controller: CalcController; onClose: () => void }> = ({ controller, onClose }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.review.commentsDialog;
  const items = controller.commentCells();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  return (
    <div className="calc-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="calc-dialog calc-comments-dialog" role="dialog" aria-label={t.title} onKeyDown={(event) => event.key === 'Escape' && onClose()}>
        <div className="calc-dialog-title">{t.title}</div>
        {items.length === 0 ? (
          <p className="calc-dialog-text">{t.empty}</p>
        ) : (
          <ul className="calc-comment-list">
            {items.map(({ row, col, comment }) => (
              <li key={`${row}:${col}`}>
                <button
                  type="button"
                  title={t.go}
                  onClick={() => {
                    controller.select(row, col);
                    onClose();
                  }}
                >
                  <strong>{cellName(row, col)}</strong>
                  <span className="calc-comment-text">{comment.text}</span>
                  <small>{[comment.author, when(comment.at)].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="calc-dialog-actions">
          <button ref={close} type="button" className="wr-text-btn is-primary" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
