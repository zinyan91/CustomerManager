// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { htmlToDocx, parseDocumentHtml } from '../docxWriter';
import { BM04_FONT, BM04_FOOTER_TEXT, BM04_LOGO_CX, BM04_LOGO_CY } from '../bm04CommitmentDocx';
import { bm04LogoBytes } from '../bm04Logo';

const HTML_CO_BM04 = `
  <h1>HỢP ĐỒNG MUA BÁN</h1>
  <p class="clause-p">Nội dung hợp đồng.</p>
  <div data-doc-section="bm04">
    <p class="text-center no-indent font-bold text-[14pt]">GIẤY CAM KẾT</p>
    <p class="no-indent font-bold">BÊN CAM KẾT</p>
    <p class="bm04-fill">Tôi tên là: TRẦN THỊ NGỌC HIỀN</p>
    <p class="bm04-bullet">- Tôi không có tài khoản thanh toán tại bất kỳ tổ chức cung ứng dịch vụ thanh toán nào.</p>
  </div>
`;

const HTML_KHONG_BM04 = `
  <h1>HỢP ĐỒNG MUA BÁN</h1>
  <p class="clause-p">Nội dung hợp đồng.</p>
`;

const nhuLatin1 = (text: string) =>
  new TextDecoder('latin1').decode(new TextEncoder().encode(text));

const docLa = (bytes: Uint8Array) => {
  const s = new TextDecoder('latin1').decode(bytes);
  return {
    co: (ten: string) => s.includes(nhuLatin1(ten)),
    chuoi: s,
  };
};

describe('parseDocumentHtml — khối BM04', () => {
  it('chèn ngắt section trước giấy cam kết', () => {
    const blocks = parseDocumentHtml(HTML_CO_BM04);
    const at = blocks.findIndex(b => b.kind === 'sect');
    expect(at).toBeGreaterThan(0);
  });

  it('không có khối BM04 thì không có ngắt section', () => {
    expect(parseDocumentHtml(HTML_KHONG_BM04).some(b => b.kind === 'sect')).toBe(false);
  });

  it('chữ trong giấy cam kết mang phông Arial Unicode MS', () => {
    const blocks = parseDocumentHtml(HTML_CO_BM04);
    const at = blocks.findIndex(b => b.kind === 'sect');
    const sau = blocks.slice(at + 1);
    const runs = sau.flatMap(b => (b.kind === 'p' ? b.runs : []));
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every(r => r.font === BM04_FONT)).toBe(true);
  });

  it('chữ trong hợp đồng KHÔNG bị đổi phông', () => {
    const blocks = parseDocumentHtml(HTML_CO_BM04);
    const at = blocks.findIndex(b => b.kind === 'sect');
    const truoc = blocks.slice(0, at);
    const runs = truoc.flatMap(b => (b.kind === 'p' ? b.runs : []));
    expect(runs.every(r => r.font === undefined)).toBe(true);
  });
});

describe('htmlToDocx — gói tài liệu có giấy cam kết', () => {
  const bytes = htmlToDocx(HTML_CO_BM04);
  const goi = docLa(bytes);

  it('có đủ phần đầu trang, chân trang và ảnh', () => {
    expect(goi.co('word/header1.xml')).toBe(true);
    expect(goi.co('word/footer1.xml')).toBe(true);
    expect(goi.co('word/media/image1.png')).toBe(true);
    expect(goi.co('word/_rels/header1.xml.rels')).toBe(true);
  });

  it('khai báo kiểu nội dung cho header, footer và png', () => {
    expect(goi.co('wordprocessingml.header+xml')).toBe(true);
    expect(goi.co('wordprocessingml.footer+xml')).toBe(true);
    expect(goi.co('Extension="png"')).toBe(true);
  });

  it('chân trang giữ nguyên mã biểu mẫu bản gốc', () => {
    expect(goi.co(BM04_FOOTER_TEXT)).toBe(true);
    expect(goi.co('PAGE   \\* MERGEFORMAT')).toBe(true);
    expect(goi.co('NUMPAGES   \\* MERGEFORMAT')).toBe(true);
  });

  it('lề trang giấy cam kết là 1440 đều bốn phía, khác lề hợp đồng', () => {
    expect(goi.co('w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"')).toBe(true);
    expect(goi.co('w:top="1417"')).toBe(true);
  });

  it('logo giữ đúng kích thước bản gốc', () => {
    expect(goi.co(`cx="${BM04_LOGO_CX}" cy="${BM04_LOGO_CY}"`)).toBe(true);
  });

  it('nhúng đúng bytes ảnh gốc, không nén lại', () => {
    const logo = bm04LogoBytes();
    expect(logo.length).toBe(6977);
    expect(Array.from(logo.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const dau = new TextDecoder('latin1').decode(logo.slice(0, 16));
    expect(goi.chuoi.includes(dau)).toBe(true);
  });
});

describe('htmlToDocx — tài liệu không kèm giấy cam kết', () => {
  it('không sinh đầu trang, chân trang hay ảnh', () => {
    const goi = docLa(htmlToDocx(HTML_KHONG_BM04));
    expect(goi.co('word/header1.xml')).toBe(false);
    expect(goi.co('word/footer1.xml')).toBe(false);
    expect(goi.co('word/media/')).toBe(false);
  });
});
