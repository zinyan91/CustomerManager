import React, { useEffect } from 'react';
import { useOfficeI18n } from '../../i18n';
import type { DocStats } from '../utils/docJson';

export const StatsDialog: React.FC<{ stats: DocStats; pages: number; onClose: () => void }> = ({ stats, pages, onClose }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.writer.wordCount;
  const format = (n: number) => n.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: Array<[string, number]> = [
    [t.pages, pages],
    [t.words, stats.words],
    [t.chars, stats.chars],
    [t.charsNoSpaces, stats.charsNoSpaces],
    [t.paragraphs, stats.paragraphs],
  ];

  return (
    <div className="wr-modal-backdrop" onMouseDown={onClose}>
      <div className="wr-modal" role="dialog" aria-modal="true" aria-label={t.title} onMouseDown={(event) => event.stopPropagation()}>
        <h2>{t.title}</h2>
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{format(value)}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="wr-text-btn is-primary" onClick={onClose} autoFocus>
          {t.close}
        </button>
      </div>
    </div>
  );
};
