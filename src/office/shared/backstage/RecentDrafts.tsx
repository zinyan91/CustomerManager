import React, { useEffect, useState } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { DraftSummary } from '../idbStore';

export interface RecentDraftsProps {
  list: () => Promise<DraftSummary[]>;
  icon: React.ReactNode;
  /** Tên hiện cho bản nháp chưa đặt tên. */
  untitled: string;
  onOpen: (id: string) => void;
  onError: (text: string) => void;
}

/** Danh sách nháp gần đây (mới nhất trước) trong màn Tệp. */
export const RecentDrafts: React.FC<RecentDraftsProps> = ({ list, icon, untitled, onOpen, onError }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.backstage;
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  useEffect(() => {
    let cancelled = false;
    list()
      .then((items) => !cancelled && setDrafts(items))
      .catch((caught) => !cancelled && onError(caught instanceof Error ? caught.message : String(caught)));
    return () => {
      cancelled = true;
    };
    // Nạp một lần mỗi lần màn này hiện ra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="calc-recent" aria-label={t.recent}>
      <h3>{t.recent}</h3>
      {drafts === null ? null : drafts.length === 0 ? (
        <p className="calc-dialog-text">{t.noRecent}</p>
      ) : (
        <ul>
          {drafts.map((draft) => (
            <li key={draft.id}>
              <button type="button" onClick={() => onOpen(draft.id)}>
                {icon}
                <span className="calc-recent-name">{draft.title || untitled}</span>
                <small>{when(draft.updatedAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
