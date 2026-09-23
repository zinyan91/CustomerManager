import { describe, it, expect } from 'vitest';
import { escapeXml, utf8, zipStore, XML_DECL, type ZipEntry } from '../ooxml';

function docXuoi(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('escapeXml — chan ky tu lam vo tep xuat', () => {
  it('thay dung bon ky tu XML nguy hiem', () => {
    expect(escapeXml('a & b')).toBe('a &amp; b');
    expect(escapeXml('<the>')).toBe('&lt;the&gt;');
    expect(escapeXml('noi "trong ngoac"')).toBe('noi &quot;trong ngoac&quot;');
  });

  it('thay & truoc nen khong bi thoat hai lan', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
    expect(escapeXml('A & <B>')).toBe('A &amp; &lt;B&gt;');
  });

  it('giu nguyen dau nhay don — hanh vi hien tai, khong can thoat trong noi dung the', () => {
    expect(escapeXml("Cong ty 'ABC'")).toBe("Cong ty 'ABC'");
  });

  it('giu nguyen tieng Viet co dau', () => {
    expect(escapeXml('Nguyễn Văn Định')).toBe('Nguyễn Văn Định');
  });

  it('chuoi rong tra ve chuoi rong', () => {
    expect(escapeXml('')).toBe('');
  });

  it('ten khach hang co & khong lam vo XML', () => {
    const ten = 'CONG TY TNHH SX & TM MINH LONG';
    const xml = `<w:t>${escapeXml(ten)}</w:t>`;
    expect(xml).toBe('<w:t>CONG TY TNHH SX &amp; TM MINH LONG</w:t>');
    expect(xml.split('&').length - 1).toBe(1);
  });
});

describe('utf8 — ma hoa tieng Viet', () => {
  it('ma hoa roi giai ma lai ra dung chuoi goc', () => {
    const goc = 'Giấy nhận nợ số 01/2026/GNN';
    expect(docXuoi(utf8(goc))).toBe(goc);
  });

  it('chu co dau chiem nhieu hon mot byte', () => {
    expect(utf8('a').length).toBe(1);
    expect(utf8('ấ').length).toBeGreaterThan(1);
  });

  it('chuoi rong cho mang rong', () => {
    expect(utf8('').length).toBe(0);
  });
});

describe('XML_DECL', () => {
  it('khai bao dung chuan UTF-8 standalone', () => {
    expect(XML_DECL).toBe('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  });
});

describe('zipStore — dong goi tep .docx/.xlsx', () => {
  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: utf8(`${XML_DECL}<Types/>`) },
    { name: 'word/document.xml', data: utf8('<w:document/>') },
  ];

  it('bat dau bang chu ky cuc bo PK\\x03\\x04', () => {
    const zip = zipStore(entries);
    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
  });

  it('ket thuc bang ban ghi trung tam PK\\x05\\x06 va dem dung so muc', () => {
    const zip = zipStore(entries);
    const eocd = zip.length - 22;

    expect(zip[eocd]).toBe(0x50);
    expect(zip[eocd + 1]).toBe(0x4b);
    expect(zip[eocd + 2]).toBe(0x05);
    expect(zip[eocd + 3]).toBe(0x06);

    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint16(eocd + 8, true)).toBe(entries.length);
    expect(view.getUint16(eocd + 10, true)).toBe(entries.length);
  });

  it('giu nguyen ten tep va noi dung ben trong goi', () => {
    const zip = zipStore(entries);
    const text = docXuoi(zip);

    expect(text).toContain('[Content_Types].xml');
    expect(text).toContain('word/document.xml');
    expect(text).toContain('<w:document/>');
  });

  it('goi rong van tao duoc cau truc zip hop le', () => {
    const zip = zipStore([]);
    const eocd = zip.length - 22;
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

    expect(zip.length).toBe(22);
    expect(view.getUint16(eocd + 8, true)).toBe(0);
  });

  it('them muc thi goi dai ra', () => {
    const mot = zipStore([entries[0]]);
    const hai = zipStore(entries);
    expect(hai.length).toBeGreaterThan(mot.length);
  });
});
