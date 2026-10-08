import React, { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import type { WriterFormatState } from '../editor/useWriterState';

export const FindReplacePanel: React.FC<{ editor: Editor; state: WriterFormatState; onClose: () => void }> = ({
  editor,
  state,
  onClose,
}) => {
  const { m } = useOfficeI18n();
  const t = m.writer.find;
  // Start from the selected word, as Word does.
  const [query, setQuery] = useState(() => {
    const { from, to } = editor.state.selection;
    const selected = from !== to ? editor.state.doc.textBetween(from, to, ' ') : '';
    return selected && selected.length < 80 ? selected : '';
  });
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
    return () => {
      editor.commands.clearSearch();
    };
  }, [editor]);

  useEffect(() => {
    editor.commands.setSearch(query, matchCase);
  }, [editor, query, matchCase]);

  const matches = state.findMatches;
  const step = (direction: 1 | -1) => (direction > 0 ? editor.commands.findNext() : editor.commands.findPrevious());

  return (
    <div
      className="wr-find"
      role="search"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose();
          editor.commands.focus();
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
            setNotice('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              step(event.shiftKey ? -1 : 1);
            }
          }}
        />
        <span className="wr-find-count" aria-live="polite">
          {query ? t.matches(state.findCurrent + 1, matches) : ''}
        </span>
        <button type="button" className="wr-btn" title={t.prev} aria-label={t.prev} onClick={() => step(-1)} disabled={!matches}>
          <ArrowUp size={15} />
        </button>
        <button type="button" className="wr-btn" title={t.next} aria-label={t.next} onClick={() => step(1)} disabled={!matches}>
          <ArrowDown size={15} />
        </button>
        <button type="button" className="wr-btn" title={t.close} aria-label={t.close} onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="wr-find-row">
        <input
          type="text"
          className="wr-find-input"
          placeholder={t.replace}
          aria-label={t.replace}
          value={replacement}
          onChange={(event) => setReplacement(event.target.value)}
        />
        <button
          type="button"
          className="wr-text-btn"
          disabled={!matches}
          onClick={() => editor.commands.replaceCurrent(replacement)}
        >
          {t.replaceOne}
        </button>
        <button
          type="button"
          className="wr-text-btn"
          disabled={!matches}
          onClick={() => {
            const count = matches;
            editor.commands.replaceAll(replacement);
            setNotice(t.replaced(count));
          }}
        >
          {t.replaceAll}
        </button>
        <label className="wr-check">
          <input type="checkbox" checked={matchCase} onChange={(event) => {
              setMatchCase(event.target.checked);
              setNotice('');
            }} />
          <span>{t.matchCase}</span>
        </label>
        {notice && <span className="wr-find-count">{notice}</span>}
      </div>
    </div>
  );
};
