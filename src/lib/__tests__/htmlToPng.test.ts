import { describe, it, expect } from 'vitest';
import {
  mmToPx, contentBox, fitScale, buildForeignObjectSvg, svgToDataUri,
  A4_PORTRAIT_PX, A4_LANDSCAPE_PX, SHEET_ROOT_CLASS,
} from '../htmlToPng';

describe('khổ giấy A4', () => {
  it('dọc và ngang chỉ là hoán vị của nhau', () => {
    expect(A4_PORTRAIT_PX).toEqual({ width: 794, height: 1123 });
    expect(A4_LANDSCAPE_PX).toEqual({ width: 1123, height: 794 });
  });

  it('quy đổi milimet sang điểm ảnh theo 96dpi', () => {
    expect(mmToPx(25.4)).toBe(96);
    expect(mmToPx(11)).toBe(42);
    expect(mmToPx(12)).toBe(45);
  });

  it('vùng nội dung là khổ giấy trừ lề hai bên', () => {
    expect(contentBox(A4_PORTRAIT_PX)).toEqual({ width: 794 - 45 * 2, height: 1123 - 42 * 2 });
    expect(contentBox(A4_LANDSCAPE_PX)).toEqual({ width: 1123 - 45 * 2, height: 794 - 42 * 2 });
  });
});

describe('fitScale', () => {
  it('nội dung vừa trang thì giữ nguyên tỷ lệ', () => {
    expect(fitScale(500, 1000)).toBe(1);
    expect(fitScale(1000, 1000)).toBe(1);
  });

  it('nội dung dài hơn trang thì thu lại vừa đúng, không cắt', () => {
    expect(fitScale(2000, 1000)).toBe(0.5);
    expect(fitScale(1250, 1000)).toBe(0.8);
  });

  it('số đo vô lý thì giữ nguyên thay vì chia cho 0', () => {
    expect(fitScale(0, 1000)).toBe(1);
    expect(fitScale(1000, 0)).toBe(1);
    expect(fitScale(-5, 1000)).toBe(1);
  });
});

describe('buildForeignObjectSvg', () => {
  const svg = buildForeignObjectSvg('<p>Xin chào</p>', 'p{color:red}', A4_PORTRAIT_PX, '#ffffff', 1);

  it('khung SVG đúng bằng khổ giấy, không co theo nội dung', () => {
    expect(svg).toContain('width="794" height="1123"');
    expect(svg).toContain('viewBox="0 0 794 1123"');
  });

  it('khai không gian tên XHTML để trình duyệt dựng được nội dung HTML', () => {
    expect(svg).toContain('xmlns="http://www.w3.org/1999/xhtml"');
  });

  it('gắn lớp gốc để bộ định dạng của tờ chào áp được vào đúng khối', () => {
    expect(svg).toContain(`class="${SHEET_ROOT_CLASS}"`);
  });

  it('chèn lề đúng bằng lề trang in', () => {
    expect(svg).toContain('padding:42px 45px');
  });

  it('cắt phần tràn ra ngoài trang thay vì đẩy khung SVG dài ra', () => {
    expect(svg).toContain('overflow:hidden');
  });

  it('mang theo tỷ lệ thu nhỏ khi nội dung dài hơn trang', () => {
    const thuNho = buildForeignObjectSvg('<p>x</p>', '', A4_PORTRAIT_PX, '#fff', 0.8);
    expect(thuNho).toContain('transform:scale(0.8)');
    expect(thuNho).toContain('transform-origin:top left');
  });
});

describe('svgToDataUri', () => {
  it('mã hoá để nhét được vào thuộc tính src', () => {
    const uri = svgToDataUri('<svg><text>a b</text></svg>');
    expect(uri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(uri).not.toContain(' ');
  });
});
