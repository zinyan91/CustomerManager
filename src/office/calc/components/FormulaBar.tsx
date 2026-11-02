import React, { useRef, useState, useSyncExternalStore } from 'react';
import { parseRange, rangeName } from '../engine/cellRef';
import { cycleReference } from '../engine/refCycle';
import type { CalcController } from '../controller';
import { FormulaAssistView } from './FormulaAssist';
import { useFormulaAssist } from './useFormulaAssist';
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
  const [barFocused, setBarFocused] = useState(false);
  const assist = useFormulaAssist(value, !!editing && barFocused);
  const formulaInput = useRef<HTMLInputElement | null>(null);
  const applyAssist = (text: string): void => controller.setEditText(text);

  const goTo = (text: string) => {
    const name = text.trim();
    const range = parseRange(name.replace(/\$/g, ''));
    if (range) controller.selectRange(range);
    // A defined name goes to its cells; a new, allowed name is given to the selection, as in Excel.
    else if (!controller.goToName(name)) controller.defineName(name);
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
        ref={formulaInput}
        aria-label={m.calc.formulaBar.fx}
        value={value}
        placeholder={spilledFrom ?? undefined}
        spellCheck={false}
        onFocus={() => {
          setBarFocused(true);
          if (!controller.editing) controller.startEdit();
        }}
        onClick={(event) => assist.track(event.currentTarget)}
        onKeyUp={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') assist.track(event.currentTarget);
        }}
        onChange={(event) => {
          if (!controller.editing) controller.startEdit(event.target.value);
          else controller.setEditText(event.target.value);
          assist.track(event.target);
        }}
        onKeyDown={(event) => {
          if (assist.onKeyDown(event, applyAssist)) return;
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            controller.commitEditToSelection();
            document.querySelector<HTMLElement>('.calc-grid')?.focus();
          } else if (event.key === 'F4') {
            event.preventDefault();
            const input = event.currentTarget;
            const next = cycleReference(value, input.selectionStart ?? 0, input.selectionEnd ?? 0);
            if (next) {
              if (controller.editing) controller.setEditText(next.text);
              else controller.startEdit(next.text);
              requestAnimationFrame(() => input.setSelectionRange(next.from, next.to));
            }
          } else if (event.key === 'Enter') {
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
          setBarFocused(false);
          const next = event.relatedTarget as HTMLElement | null;
          if (next?.closest('.calc-grid')) return;
          if (controller.editing && !next?.closest('[data-formula-bar]')) controller.commitEdit(null);
        }}
      />
      <FormulaAssistView assist={assist} style={{ left: 120, top: '100%' }} input={() => formulaInput.current} apply={applyAssist} />
    </div>
  );
};
