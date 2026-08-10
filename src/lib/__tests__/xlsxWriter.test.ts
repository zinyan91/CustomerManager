import { describe, it, expect } from 'vitest';
import {
  buildXlsx, zipStore, sheetXml, columnLetter, escapeXml, sanitizeSheetName, MIME_XLSX,
  buildStyleSheet, styleKey, BASE_FONT,
} from '../xlsxWriter';

const enc = new TextEncoder();
const dec = new TextDecoder();

function readUint32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(at, true);
}

describe('columnLetter', () => {
  it('đếm cột theo kiểu Excel', () => {
    expect(columnLetter(0)).toBe('A');
    expect(columnLetter(5)).toBe('F');
    expect(columnLetter(25)).toBe('Z');
    expect(columnLetter(26)).toBe('AA');
    expect(columnLetter(27)).toBe('AB');
    expect(columnLetter(51)).toBe('AZ');
    expect(columnLetter(52)).toBe('BA');
  });
});

describe('escapeXml', () => {
  it('thoát ký tự phá cấu trúc XML', () => {
    expect(escapeXml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
  });
});

describe('sanitizeSheetName', () => {
  it('cắt còn 31 ký tự và bỏ ký tự Excel cấm', () => {
    expect(sanitizeSheetName('TINH HINH TAI CHINH')).toBe('TINH HINH TAI CHINH');
    expect(sanitizeSheetName('a/b\\c?d*e[f]g:h')).toBe('a b c d e f g h');
    expect(sanitizeSheetName('x'.repeat(40))).toHaveLength(31);
  });

  it('rỗng thì có tên mặc định, không để trống', () => {
    expect(sanitizeSheetName('')).toBe('Sheet1');
    expect(sanitizeSheetName('   ')).toBe('Sheet1');
  });
});

describe('sheetXml', () => {
  const xml = sheetXml({
    name: 'S',
    rows: [
      [{ value: 'STT' }, { value: 'Khoảng mục' }, { value: 'Tăng/giảm ' }],
      [{ value: '1' }, { value: 'Tài sản lưu động ' }, { value: 1200, numeric: true }],
    ],
  });

  it('số ghi thành ô số, không phải chuỗi', () => {
    expect(xml).toContain('<c r="C2"><v>1200</v></c>');
  });

  it('chữ ghi thành chuỗi nội tuyến', () => {
    expect(xml).toContain('t="inlineStr"');
    expect(xml).toContain('<t xml:space="preserve">Khoảng mục</t>');
  });

  it('giữ nguyên khoảng trắng cuối và ký tự không ngắt dòng', () => {
    expect(xml).toContain('<t xml:space="preserve">Tài sản lưu động </t>');
    expect(xml).toContain('Tăng/giảm ');
  });

  it('đánh đúng địa chỉ ô theo hàng và cột', () => {
    expect(xml).toContain('<row r="1">');
    expect(xml).toContain('r="A1"');
    expect(xml).toContain('r="B1"');
    expect(xml).toContain('<row r="2">');
  });

  it('bỏ hẳn ô rỗng thay vì ghi ô trắng', () => {
    const trong = sheetXml({ name: 'S', rows: [[{ value: 'A' }, { value: '' }, { value: 'C' }]] });
    expect(trong).toContain('r="A1"');
    expect(trong).not.toContain('r="B1"');
    expect(trong).toContain('r="C1"');
  });

  it('bỏ ô số không hợp lệ thay vì ghi NaN vào file', () => {
    const xau = sheetXml({ name: 'S', rows: [[{ value: 'x', numeric: true }]] });
    expect(xau).not.toContain('NaN');
    expect(xau).toBe(xau.replace(/<c [^>]*>.*<\/c>/, ''));
  });
});

describe('zipStore', () => {
  const zip = zipStore([{ name: 'a.txt', data: enc.encode('xin chào') }]);

  it('bắt đầu bằng chữ ký ZIP để Excel nhận đúng định dạng', () => {
    expect(readUint32(zip, 0)).toBe(0x04034b50);
  });

  it('kết thúc bằng bản ghi cuối thư mục trung tâm', () => {
    const eocdAt = zip.length - 22;
    expect(readUint32(zip, eocdAt)).toBe(0x06054b50);
  });

  it('kích thước nén bằng kích thước gốc vì không nén', () => {
    const raw = enc.encode('xin chào').length;
    expect(readUint32(zip, 18)).toBe(raw);
    expect(readUint32(zip, 22)).toBe(raw);
  });

  it('giữ nguyên nội dung tệp bên trong', () => {
    const nameLen = zip[26] + (zip[27] << 8);
    const start = 30 + nameLen;
    expect(dec.decode(zip.slice(start, start + enc.encode('xin chào').length))).toBe('xin chào');
  });

  it('CRC32 khác 0 và ổn định giữa các lần dựng', () => {
    const lai = zipStore([{ name: 'a.txt', data: enc.encode('xin chào') }]);
    expect(readUint32(zip, 14)).not.toBe(0);
    expect(readUint32(lai, 14)).toBe(readUint32(zip, 14));
  });
});

describe('buildStyleSheet', () => {
  const rows = [
    [{ value: 'STT', style: { bold: true, align: 'center' as const, fill: 'DCE6F1' } }],
    [{ value: 1, numeric: true, style: { numFmt: '#,##0', align: 'right' as const } }],
    [{ value: 'con', style: { italic: true } }],
    [{ value: 'dai', style: { wrap: true } }],
  ];
  const st = buildStyleSheet(rows);

  it('mọi ô có định dạng đều được kẻ khung', () => {
    expect(st.xml).toContain('<border><left style="thin">');
    expect(st.xml).toContain('applyBorder="1"');
  });

  it('dùng phông chữ chuẩn cho hồ sơ tín dụng', () => {
    expect(st.xml).toContain(`<name val="${BASE_FONT}"/>`);
    expect(BASE_FONT).toBe('Times New Roman');
  });

  it('đăng ký định dạng số tuỳ biến bắt đầu từ mã 164', () => {
    expect(st.xml).toContain('<numFmt numFmtId="164" formatCode="#,##0"/>');
  });

  it('có in đậm, in nghiêng và nền tô cho dòng tiêu đề', () => {
    expect(st.xml).toContain('<b/>');
    expect(st.xml).toContain('<i/>');
    expect(st.xml).toContain('<fgColor rgb="FFDCE6F1"/>');
  });

  it('ô không khai định dạng thì dùng kiểu mặc định số 0', () => {
    expect(st.indexFor(undefined)).toBe(0);
    expect(st.indexFor({})).toBe(0);
  });

  it('cùng một kiểu chỉ đăng ký một lần', () => {
    const trung = buildStyleSheet([
      [{ value: 'a', style: { bold: true } }, { value: 'b', style: { bold: true } }],
    ]);
    expect(trung.xml).toContain('<cellXfs count="2">');
  });

  it('khoá kiểu phân biệt được từng thuộc tính', () => {
    expect(styleKey({ bold: true })).not.toBe(styleKey({ italic: true }));
    expect(styleKey({ numFmt: '#,##0' })).not.toBe(styleKey({ numFmt: '0%' }));
    expect(styleKey(undefined)).toBe('');
  });
});

describe('sheetXml với định dạng', () => {
  it('ghi độ rộng từng cột trước phần dữ liệu', () => {
    const xml = sheetXml({ name: 'S', rows: [[{ value: 'a' }]], colWidths: [5, 30] });
    expect(xml).toContain('<col min="1" max="1" width="5" customWidth="1"/>');
    expect(xml).toContain('<col min="2" max="2" width="30" customWidth="1"/>');
    expect(xml.indexOf('<cols>')).toBeLessThan(xml.indexOf('<sheetData>'));
  });

  it('gắn chỉ số kiểu vào từng ô', () => {
    const rows = [[{ value: 'a', style: { bold: true } }]];
    const st = buildStyleSheet(rows);
    expect(sheetXml({ name: 'S', rows }, st.indexFor)).toContain('s="1"');
  });

  it('ô rỗng vẫn giữ khung khi có kiểu, để bảng không thủng', () => {
    const rows = [[{ value: '', style: { bold: false, align: 'left' as const } }]];
    const st = buildStyleSheet(rows);
    expect(sheetXml({ name: 'S', rows }, st.indexFor)).toContain('<c r="A1" s="1"/>');
  });
});

describe('buildXlsx', () => {
  const bytes = buildXlsx({
    name: 'KET QUA KINH DOANH',
    rows: [[{ value: 'STT' }], [{ value: 1, numeric: true }]],
  });

  it('là một tệp ZIP hợp lệ', () => {
    expect(readUint32(bytes, 0)).toBe(0x04034b50);
    expect(readUint32(bytes, bytes.length - 22)).toBe(0x06054b50);
  });

  it('chứa đủ sáu thành phần bắt buộc của một workbook có định dạng', () => {
    const text = dec.decode(bytes);
    ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']
      .forEach(part => expect(text).toContain(part));
  });

  it('khai báo styles.xml ở cả bảng kiểu nội dung lẫn quan hệ workbook', () => {
    const text = dec.decode(bytes);
    expect(text).toContain('spreadsheetml.styles+xml');
    expect(text).toContain('relationships/styles');
  });

  it('khai đúng kiểu nội dung của workbook', () => {
    expect(dec.decode(bytes)).toContain('spreadsheetml.sheet.main+xml');
  });

  it('kiểu MIME khai đúng chuẩn xlsx, không phải ms-excel cũ', () => {
    expect(MIME_XLSX).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
