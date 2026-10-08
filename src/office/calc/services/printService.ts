import { columnName, type RangePos } from '../engine/cellRef';
import { isError } from '../engine/values';
import { DEFAULT_COL_WIDTH, pageSetupOf, rowHeightOf, type CellStyle, type PaperSize, type Workbook } from '../model/workbook';

/** Khổ giấy theo mm (rộng × cao khi đặt dọc). */
export const PAPER_MM: Record<PaperSize, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cellCss(style: CellStyle, numeric: boolean): string {
  const css: string[] = [];
  if (style.fontFamily) css.push(`font-family:'${style.fontFamily.replace(/'/g, '')}',Arial,sans-serif`);
  if (style.fontSize) css.push(`font-size:${style.fontSize}pt`);
  if (style.bold) css.push('font-weight:700');
  if (style.italic) css.push('font-style:italic');
  const decoration = [style.underline ? 'underline' : '', style.strike ? 'line-through' : ''].filter(Boolean).join(' ');
  if (decoration) css.push(`text-decoration:${decoration}`);
  if (style.color) css.push(`color:${style.color}`);
  if (style.fill) css.push(`background:${style.fill}`);
  css.push(`text-align:${style.hAlign ?? (numeric ? 'right' : 'left')}`);
  css.push(`vertical-align:${style.vAlign === 'top' ? 'top' : style.vAlign === 'middle' ? 'middle' : 'bottom'}`);
  css.push(style.wrap ? 'white-space:pre-wrap;word-break:break-word' : 'white-space:nowrap;overflow:hidden');
  const b = style.borders;
  if (b?.top) css.push('border-top:1px solid #000');
  if (b?.right) css.push('border-right:1px solid #000');
  if (b?.bottom) css.push('border-bottom:1px solid #000');
  if (b?.left) css.push('border-left:1px solid #000');
  return css.join(';');
}

/** Vùng sẽ in: vùng in đã đặt, nếu không thì vùng có dữ liệu; null khi trang tính trống. */
export function printRangeOf(wb: Workbook, sheetIndex: number): RangePos | null {
  return pageSetupOf(wb.sheets[sheetIndex]).printArea ?? wb.usedRange(sheetIndex);
}

/** Trang HTML đầy đủ của một trang tính theo thiết lập trang (hướng giấy, khổ, lề, tỉ lệ, đường lưới, tiêu đề hàng cột). */
export function buildPrintHtml(wb: Workbook, sheetIndex: number): string {
  const sheet = wb.sheets[sheetIndex];
  const setup = pageSetupOf(sheet);
  const range = printRangeOf(wb, sheetIndex);
  const paper = PAPER_MM[setup.paper];
  const hidden = wb.hiddenRows(sheetIndex);
  const { margins } = setup;

  const covered = new Set<string>();
  const anchors = new Map<string, RangePos>();
  for (const merge of sheet.merges) {
    anchors.set(`${merge.r1}:${merge.c1}`, merge);
    for (let r = merge.r1; r <= merge.r2; r += 1) for (let c = merge.c1; c <= merge.c2; c += 1) if (r !== merge.r1 || c !== merge.c1) covered.add(`${r}:${c}`);
  }

  let table = '';
  if (range) {
    const cols: number[] = [];
    for (let c = range.c1; c <= range.c2; c += 1) cols.push(c);
    table += '<colgroup>';
    if (setup.headings) table += '<col style="width:40px">';
    for (const c of cols) table += `<col style="width:${sheet.colWidths.get(c) ?? DEFAULT_COL_WIDTH}px">`;
    table += '</colgroup>';
    if (setup.headings) table += `<thead><tr><th></th>${cols.map((c) => `<th>${columnName(c)}</th>`).join('')}</tr></thead>`;
    table += '<tbody>';
    for (let r = range.r1; r <= range.r2; r += 1) {
      if (hidden.has(r)) continue;
      table += `<tr style="height:${rowHeightOf(sheet, r)}px">`;
      if (setup.headings) table += `<th>${r + 1}</th>`;
      for (const c of cols) {
        if (covered.has(`${r}:${c}`)) continue;
        const merge = anchors.get(`${r}:${c}`);
        const span = merge ? ` rowspan="${merge.r2 - merge.r1 + 1}" colspan="${merge.c2 - merge.c1 + 1}"` : '';
        const cell = wb.getCell(sheetIndex, r, c);
        const value = wb.valueAt(sheetIndex, r, c);
        const text = wb.displayAt(sheetIndex, r, c);
        const style = wb.styleOf(cell?.style ?? 0);
        table += `<td${span} style="${cellCss(style, typeof value === 'number' && !isError(value))}">${escapeHtml(text)}</td>`;
      }
      table += '</tr>';
    }
    table += '</tbody>';
    table = `<table>${table}</table>`;
  }

  const cellBorder = setup.gridlines ? 'border:1px solid #bbb' : 'border:0';
  const width = setup.orientation === 'landscape' ? paper.height : paper.width;
  const height = setup.orientation === 'landscape' ? paper.width : paper.height;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(sheet.name)}</title><style>
@page{size:${setup.paper === 'Letter' ? 'letter' : setup.paper === 'Legal' ? 'legal' : setup.paper} ${setup.orientation};margin:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm}
html,body{margin:0;padding:0;background:#fff}
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#000}
.sheet{zoom:${setup.scale / 100}}
table{border-collapse:collapse;table-layout:fixed}
td,th{padding:1px 4px;${cellBorder};overflow:hidden}
th{font-weight:400;background:#f0f0f0;text-align:center;border:1px solid #bbb;color:#444}
tr{page-break-inside:avoid}
@media screen{body{width:${width}mm;min-height:${height}mm;padding:${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;box-sizing:border-box}}
</style></head><body><div class="sheet">${table}</div></body></html>`;
}

/** In một trang HTML qua khung ẩn; trả lời khi hộp thoại in đã được mở. */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    const cleanup = () => window.setTimeout(() => frame.remove(), 1000);
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        resolve();
      } catch (caught) {
        reject(caught);
      } finally {
        cleanup();
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
