import type { Workbook } from './workbook';

export interface WorkbookStats {
  sheets: number;
  cells: number;
  formulas: number;
  charts: number;
  pictures: number;
  comments: number;
}

/** Số liệu của cả sổ tính cho hộp Thống kê. */
export function workbookStats(wb: Workbook): WorkbookStats {
  const stats: WorkbookStats = { sheets: wb.sheets.length, cells: 0, formulas: 0, charts: 0, pictures: 0, comments: 0 };
  for (const sheet of wb.sheets) {
    for (const cell of sheet.cells.values()) {
      if (cell.raw === '') continue;
      stats.cells += 1;
      if (cell.raw.startsWith('=')) stats.formulas += 1;
    }
    stats.charts += sheet.charts.length;
    stats.pictures += sheet.images?.length ?? 0;
    stats.comments += sheet.comments?.size ?? 0;
  }
  return stats;
}
