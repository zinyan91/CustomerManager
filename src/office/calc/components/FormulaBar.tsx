import React, { useState, useSyncExternalStore } from 'react';
import { parseRange, rangeName } from '../engine/cellRef';
import type { CalcController } from '../controller';
import { useOfficeI18n } from '../../i18n';

/** The name box (where the cursor is, or type an address to go there) and the contents of the active cell. */
export const FormulaBar: React.FC<{ controller: CalcController }> = ({ controller }) => {
  const { m } = useOfficeI18n();
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const sel = controller.selection;
  const shown = rangeName(sel.r1 === sel.r2 && sel.c1 === sel.c2 ? { ...sel } : sel);
  // Half-typed text in the name box counts only while the selection it was typed for is unchanged.
  const [typedState, setTypedState] = useState<{ forName: string; text: string } | null>(null);
  const typed = typedState && typedState.forName === shown ? typedState.text : null;
  const setTyped = (text: string | null) => setTypedState(text === null ? null : { forName: shown, text });
  const editing = controller.editing;
  const value = editing ? editing.text : controller.rawOfActive();
  // A cell filled by a formula's block has no content of its own; the formula that fills it is shown, greyed.
  const spilledFrom = !editing && value === '' ? controller.spillFormulaOfActive() : null;

  const goTo = (text: string) => {
    const range = parseRange(text.replace(/\$/g, ''));
    if (range) controller.selectRange(range);
    setTyped(null);
  };

  return (
    <div className="calc-formula-bar" data-formula-bar>
      <input
        className="calc-name-box"
        aria-label={m.calc.formulaBar.nameBox}
        value={typed ?? shown}
        onChange={(event) => setTyped(event.target.value)}
        onFocus={(event) => event.target.select()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            goTo(typed ?? shown);
            document.querySelector<HTMLElement>('.calc-grid')?.focus();
          } else if (event.key === 'Escape') setTyped(null);
        }}
        onBlur={() => setTyped(null)}
      />
      <span className="calc-fx" title={m.calc.formulaBar.fx} aria-hidden="true">
        fx
      </span>
      <input
        className="calc-formula-input"
        aria-label={m.calc.formulaBar.fx}
        value={value}
        placeholder={spilledFrom ?? undefined}
        spellCheck={false}
        onFocus={() => !controller.editing && controller.startEdit()}
        onChange={(event) => {
          if (!controller.editing) controller.startEdit(event.target.value);
          else controller.setEditText(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            controller.commitEdit('down');
            document.querySelector<HTMLElement>('.calc-grid')?.focus();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            controller.cancelEdit();
            document.querySelector<HTMLElement>('.calc-grid')?.focus();
          }
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as HTMLElement | null;
          if (next?.closest('.calc-grid')) return;
          if (controller.editing && !next?.closest('[data-formula-bar]')) controller.commitEdit(null);
        }}
      />
    </div>
  );
};
