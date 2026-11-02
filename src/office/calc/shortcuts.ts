/**
 * Excel's keyboard shortcuts for the grid, as a pure map from a key press to
 * what it asks for. Keys are told apart by `code` (the physical key), so
 * Ctrl+Shift+1 works the same on every layout.
 */
export interface KeyInput {
  key: string;
  code: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

/** What the screen tells the ribbon when a shortcut asks for the name manager. */
export const OPEN_NAMES_EVENT = 'calc-open-names';
/** And when one asks for the number format dialog (Ctrl+1). */
export const OPEN_FORMAT_EVENT = 'calc-open-format';

export type GridAction =
  | { type: 'sheet'; delta: 1 | -1 }
  | { type: 'selectColumn' }
  | { type: 'selectRow' }
  | { type: 'selectAll' }
  | { type: 'region' }
  | { type: 'extend'; to: 'rowStart' | 'sheetStart' | 'dataEnd' }
  | { type: 'insertDate' }
  | { type: 'insertTime' }
  | { type: 'copyFromAbove'; values: boolean }
  | { type: 'format'; code: string }
  | { type: 'style'; key: 'bold' | 'italic' | 'underline' | 'strike' }
  | { type: 'toggleFilter' }
  | { type: 'formatAsTable' }
  | { type: 'autoSum' }
  | { type: 'showFormulas' }
  | { type: 'insertCells' }
  | { type: 'deleteCells' }
  | { type: 'hide'; axis: 'row' | 'col' }
  | { type: 'unhide'; axis: 'row' | 'col' }
  | { type: 'goTo' }
  | { type: 'hyperlink' }
  | { type: 'note' }
  | { type: 'formatCells' }
  | { type: 'scrollToCursor' }
  | { type: 'border'; preset: 'outside' | 'none' }
  | { type: 'newSheet' }
  | { type: 'chart' }
  | { type: 'extendMode' }
  | { type: 'recalculate' }
  | { type: 'saveAs' }
  | { type: 'group'; delta: 1 | -1 }
  | { type: 'visibleCells' }
  | { type: 'notedCells' }
  | { type: 'flashFill' }
  | { type: 'differences'; by: 'row' | 'column' }
  | { type: 'namesFromSelection' }
  | { type: 'precedents' }
  | { type: 'dependents' }
  | { type: 'repeat'; fromCtrlY?: boolean }
  | { type: 'endMode' }
  | { type: 'screen'; axis: 'row' | 'col'; delta: 1 | -1 };

export const NUMBER_FORMATS = {
  number: '#,##0.00',
  time: 'h:mm AM/PM',
  date: 'd-mmm-yy',
  currency: '#,##0.00 "₫"',
  percent: '0%',
  scientific: '0.00E+00',
  general: 'General',
} as const;

const DIGIT_FORMATS: Record<string, string> = {
  Digit1: NUMBER_FORMATS.number,
  Digit2: NUMBER_FORMATS.time,
  Digit3: NUMBER_FORMATS.date,
  Digit4: NUMBER_FORMATS.currency,
  Digit5: NUMBER_FORMATS.percent,
  Digit6: NUMBER_FORMATS.scientific,
};

const DIGIT_STYLES: Record<string, 'bold' | 'italic' | 'underline' | 'strike'> = { Digit2: 'bold', Digit3: 'italic', Digit4: 'underline', Digit5: 'strike' };

function withCtrl({ key, code, shift }: KeyInput): GridAction | null {
  switch (code) {
    case 'PageDown':
      return { type: 'sheet', delta: 1 };
    case 'PageUp':
      return { type: 'sheet', delta: -1 };
    case 'Space':
      return shift ? { type: 'selectAll' } : { type: 'selectColumn' };
    case 'Backquote':
      return shift ? { type: 'format', code: NUMBER_FORMATS.general } : { type: 'showFormulas' };
    case 'Semicolon':
      return shift ? { type: 'insertTime' } : { type: 'insertDate' };
    case 'Quote':
      return { type: 'copyFromAbove', values: shift };
    case 'KeyL':
      return shift ? { type: 'toggleFilter' } : { type: 'formatAsTable' };
    case 'KeyT':
      return shift ? null : { type: 'formatAsTable' };
    case 'KeyG':
      return { type: 'goTo' };
    case 'KeyK':
      return { type: 'hyperlink' };
    case 'Backspace':
      return { type: 'scrollToCursor' };
    case 'Minus':
    case 'NumpadSubtract':
      return shift ? { type: 'border', preset: 'none' } : { type: 'deleteCells' };
    case 'Equal':
      return shift ? { type: 'insertCells' } : null;
    case 'NumpadAdd':
      return { type: 'insertCells' };
    case 'Backslash':
      return { type: 'differences', by: shift ? 'column' : 'row' };
    case 'F3':
      return shift ? { type: 'namesFromSelection' } : null;
    case 'KeyE':
      return shift ? null : { type: 'flashFill' };
    case 'BracketLeft':
      return { type: 'precedents' };
    case 'BracketRight':
      return { type: 'dependents' };
    case 'KeyO':
      return shift ? { type: 'notedCells' } : null;
    case 'Digit8':
      return shift ? { type: 'region' } : null;
    case 'Digit7':
      return shift ? { type: 'border', preset: 'outside' } : null;
    case 'Digit9':
      return shift ? { type: 'unhide', axis: 'row' } : { type: 'hide', axis: 'row' };
    case 'Digit0':
      return shift ? { type: 'unhide', axis: 'col' } : { type: 'hide', axis: 'col' };
    case 'Digit1':
      return shift ? { type: 'format', code: DIGIT_FORMATS.Digit1 } : { type: 'formatCells' };
  }
  if (key === '*' || code === 'NumpadMultiply') return { type: 'region' };
  if (code in DIGIT_FORMATS) return shift ? { type: 'format', code: DIGIT_FORMATS[code] } : code in DIGIT_STYLES ? { type: 'style', key: DIGIT_STYLES[code] } : null;
  if (key === 'Home' && shift) return { type: 'extend', to: 'sheetStart' };
  if (key === 'End' && shift) return { type: 'extend', to: 'dataEnd' };
  return null;
}

/** What a key press means for the grid, or null when it means nothing there. */
export function gridShortcut(input: KeyInput): GridAction | null {
  const { key, code, ctrl, shift, alt } = input;
  if (alt && !ctrl) {
    if (key === '=' || code === 'Equal') return { type: 'autoSum' };
    if (code === 'F1') return shift ? { type: 'newSheet' } : { type: 'chart' };
    if (shift && (code === 'ArrowRight' || code === 'ArrowLeft')) return { type: 'group', delta: code === 'ArrowRight' ? 1 : -1 };
    if (code === 'Semicolon' && !shift) return { type: 'visibleCells' };
    if (code === 'PageDown' || code === 'PageUp') return { type: 'screen', axis: 'col', delta: code === 'PageDown' ? 1 : -1 };
    return null;
  }
  if (alt) return null;
  if (!ctrl) {
    if (shift && code === 'F11') return { type: 'newSheet' };
    if (!shift && code === 'F11') return { type: 'chart' };
    if (!shift && code === 'F4') return { type: 'repeat' };
    if (!shift && code === 'F8') return { type: 'extendMode' };
    if (code === 'F9') return { type: 'recalculate' };
    if (code === 'F12') return { type: 'saveAs' };
    if (!shift && code === 'End') return { type: 'endMode' };
  }
  if (ctrl) return !shift && code === 'KeyY' ? { type: 'repeat', fromCtrlY: true } : withCtrl(input);
  if (shift && code === 'Space') return { type: 'selectRow' };
  if (shift && key === 'Home') return { type: 'extend', to: 'rowStart' };
  if (shift && key === 'F2') return { type: 'note' };
  return null;
}
