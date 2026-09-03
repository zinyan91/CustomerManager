// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildDocumentHtml } from '../documentHtml';
import { parseDocumentHtml, documentXml } from '../docxWriter';

describe('sale_contract format and docx output', () => {
  const sampleDraft: any = {
    saleContractDate: '2026-04-09',
    saleBuyerName: 'NGÔ NHỊ ĐẠT',
    saleBuyerAddress: 'Bình Đường, An Bình, Tp. Dĩ An, Bình Dương',
    saleSellerName: 'TRẦN THỊ PHƯƠNG',
    saleSellerCccd: '0791 7802 5859',
    saleSellerCccdDate: '29/11/2021',
    saleSellerCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    salePayMethod: 'cash',
    saleStartDate: '2026-04-09',
    saleEndDate: '2027-04-08',
    salePaymentStage1: '100.000.000',
    saleItems: [
      { id: '1', name: 'Lúa Jasmine 85 vụ Đông Xuân', unit: 'Tấn', quantity: 25, price: 8500000 },
      { id: '2', name: 'Lúa Đài Thơm 8 vụ Hè Thu', unit: 'Tấn', quantity: 30, price: 8200000 },
    ],
  };

  it('renders clean HTML and proper paragraph styles', () => {
    const html = buildDocumentHtml('sale_contract', sampleDraft);
    const blocks = parseDocumentHtml(html);

    // Check table of signatures
    const tables = blocks.filter(b => b.kind === 'table');
    expect(tables.length).toBe(2);

    const sigTable = tables[1];
    expect(sigTable.bordered).toBe(false);
    // Signature cells should be centered
    for (const row of sigTable.rows) {
      for (const cell of row) {
        for (const p of cell.paragraphs) {
          if (p.runs.length > 0) {
            expect(p.align).toBe('center');
          }
        }
      }
    }

    // Check clauses in Dieu 5, 6, 7, 8 are bullet points flush with left margin (firstLine = 0)
    const textBlocks = blocks.filter(b => b.kind === 'p');
    const dieu5P = textBlocks.find(p => p.runs.some(r => r.text.includes('Bên Bán chịu trách nhiệm')));
    expect(dieu5P).toBeDefined();
    expect(dieu5P?.firstLine).toBe(0);
    expect(dieu5P?.runs[0].text.startsWith('-')).toBe(true);

    const dieu6P = textBlocks.find(p => p.runs.some(r => r.text.includes('chi phí vận chuyển')));
    expect(dieu6P).toBeDefined();
    expect(dieu6P?.firstLine).toBe(0);
    expect(dieu6P?.runs[0].text.startsWith('-')).toBe(true);

    const dieu7P = textBlocks.find(p => p.runs.some(r => r.text.includes('Khi các Bên thực hiện xong')));
    expect(dieu7P).toBeDefined();
    expect(dieu7P?.firstLine).toBe(0);
    expect(dieu7P?.runs[0].text.startsWith('-')).toBe(true);

    const dieu8P = textBlocks.find(p => p.runs.some(r => r.text.includes('Hợp đồng này có hiệu lực')));
    expect(dieu8P).toBeDefined();
    expect(dieu8P?.firstLine).toBe(0);
    expect(dieu8P?.runs[0].text.startsWith('-')).toBe(true);

    // Verify XML output
    const xml = documentXml(blocks);
    expect(xml).toContain('<w:cantSplit/>');
    expect(xml).toContain('ĐẠI DIỆN BÊN BÁN');
    expect(xml).toContain('TRẦN THỊ PHƯƠNG');
  });
});
