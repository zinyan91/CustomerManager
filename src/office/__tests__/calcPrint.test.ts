// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { buildPrintHtml, printRangeOf } from '../calc/services/printService';

function filled() {
  const c = new CalcController();
  const put = (row: number, col: number, text: string) => {
    c.select(row, col);
    c.startEdit(text);
    c.commitEdit(null);
  };
  put(0, 0, 'Tên');
  put(0, 1, '<b>5</b>');
  put(1, 0, 'x');
  put(1, 1, '=B1*2');
  return { c, put };
}

describe('in bảng tính', () => {
  it('in đúng vùng có dữ liệu, thoát ký tự HTML, số căn phải', () => {
    const { c } = filled();
    const html = buildPrintHtml(c.wb, 0);
    expect(html).toContain('<table>');
    expect(html).toContain('Tên');
    expect(html).toContain('&lt;b&gt;5&lt;/b&gt;');
    expect(html).not.toContain('<b>5</b>');
    expect(html).toContain('@page{size:A4 portrait;margin:19mm 18mm 19mm 18mm}');
    expect(printRangeOf(c.wb, 0)).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
  });

  it('theo vùng in, hướng giấy, khổ, lề, tỉ lệ, đường lưới và tiêu đề', () => {
    const { c } = filled();
    c.setPageSetup({ orientation: 'landscape', paper: 'Letter', scale: 80, gridlines: true, headings: true, printArea: { r1: 1, c1: 0, r2: 1, c2: 0 } });
    const html = buildPrintHtml(c.wb, 0);
    expect(html).toContain('size:letter landscape');
    expect(html).toContain('zoom:0.8');
    expect(html).toContain('border:1px solid #bbb');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<th>2</th>');
    expect(html).not.toContain('Tên');
  });

  it('bỏ qua hàng đang ẩn và gộp ô thành rowspan hoặc colspan', () => {
    const { c } = filled();
    c.select(0, 0);
    c.extendTo(0, 1);
    c.mergeSelection();
    const html = buildPrintHtml(c.wb, 0);
    expect(html).toContain('colspan="2"');
  });

  it('trang tính trống không lỗi', () => {
    const c = new CalcController();
    expect(buildPrintHtml(c.wb, 0)).toContain('<div class="sheet"></div>');
  });
});
