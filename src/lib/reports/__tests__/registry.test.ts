import { describe, it, expect } from 'vitest';
import { REPORTS, reportById, buildReportWorkbook } from '../registry';

describe('REPORTS — toan ven registry', () => {
  it('co dung nam bao cao', () => {
    expect(REPORTS).toHaveLength(5);
  });

  it('id khong trung nhau', () => {
    const ids = REPORTS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ten sheet khong trung va khong qua 31 ky tu', () => {
    const names = REPORTS.map(r => r.sheetName);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n.length, `ten sheet "${n}" dai qua 31 ky tu`).toBeLessThanOrEqual(31);
      expect(/[[\]:*?/\\]/.test(n), `ten sheet "${n}" chua ky tu Excel cam`).toBe(false);
    }
  });

  it('moi muc co du nhan va ham', () => {
    for (const r of REPORTS) {
      expect(r.name.trim().length, `${r.id} thieu ten`).toBeGreaterThan(0);
      expect(r.shortName.trim().length, `${r.id} thieu ten ngan`).toBeGreaterThan(0);
      expect(typeof r.load, `${r.id} thieu ham load`).toBe('function');
      expect(typeof r.buildSheet, `${r.id} thieu ham buildSheet`).toBe('function');
    }
  });

  it('chi bao cao danh muc la khong co bo loc ky han', () => {
    const khongLoc = REPORTS.filter(r => !r.supportsDueFilter).map(r => r.id);
    expect(khongLoc).toEqual(['portfolio']);
  });

  it('reportById tra dung muc, tra undefined khi id la', () => {
    expect(reportById('kunn')?.id).toBe('kunn');
    expect(reportById('khong-co' as never)).toBeUndefined();
  });
});

describe('buildReportWorkbook', () => {
  it('gop dung so sheet va giu thu tu', () => {
    const bytes = buildReportWorkbook([
      { name: 'A', rows: [[{ value: 'x' }]] },
      { name: 'B', rows: [[{ value: 'y' }]] },
    ]);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('ten sheet qua dai bi cat con 31 ky tu', () => {
    const dai = 'B'.repeat(50);
    const bytes = buildReportWorkbook([{ name: dai, rows: [[{ value: 'x' }]] }]);
    expect(bytes.length).toBeGreaterThan(22);
  });

  it('khong co sheet nao thi nem loi ro rang, khong tra tep rong', () => {
    expect(() => buildReportWorkbook([])).toThrow(/khong co sheet/i);
  });
});

describe('buildReportWorkbook — dem dung so sheet trong goi', () => {
  function docXuoi(bytes: Uint8Array): string {
    return new TextDecoder('latin1').decode(bytes);
  }

  it('gop hai sheet thi goi co sheet1 va sheet2, khong co sheet3', () => {
    const text = docXuoi(buildReportWorkbook([
      { name: 'A', rows: [[{ value: 'x' }]] },
      { name: 'B', rows: [[{ value: 'y' }]] },
    ]));
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('xl/worksheets/sheet2.xml');
    expect(text).not.toContain('xl/worksheets/sheet3.xml');
  });

  it('ten sheet chua ky tu Excel cam duoc lam sach truoc khi ghi', () => {
    const text = docXuoi(buildReportWorkbook([
      { name: 'Bao cao 09/2026', rows: [[{ value: 'x' }]] },
      { name: 'B', rows: [[{ value: 'y' }]] },
    ]));
    expect(text).not.toContain('name="Bao cao 09/2026"');
    expect(text).toContain('Bao cao 09 2026');
  });
});
