import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { CalcController } from '../controller';
import { useOfficeI18n } from '../../i18n';

/** Find and replace over the active sheet; the matches are the cells whose shown or typed text contains the query. */
export const CalcFindPanel: React.FC<{ controller: CalcController; onClose: () => void }> = ({ controller, onClose }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.find;
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [current, setCurrent] = useState(0);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  const version = controller.wb.version;
  const active = controller.active;
  // The workbook changes under the same object, so its version is what invalidates the matches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matches = useMemo(() => controller.findAll(query, matchCase), [controller, query, matchCase, version, active]);
  const index = matches.length ? Math.min(current, matches.length - 1) : -1;

  const go = (next: number) => {
    if (!matches.length) return;
    const wrapped = (next + matches.length) % matches.length;
    setCurrent(wrapped);
    controller.select(matches[wrapped].row, matches[wrapped].col);
  };

  return (
    <div
      className="wr-find"
      role="search"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
          document.querySelector<HTMLElement>('.calc-grid')?.focus();
        }
      }}
    >
      <div className="wr-find-row">
        <input
          ref={input}
          type="text"
          className="wr-find-input"
          placeholder={t.find}
          aria-label={t.find}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCurrent(0);
            setNotice('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              go(index + (event.shiftKey ? -1 : 1));
            }
          }}
        />
        <span className="wr-find-count" aria-live="polite">
          {query ? t.matches(index + 1, matches.length) : ''}
        </span>
        <button type="button" className="wr-btn" title={t.prev} aria-label={t.prev} disabled={!matches.length} onClick={() => go(index - 1)}>
          <ArrowUp size={15} />
        </button>
        <button type="button" className="wr-btn" title={t.next} aria-label={t.next} disabled={!matches.length} onClick={() => go(index + 1)}>
          <ArrowDown size={15} />
        </button>
        <button type="button" className="wr-btn" title={t.close} aria-label={t.close} onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="wr-find-row">
        <input type="text" className="wr-find-input" placeholder={t.replace} aria-label={t.replace} value={replacement} onChange={(event) => setReplacement(event.target.value)} />
        <button
          type="button"
          className="wr-text-btn"
          disabled={!matches.length}
          onClick={() => setNotice(t.replaced(controller.replaceAll(query, replacement, matchCase)))}
        >
          {t.replaceAll}
        </button>
        <label className="wr-check">
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(event) => {
              setMatchCase(event.target.checked);
              setNotice('');
            }}
          />
          <span>{t.matchCase}</span>
        </label>
        {notice && <span className="wr-find-count">{notice}</span>}
      </div>
    </div>
  );
};
