import { parseRange, rangeName } from '../engine/cellRef';
import { DEFAULT_PAGE_SETUP, type PageSetup, type PaperSize } from '../model/workbook';

/** Phần thiết lập trang mà ExcelJS đọc và ghi (lề tính bằng inch, khổ giấy theo mã của Excel). */
export interface ExcelPageSetup {
  orientation?: 'portrait' | 'landscape';
  paperSize?: number;
  scale?: number;
  margins?: { left: number; right: number; top: number; bottom: number; header: number; footer: number };
  printArea?: string;
  showGridLines?: boolean;
  showRowColHeaders?: boolean;
}

const PAPER_CODES: Record<PaperSize, number> = { Letter: 1, Legal: 5, A3: 8, A4: 9, A5: 11 };
const MM_PER_INCH = 25.4;
const HEADER_FOOTER_INCH = 0.3;

export function toExcelPageSetup(setup: PageSetup): ExcelPageSetup {
  const inch = (mm: number) => Math.round((mm / MM_PER_INCH) * 100) / 100;
  return {
    orientation: setup.orientation,
    paperSize: PAPER_CODES[setup.paper],
    scale: setup.scale,
    margins: {
      left: inch(setup.margins.left),
      right: inch(setup.margins.right),
      top: inch(setup.margins.top),
      bottom: inch(setup.margins.bottom),
      header: HEADER_FOOTER_INCH,
      footer: HEADER_FOOTER_INCH,
    },
    printArea: setup.printArea ? rangeName(setup.printArea) : undefined,
    showGridLines: setup.gridlines,
    showRowColHeaders: setup.headings,
  };
}

/** Thiết lập trang trong tệp, hoặc null khi tệp không đặt gì khác mặc định (để trang tính không mang thêm dữ liệu thừa). */
export function fromExcelPageSetup(ps: ExcelPageSetup | undefined): PageSetup | null {
  if (!ps) return null;
  // Lề mặc định của Excel (0,7 và 0,75 inch) lệch dưới nửa mm so với lề "Thường" của ta: coi là cùng một giá trị.
  const mm = (inch: number | undefined, fallback: number) => {
    if (typeof inch !== 'number' || !Number.isFinite(inch)) return fallback;
    const value = Math.round(inch * MM_PER_INCH * 10) / 10;
    return Math.abs(value - fallback) < 0.5 ? fallback : value;
  };
  const paper = (Object.entries(PAPER_CODES).find(([, code]) => code === ps.paperSize)?.[0] as PaperSize | undefined) ?? DEFAULT_PAGE_SETUP.paper;
  const scale = typeof ps.scale === 'number' && ps.scale >= 10 && ps.scale <= 400 ? Math.round(ps.scale) : DEFAULT_PAGE_SETUP.scale;
  const area = ps.printArea ? parseRange(ps.printArea.split(',')[0].replace(/\$/g, '').replace(/^.*!/, '')) : null;
  const setup: PageSetup = {
    orientation: ps.orientation === 'landscape' ? 'landscape' : 'portrait',
    paper,
    margins: {
      top: mm(ps.margins?.top, DEFAULT_PAGE_SETUP.margins.top),
      right: mm(ps.margins?.right, DEFAULT_PAGE_SETUP.margins.right),
      bottom: mm(ps.margins?.bottom, DEFAULT_PAGE_SETUP.margins.bottom),
      left: mm(ps.margins?.left, DEFAULT_PAGE_SETUP.margins.left),
    },
    scale,
    gridlines: !!ps.showGridLines,
    headings: !!ps.showRowColHeaders,
    ...(area ? { printArea: area } : {}),
  };
  const isDefault = JSON.stringify(setup) === JSON.stringify(DEFAULT_PAGE_SETUP);
  return isDefault ? null : setup;
}
