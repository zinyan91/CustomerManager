import React from 'react';
import type { FormulaAssist } from './useFormulaAssist';

interface ViewProps {
  assist: FormulaAssist;
  style: React.CSSProperties;
  input: () => HTMLInputElement | HTMLTextAreaElement | null;
  apply: (text: string, caret: number) => void;
}

/** The list and the argument hint, drawn under the cell or the formula bar. */
export const FormulaAssistView: React.FC<ViewProps> = ({ assist, style, input, apply }) => {
  if (assist.suggestions.length === 0 && !assist.hint) return null;
  return (
    <div className="calc-assist" style={style} data-formula-bar>
      {assist.hint && (
        <div className="calc-assist-hint">
          <strong>{assist.hint.signature.name}</strong>(
          {assist.hint.signature.args.map((arg, i) => (
            <React.Fragment key={`${arg}-${i}`}>
              {i > 0 && ', '}
              <span className={i === assist.hint!.index ? 'is-current' : undefined}>{arg}</span>
            </React.Fragment>
          ))}
          )
        </div>
      )}
      {assist.suggestions.length > 0 && (
        <div className="calc-assist-list" role="listbox">
          {assist.suggestions.map((name, i) => (
            <div
              key={name}
              role="option"
              aria-selected={i === assist.active}
              className={`calc-assist-item${i === assist.active ? ' is-active' : ''}`}
              onMouseDown={(event) => {
                event.preventDefault();
                assist.pick(name, input(), apply);
              }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
