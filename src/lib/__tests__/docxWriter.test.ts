// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { zipNames, zipPart } from './zipRead';
import {
  parseDocumentHtml, documentXml, paragraphXml, tableXml, buildDocx, htmlToDocx,
  MIME_DOCX, DOCX_FONT, CLAUSE_INDENT, ITEM_INDENT, CONTENT_WIDTH,
  type DocxParagraph, type DocxTable,
} from '../docxWriter';

function readUint32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(at, true);
}

const paragraphs = (blocks: ReturnType<typeof parseDocumentHtml>): DocxParagraph[] =>
  blocks.filter((b): b is DocxParagraph => b.kind === 'p');

const textOf = (p: DocxParagraph): string => p.runs.map(r => (r.lineBreak ? '\n' : r.text)).join('');

describe('parseDocumentHtml — đoạn văn', () => {
  it('đọc h1 thành đoạn giữa, in hoa, 16pt đậm', () => {
    const [p] = paragraphs(parseDocumentHtml('<h1>Hợp đồng thuê nhà</h1>'));
    expect(p.align).toBe('center');
    expect(textOf(p)).toBe('HỢP ĐỒNG THUÊ NHÀ');
    expect(p.runs[0].bold).toBe(true);
    expect(p.runs[0].size).toBe(32);
  });

  it('đọc h2 thành đoạn trái, in hoa, cỡ nền', () => {
    const [p] = paragraphs(parseDocumentHtml('<h2>Điều 1. Đối tượng</h2>'));
    expect(p.align).toBe('left');
    expect(textOf(p)).toBe('ĐIỀU 1. ĐỐI TƯỢNG');
    expect(p.runs[0].size).toBe(26);
  });

  it('clause-p thì lùi dòng đầu và dàn đều hai bên', () => {
    const [p] = paragraphs(parseDocumentHtml('<p class="clause-p">Bên A cho thuê.</p>'));
    expect(p.firstLine).toBe(CLAUSE_INDENT);
    expect(p.align).toBe('justify');
  });

  it('no-indent xoá lùi dòng đầu của clause-p', () => {
    const [p] = paragraphs(parseDocumentHtml('<p class="clause-p no-indent">Bên A.</p>'));
    expect(p.firstLine).toBe(0);
  });

  it('item-p thì thụt cả đoạn, không lùi dòng đầu', () => {
    const [p] = paragraphs(parseDocumentHtml('<p class="item-p">a) Diện tích 80m².</p>'));
    expect(p.left).toBe(ITEM_INDENT);
    expect(p.firstLine).toBe(0);
  });

  it('pt-2 pb-1 cộng thêm khoảng cách trên dưới', () => {
    const [plain] = paragraphs(parseDocumentHtml('<p>A</p>'));
    const [padded] = paragraphs(parseDocumentHtml('<p class="pt-2 pb-1">A</p>'));
    expect(padded.before).toBe((plain.before || 0) + 120);
    expect(padded.after).toBe((plain.after || 0) + 60);
  });

  it('div bọc ngoài truyền canh lề và cỡ chữ xuống các đoạn con', () => {
    const list = paragraphs(parseDocumentHtml(
      '<div class="text-center font-bold"><p>A</p><p>B</p></div>'
    ));
    expect(list).toHaveLength(2);
    for (const p of list) {
      expect(p.align).toBe('center');
      expect(p.runs[0].bold).toBe(true);
    }
  });

  it('strong và em thành đoạn nhiều run', () => {
    const [p] = paragraphs(parseDocumentHtml('<p>Bên <strong>A</strong> và <em>B</em>.</p>'));
    expect(p.runs.map(r => [r.text, !!r.bold, !!r.italic])).toEqual([
      ['Bên ', false, false],
      ['A', true, false],
      [' và ', false, false],
      ['B', false, true],
      ['.', false, false],
    ]);
  });

  it('br thành ngắt dòng trong cùng một đoạn', () => {
    const [p] = paragraphs(parseDocumentHtml('<p>Dòng 1<br/>Dòng 2</p>'));
    expect(textOf(p)).toBe('Dòng 1\nDòng 2');
    expect(p.runs.filter(r => r.lineBreak)).toHaveLength(1);
  });

  it('gộp khoảng trắng thừa nhưng giữ nguyên nbsp và dấu cách cuối trong câu', () => {
    const nbsp = '\u00a0';
    const [p] = paragraphs(parseDocumentHtml(`<p>\n   Tài sản${nbsp}lưu động   là <strong>A</strong></p>`));
    expect(textOf(p)).toBe(`Tài sản${nbsp}lưu động là A`);
  });

  it('text-[11pt] đổi cỡ chữ của run', () => {
    const [p] = paragraphs(parseDocumentHtml('<p class="font-italic text-[11pt]">Ghi chú</p>'));
    expect(p.runs[0].size).toBe(22);
    expect(p.runs[0].italic).toBe(true);
  });

  it('letter-spacing trong style thành spacing của run', () => {
    const [p] = paragraphs(parseDocumentHtml(
      '<p style="letter-spacing: 1px; margin: 2px 0 6px;">CỘNG HÒA</p>'
    ));
    expect(p.runs[0].letterSpacing).toBe(15);
    expect(p.before).toBe(60 + 30);
    expect(p.after).toBe(120 + 90);
  });

  it('margin-left trong style thành thụt lề', () => {
    const [p] = paragraphs(parseDocumentHtml(
      '<p style="margin-left: 24px; text-align: justify;">A</p>'
    ));
    expect(p.left).toBe(360);
    expect(p.align).toBe('justify');
  });

  it('sig-space thành đoạn trống chừa chỗ ký', () => {
    const [p] = paragraphs(parseDocumentHtml('<div class="sig-space"></div>'));
    expect(p.runs).toHaveLength(0);
    expect(p.after).toBe(1500);
    expect(p.spacer).toBe(true);
  });
});

describe('parseDocumentHtml — bảng', () => {
  const html = `
    <table class="table-doc">
      <thead><tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 40%;">Hạng mục</th>
        <th style="width: 55%;">Ghi chú</th>
      </tr></thead>
      <tbody><tr>
        <td>1</td>
        <td>Sửa tường</td>
        <td class="text-right">6.000.000</td>
      </tr>
      <tr><td colspan="2" class="font-bold">Tổng</td><td>6.000.000</td></tr>
      </tbody>
    </table>`;

  it('đọc đủ hàng, kể cả hàng trong thead', () => {
    const [table] = parseDocumentHtml(html) as DocxTable[];
    expect(table.kind).toBe('table');
    expect(table.rows).toHaveLength(3);
    expect(table.bordered).toBe(true);
  });

  it('th mặc định đậm và canh giữa', () => {
    const [table] = parseDocumentHtml(html) as DocxTable[];
    const head = table.rows[0];
    expect(head[0].paragraphs[0].align).toBe('center');
    expect(head[0].paragraphs[0].runs[0].bold).toBe(true);
  });

  it('ô trong bảng dùng cỡ 12pt, không lùi dòng đầu, không giãn đoạn', () => {
    const [table] = parseDocumentHtml(html) as DocxTable[];
    const cell = table.rows[1][1].paragraphs[0];
    expect(cell.runs[0].size).toBe(24);
    expect(cell.firstLine).toBe(0);
    expect(cell.before).toBe(0);
    expect(cell.after).toBe(0);
  });

  it('lấy width phần trăm và colspan', () => {
    const [table] = parseDocumentHtml(html) as DocxTable[];
    expect(table.rows[0].map(c => c.widthPct)).toEqual([5, 40, 55]);
    expect(table.rows[2][0].span).toBe(2);
  });

  it('sig-table không kẻ khung', () => {
    const [table] = parseDocumentHtml(
      '<table class="sig-table font-serif"><tbody><tr><td>BÊN A</td><td>BÊN B</td></tr></tbody></table>'
    ) as DocxTable[];
    expect(table.bordered).toBe(false);
  });

  it('ô rỗng vẫn có một đoạn — Word đòi mỗi ô ít nhất một đoạn', () => {
    const [table] = parseDocumentHtml(
      '<table class="table-doc"><tbody><tr><td></td></tr></tbody></table>'
    ) as DocxTable[];
    expect(table.rows[0][0].paragraphs).toHaveLength(1);
  });

  it('giữ đoạn chừa chỗ ký nằm trong ô của bảng ký', () => {
    const [table] = parseDocumentHtml(
      '<table class="sig-table"><tbody><tr><td>BÊN A<div class="sig-space"></div></td></tr></tbody></table>'
    ) as DocxTable[];
    const spacer = table.rows[0][0].paragraphs.find(p => p.spacer);
    expect(spacer?.after).toBe(1500);
  });
});

describe('paragraphXml', () => {
  it('ghi spacing, ind và jc', () => {
    const xml = paragraphXml({
      kind: 'p',
      runs: [{ text: 'A', bold: true, italic: true, size: 24, letterSpacing: 15 }],
      align: 'justify',
      firstLine: 720,
      left: 280,
      before: 60,
      after: 120,
      line: 360,
    });
    expect(xml).toContain('<w:spacing w:before="60" w:after="120" w:line="360" w:lineRule="auto"/>');
    expect(xml).toContain('<w:ind w:left="280" w:firstLine="720"/>');
    expect(xml).toContain('<w:jc w:val="both"/>');
    expect(xml).toContain('<w:b/><w:bCs/>');
    expect(xml).toContain('<w:i/><w:iCs/>');
    expect(xml).toContain('<w:sz w:val="24"/><w:szCs w:val="24"/>');
  });

  it('mọi run đều có xml:space="preserve"', () => {
    const xml = paragraphXml({ kind: 'p', runs: [{ text: 'Tài sản lưu động ' }] });
    expect(xml).toContain('<w:t xml:space="preserve">Tài sản lưu động </w:t>');
  });

  it('thoát ký tự XML trong nội dung', () => {
    const xml = paragraphXml({ kind: 'p', runs: [{ text: 'A & B < C > "D"' }] });
    expect(xml).toContain('A &amp; B &lt; C &gt; &quot;D&quot;');
  });

  it('ngắt dòng thành w:br', () => {
    const xml = paragraphXml({ kind: 'p', runs: [{ text: '', lineBreak: true }] });
    expect(xml).toContain('<w:r><w:br/></w:r>');
  });

  it('không ghi thẻ rỗng khi đoạn không có định dạng', () => {
    expect(paragraphXml({ kind: 'p', runs: [] })).toBe('<w:p></w:p>');
  });
});

describe('tableXml', () => {
  const table: DocxTable = {
    kind: 'table',
    bordered: true,
    rows: [
      [
        { paragraphs: [{ kind: 'p', runs: [{ text: 'A' }] }], widthPct: 25 },
        { paragraphs: [{ kind: 'p', runs: [{ text: 'B' }] }], widthPct: 75 },
      ],
      [
        { paragraphs: [{ kind: 'p', runs: [{ text: 'C' }] }], span: 2 },
      ],
    ],
  };

  it('rộng hết trang, kẻ khung, ô canh giữa theo chiều dọc', () => {
    const xml = tableXml(table);
    expect(xml).toContain('<w:tblW w:w="5000" w:type="pct"/>');
    expect(xml).toContain('<w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>');
    expect(xml).toContain('<w:vAlign w:val="center"/>');
  });

  it('tblGrid chia theo phần trăm của hàng đầu', () => {
    const xml = tableXml(table);
    expect(xml).toContain(`<w:gridCol w:w="${Math.round(CONTENT_WIDTH * 0.25)}"/>`);
    expect(xml).toContain(`<w:gridCol w:w="${Math.round(CONTENT_WIDTH * 0.75)}"/>`);
  });

  it('tblPr xếp đúng thứ tự lược đồ: tblW, tblBorders, tblLayout, tblCellMar', () => {
    const xml = tableXml(table);
    const order = ['<w:tblW', '<w:tblBorders>', '<w:tblLayout', '<w:tblCellMar>']
      .map(tag => xml.indexOf(tag));
    expect(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]))).toBe(true);
  });

  it('tcPr xếp đúng thứ tự lược đồ: tcW, gridSpan, vAlign', () => {
    const xml = tableXml({
      kind: 'table',
      bordered: true,
      rows: [[{ paragraphs: [{ kind: 'p', runs: [{ text: 'A' }] }], span: 2 }]],
    });
    const order = ['<w:tcW', '<w:gridSpan', '<w:vAlign'].map(tag => xml.indexOf(tag));
    expect(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1]))).toBe(true);
  });

  it('colspan thành gridSpan', () => {
    expect(tableXml(table)).toContain('<w:gridSpan w:val="2"/>');
  });

  it('bảng không kẻ khung thì bỏ tblBorders và canh ô lên trên', () => {
    const xml = tableXml({ ...table, bordered: false });
    expect(xml).not.toContain('<w:tblBorders>');
    expect(xml).toContain('<w:vAlign w:val="top"/>');
  });
});

describe('documentXml', () => {
  it('đặt sectPr A4 lề 25/20/20/30mm ở cuối body', () => {
    const xml = documentXml([]);
    expect(xml).toContain('<w:pgSz w:w="11906" w:h="16838"/>');
    expect(xml).toContain('w:top="1417" w:right="1134" w:bottom="1134" w:left="1701"');
    expect(xml.indexOf('<w:sectPr>')).toBeGreaterThan(xml.indexOf('<w:body>'));
  });

  it('chèn một đoạn trống sau mỗi bảng', () => {
    const xml = documentXml(parseDocumentHtml(
      '<table class="table-doc"><tbody><tr><td>A</td></tr></tbody></table>'
    ));
    expect(xml).toContain('</w:tbl><w:p/>');
  });
});

describe('buildDocx', () => {
  it('gói đủ năm thành phần OOXML', () => {
    expect(zipNames(buildDocx([]))).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'word/document.xml',
      'word/_rels/document.xml.rels',
      'word/styles.xml',
    ]);
  });

  it('khai đúng content type của Word', () => {
    const types = zipPart(buildDocx([]), '[Content_Types].xml');
    expect(types).toContain('wordprocessingml.document.main+xml');
    expect(types).toContain('wordprocessingml.styles+xml');
  });

  it('rels gốc trỏ tới word/document.xml, rels tài liệu trỏ tới styles.xml', () => {
    const zip = buildDocx([]);
    expect(zipPart(zip, '_rels/.rels')).toContain('Target="word/document.xml"');
    expect(zipPart(zip, 'word/_rels/document.xml.rels')).toContain('Target="styles.xml"');
  });

  it('styles.xml đặt Times New Roman 13pt làm mặc định', () => {
    const styles = zipPart(buildDocx([]), 'word/styles.xml');
    expect(styles).toContain(`w:ascii="${DOCX_FONT}"`);
    expect(styles).toContain('<w:sz w:val="26"/>');
  });

  it('mọi thành phần mở đầu bằng khai báo XML', () => {
    const zip = buildDocx([]);
    for (const name of zipNames(zip)) {
      expect(zipPart(zip, name).startsWith('<?xml version="1.0"')).toBe(true);
    }
  });

  it('MIME là của .docx, không phải msword', () => {
    expect(MIME_DOCX).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });
});

describe('htmlToDocx', () => {
  it('đi hết từ HTML biểu mẫu tới ZIP đọc được', () => {
    const zip = htmlToDocx(`
      <h1>Hợp đồng</h1>
      <p class="clause-p">Hôm nay ngày 10/08/2026.</p>
      <table class="table-doc"><tbody><tr><th>STT</th><td>1</td></tr></tbody></table>
      <table class="sig-table"><tbody><tr>
        <td class="text-center font-bold">BÊN A<div class="sig-space"></div>ĐỖ THỊ HIẾU</td>
        <td class="text-center font-bold">BÊN B<div class="sig-space"></div>NGÔ NHỊ ĐẠT</td>
      </tr></tbody></table>`);

    const doc = zipPart(zip, 'word/document.xml');
    expect(doc).toContain('HỢP ĐỒNG');
    expect(doc).toContain('Hôm nay ngày 10/08/2026.');
    expect(doc).toContain('ĐỖ THỊ HIẾU');
    expect(doc.match(/<w:tbl>/g)).toHaveLength(2);
    expect(readUint32(zip, 0)).toBe(0x04034b50);
  });
});

describe('thẻ không phải nội dung không được lọt vào Word', () => {
  function chuCua(html: string): string {
    return parseDocumentHtml(html)
      .flatMap(b => (b.kind === 'p' ? b.runs.map(r => r.text) : []))
      .join('');
  }

  it('nội dung thẻ <style> không thành chữ trong tài liệu', () => {
    const chu = chuCua('<style>.vhtt-doc { font-family: Times; }</style><p>Nội dung thật</p>');
    expect(chu).toContain('Nội dung thật');
    expect(chu).not.toContain('font-family');
  });

  it('<style> lồng trong thẻ inline cũng bị bỏ qua', () => {
    const chu = chuCua('<p><span>Trước <style>.x { color: red; }</style>sau</span></p>');
    expect(chu).not.toContain('color');
    expect(chu).toContain('Trước');
    expect(chu).toContain('sau');
  });

  it('nội dung thẻ <script> cũng không thành chữ', () => {
    expect(chuCua('<script>var a = 1;</script><p>Chữ</p>')).not.toContain('var a');
  });
});

describe('tblGrid tôn trọng độ rộng đã khai khi hàng đầu có ô gộp cột', () => {
  function gridOf(html: string): number[] {
    const t = parseDocumentHtml(html).find(b => b.kind === 'table') as DocxTable;
    return [...tableXml(t).matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]));
  }

  it('ô gộp 2 cột chia đều độ rộng của nó cho 2 cột lưới', () => {
    const g = gridOf(`<table><tr>
      <td style="width: 26%">Nhãn</td><td colspan="2" style="width: 4%">:</td>
      <td style="width: 44%">Giá trị</td><td style="width: 26%">CIF</td>
    </tr></table>`);
    expect(g).toHaveLength(5);
    expect(g[0]).toBe(Math.round(CONTENT_WIDTH * 0.26));
    expect(g[1]).toBe(Math.round(CONTENT_WIDTH * 0.02));
    expect(g[2]).toBe(Math.round(CONTENT_WIDTH * 0.02));
    expect(g[3]).toBe(Math.round(CONTENT_WIDTH * 0.44));
  });

  it('hàng đầu thiếu độ rộng ở một ô thì vẫn chia đều như trước', () => {
    const g = gridOf('<table><tr><td style="width: 30%">A</td><td colspan="2">B</td></tr></table>');
    expect(new Set(g).size).toBe(1);
  });
});

describe('parseDocumentHtml nhận bối cảnh gốc về phông và cỡ chữ', () => {
  const GOC = { font: 'Arial', size: 20, tableSize: 18, titleSize: 24 };
  const runDau = (blocks: ReturnType<typeof parseDocumentHtml>) => {
    const b = blocks[0];
    return b.kind === 'p' ? b.runs[0] : (b as DocxTable).rows[0][0].paragraphs[0].runs[0];
  };

  it('đoạn thân bài dùng phông và cỡ gốc', () => {
    const r = runDau(parseDocumentHtml('<p>Chữ thân bài</p>', GOC));
    expect(r.font).toBe('Arial');
    expect(r.size).toBe(20);
  });

  it('ô bảng dùng cỡ chữ bảng của bối cảnh, vẫn giữ phông gốc', () => {
    const r = runDau(parseDocumentHtml('<table><tr><td>Ô</td></tr></table>', GOC));
    expect(r.font).toBe('Arial');
    expect(r.size).toBe(18);
  });

  it('tiêu đề h1 dùng cỡ tiêu đề của bối cảnh', () => {
    expect(runDau(parseDocumentHtml('<h1>Tiêu đề</h1>', GOC)).size).toBe(24);
  });

  it('không truyền bối cảnh thì giữ nguyên như cũ', () => {
    expect(runDau(parseDocumentHtml('<table><tr><td>Ô</td></tr></table>')).size).toBe(24);
    expect(runDau(parseDocumentHtml('<h1>Tiêu đề</h1>')).size).toBe(32);
  });
});
