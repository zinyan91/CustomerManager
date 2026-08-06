export interface UiClasses {
  containerCardBg: string;
  sectionBoxBg: string;
  inputStyle: string;
  readonlyInputStyle: string;
  tableHeaderStyle: string;
  tableRowHover: string;
  labelStyle: string;
}

export const UI: UiClasses = {
  containerCardBg: 'bg-panel border-line text-ink',
  sectionBoxBg: 'bg-surface border-line text-ink',
  inputStyle: 'bg-surface border-line text-ink placeholder-ink-faint focus:border-accent',
  readonlyInputStyle: 'bg-panel-muted border-line text-ink font-semibold cursor-default',
  tableHeaderStyle: 'bg-panel-muted text-ink-faint text-[10px] uppercase tracking-[0.09em]',
  tableRowHover: 'hover:bg-panel-muted',
  labelStyle: 'text-ink-muted font-medium',
};

export const BTN_PRIMARY =
  'bg-accent text-accent-ink font-semibold hover:opacity-90 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const BTN_GHOST =
  'border border-line text-ink-muted hover:border-accent hover:text-accent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const SECTION_LABEL =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint';

export const ROW_RAIL_SELECTED = 'border-l-2 border-accent bg-accent-soft';
export const ROW_RAIL_NEUTRAL = 'border-l-2 border-transparent';
export const ROW_RAIL_ALERT = 'border-l-2 border-neg';

export const DEBT_GROUP_COLOR: Record<number, string> = {
  1: 'bg-g1',
  2: 'bg-g2',
  3: 'bg-g3',
  4: 'bg-g4',
  5: 'bg-g5',
};

export const DEBT_GROUP_TEXT: Record<number, string> = {
  1: 'text-g1',
  2: 'text-g2',
  3: 'text-g3',
  4: 'text-g4',
  5: 'text-g5',
};
