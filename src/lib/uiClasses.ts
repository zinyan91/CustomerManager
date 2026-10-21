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
  containerCardBg: 'bg-panel border border-line/65 text-ink shadow-xs',
  sectionBoxBg: 'bg-surface/90 border border-line/50 text-ink',
  inputStyle: 'bg-surface/80 border-line/70 text-ink placeholder-ink-faint focus:border-accent',
  readonlyInputStyle: 'bg-panel-muted/80 border-line/70 text-ink font-semibold cursor-default',
  tableHeaderStyle: 'bg-panel-muted/55 text-ink-muted text-[10px] font-semibold tracking-normal border-b border-line',
  tableRowHover: 'hover:bg-accent-soft/60 transition-colors duration-150',
  labelStyle: 'text-ink-muted font-medium',
};

export const RADIUS_PANEL = 'rounded-[var(--r-panel)]';
export const RADIUS_CONTROL = 'rounded-[var(--r-control)]';
export const RADIUS_PILL = 'rounded-[var(--r-pill)]';

const BTN_BASE =
  `${RADIUS_CONTROL} font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`;

export const BTN_PRIMARY = `${BTN_BASE} bg-accent text-accent-ink hover:opacity-90 shadow-xs`;

export const BTN_SECONDARY = `${BTN_BASE} border border-line text-ink-muted hover:border-accent hover:text-accent`;

export const BTN_DANGER = `${BTN_BASE} border border-neg/30 text-neg hover:bg-neg hover:text-surface`;

export const BTN_GHOST = BTN_SECONDARY;

export const PANEL = `bg-panel border border-line/70 shadow-xs ${RADIUS_PANEL}`;

export const HEADING_SCREEN = 'text-sm font-semibold tracking-tight text-ink';

export const HEADING_PANEL = 'text-xs font-semibold text-ink';

export const SECTION_LABEL =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint';

export const TABLE_HEAD =
  UI.tableHeaderStyle;

export const TABLE_CELL = 'px-[var(--row-px)] py-[var(--row-py)]';

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
