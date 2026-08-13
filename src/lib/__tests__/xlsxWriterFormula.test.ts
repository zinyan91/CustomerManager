import { describe, it, expect } from 'vitest';
import { sheetXml, type XlsxSheet } from '../xlsxWriter';

describe('xlsxWriter formula support', () => {
  it('should render formula cells correctly with cached numeric values', () => {
    const sheet: XlsxSheet = {
      name: 'TestSheet',
      rows: [
        [
          { value: 'Item', style: { bold: true } },
          { value: 'Amount', style: { bold: true } },
        ],
        [
          { value: 'A' },
          { value: 100, numeric: true },
        ],
        [
          { value: 'B' },
          { value: 200, numeric: true },
        ],
        [
          { value: 'Total' },
          { value: 300, numeric: true, formula: 'SUM(B2:B3)' },
        ],
      ],
    };

    const xml = sheetXml(sheet);
    expect(xml).toContain('<f>SUM(B2:B3)</f>');
    expect(xml).toContain('<v>300</v>');
  });

  it('should render formula cells without numeric flag', () => {
    const sheet: XlsxSheet = {
      name: 'TestSheet',
      rows: [
        [
          { value: 'Result', formula: 'CONCATENATE("Hello ", "World")' },
        ],
      ],
    };

    const xml = sheetXml(sheet);
    expect(xml).toContain('<f>CONCATENATE(&quot;Hello &quot;, &quot;World&quot;)</f>');
  });
});
