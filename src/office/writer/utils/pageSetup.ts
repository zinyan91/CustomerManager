/**
 * Page setup: paper, orientation, margins, header and footer. Stored with each
 * draft and written into the DOCX section properties, the print stylesheet and
 * the on-screen page view, so all three agree on where a page ends.
 */
export type PaperSize = 'a4' | 'letter' | 'legal' | 'a5';
export type Orientation = 'portrait' | 'landscape';
export type MarginPreset = 'normal' | 'narrow' | 'wide' | 'custom';

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageSetup {
  paper: PaperSize;
  orientation: Orientation;
  /** Millimetres. */
  margins: Margins;
  headerText: string;
  footerText: string;
  pageNumbers: boolean;
  /** Font of text with no font of its own; '' is Arial. */
  baseFont: string;
  /** Size of text with no size of its own, in points. */
  baseSize: number;
}

/** Portrait width × height in millimetres. */
export const PAPER_SIZES_MM: Record<PaperSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a5: { width: 148, height: 210 },
};

export const PAPER_LABELS: Record<PaperSize, string> = {
  a4: 'A4 (210 × 297 mm)',
  letter: 'Letter (8.5 × 11 in)',
  legal: 'Legal (8.5 × 14 in)',
  a5: 'A5 (148 × 210 mm)',
};

export const MARGIN_PRESETS: Record<Exclude<MarginPreset, 'custom'>, Margins> = {
  normal: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4 },
  narrow: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  wide: { top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 },
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  paper: 'a4',
  orientation: 'portrait',
  margins: { ...MARGIN_PRESETS.normal },
  headerText: '',
  footerText: '',
  pageNumbers: false,
  baseFont: '',
  baseSize: 11,
};

const MM_PER_INCH = 25.4;
const CSS_PX_PER_INCH = 96;
const TWIPS_PER_INCH = 1440;

export const mmToPx = (mm: number): number => (mm / MM_PER_INCH) * CSS_PX_PER_INCH;
export const mmToTwips = (mm: number): number => Math.round((mm / MM_PER_INCH) * TWIPS_PER_INCH);

/** Width × height in millimetres, with the orientation applied. */
export function pageDimensionsMm(setup: Pick<PageSetup, 'paper' | 'orientation'>): { width: number; height: number } {
  const { width, height } = PAPER_SIZES_MM[setup.paper];
  return setup.orientation === 'landscape' ? { width: height, height: width } : { width, height };
}

/** Everything the page view needs, in CSS pixels. */
export function pageGeometryPx(setup: PageSetup): {
  width: number;
  height: number;
  margins: Margins;
  contentWidth: number;
  contentHeight: number;
} {
  const { width, height } = pageDimensionsMm(setup);
  const margins = {
    top: mmToPx(setup.margins.top),
    bottom: mmToPx(setup.margins.bottom),
    left: mmToPx(setup.margins.left),
    right: mmToPx(setup.margins.right),
  };
  const w = mmToPx(width);
  const h = mmToPx(height);
  return {
    width: w,
    height: h,
    margins,
    contentWidth: w - margins.left - margins.right,
    contentHeight: h - margins.top - margins.bottom,
  };
}

/** Which preset these margins are, or 'custom'. */
export function marginPresetOf(margins: Margins): MarginPreset {
  for (const [name, preset] of Object.entries(MARGIN_PRESETS) as Array<[Exclude<MarginPreset, 'custom'>, Margins]>) {
    const same = (Object.keys(preset) as Array<keyof Margins>).every((side) => Math.abs(preset[side] - margins[side]) < 0.05);
    if (same) return name;
  }
  return 'custom';
}

/**
 * Margins a user typed, made safe: each between 0 and 100 mm, and leaving at
 * least 30 mm of text area in both directions.
 */
export function clampMargins(margins: Margins, setup: Pick<PageSetup, 'paper' | 'orientation'>): Margins {
  const { width, height } = pageDimensionsMm(setup);
  const clamp = (value: number) => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);
  const next = {
    top: clamp(margins.top),
    bottom: clamp(margins.bottom),
    left: clamp(margins.left),
    right: clamp(margins.right),
  };
  const shrink = (a: keyof Margins, b: keyof Margins, room: number) => {
    const over = next[a] + next[b] - (room - 30);
    if (over > 0) {
      const total = next[a] + next[b];
      next[a] -= (over * next[a]) / total;
      next[b] -= (over * next[b]) / total;
    }
  };
  shrink('left', 'right', width);
  shrink('top', 'bottom', height);
  return next;
}

/** A stored page setup, filled in where a draft from an older version lacks a field. */
export function parsePageSetup(value: unknown): PageSetup {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<PageSetup>;
  const paper = raw.paper && raw.paper in PAPER_SIZES_MM ? raw.paper : DEFAULT_PAGE_SETUP.paper;
  const orientation = raw.orientation === 'landscape' ? 'landscape' : 'portrait';
  const m = raw.margins ?? DEFAULT_PAGE_SETUP.margins;
  return {
    paper,
    orientation,
    margins: clampMargins(
      { top: Number(m.top), bottom: Number(m.bottom), left: Number(m.left), right: Number(m.right) },
      { paper, orientation },
    ),
    headerText: typeof raw.headerText === 'string' ? raw.headerText : '',
    footerText: typeof raw.footerText === 'string' ? raw.footerText : '',
    pageNumbers: raw.pageNumbers === true,
    baseFont: typeof raw.baseFont === 'string' ? raw.baseFont.replace(/['"{};\\]/g, '').slice(0, 60) : '',
    baseSize: Number(raw.baseSize) >= 6 && Number(raw.baseSize) <= 72 ? Number(raw.baseSize) : 11,
  };
}

/** "Trang {page} / {pages}" split around its two fields, for DOCX and print. */
export function splitPageTemplate(template: string): Array<{ text: string } | { field: 'page' | 'pages' }> {
  const parts: Array<{ text: string } | { field: 'page' | 'pages' }> = [];
  const pattern = /\{(page|pages)\}/g;
  let last = 0;
  for (const match of template.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: template.slice(last, match.index) });
    parts.push({ field: match[1] as 'page' | 'pages' });
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

/** The template with its fields filled, for the on-screen page view. */
export function fillPageTemplate(template: string, page: number, pages: number): string {
  return template.replace(/\{pages\}/g, String(pages)).replace(/\{page\}/g, String(page));
}
