// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';
import { emptyCommon } from '../types';
import { htmlToDocx, parseDocumentHtml, CONTENT_WIDTH, PAGE_WIDTH, type DocxTable } from '../../../../lib/docxWriter';
import { VHTT_DOCX_PROFILES } from '../../../../lib/vhttDocxProfiles';
import { VHTT_STYLES } from '../templates/vhttStyles';
import { zipPart, zipNames } from '../../../../lib/__tests__/zipRead';

const VHTT = DOSSIERS.find(d => d.id === 'van_hanh_tap_trung')!;

describe('Vận hành tập trung — tệp Word xuất ra không lẫn mã CSS', () => {
  it.each(VHTT.documents.map(d => d.templateId))('%s', id => {
    const t = TEMPLATE_BY_ID[id];
    const bytes = htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults));
    const xml = zipPart(bytes, 'word/document.xml') ?? '';

    expect(xml.length).toBeGreaterThan(0);
    expect(xml).not.toContain('!important');
    expect(xml).not.toContain('font-family');
    expect(xml).not.toContain('.vhtt-doc');
  });
});

describe('BM01 — cột nhãn đủ rộng trong Word, không ngắt "CCCD/CC/Hộ chiếu số"', () => {
  const bm01 = TEMPLATE_BY_ID.bm01_de_nghi_giai_ngan;
  const luoi = (customerType: string) => {
    const xml = zipPart(htmlToDocx(bm01.buildHtml(emptyCommon(), { ...bm01.specificDefaults, customerType })), 'word/document.xml');
    return [...xml.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]));
  };

  it.each(['single', 'married'])('KH %s: cột nhãn chiếm 30%% khổ', type => {
    expect(luoi(type)[0]).toBe(Math.round(CONTENT_WIDTH * 0.3));
  });

  it('KH tổ chức: cột nhãn chiếm 30% khổ', () => {
    expect(luoi('org')[0]).toBe(Math.round(CONTENT_WIDTH * 0.3));
  });
});

describe('BM01 — bảng chuyển khoản / tiền mặt chia cột 32/3/65 như bản gốc, "Bằng chữ" không bị đẩy xuống', () => {
  const bm01 = TEMPLATE_BY_ID.bm01_de_nghi_giai_ngan;
  const luoiBangSoTien = (disbursementMethod: string) => {
    const xml = zipPart(htmlToDocx(bm01.buildHtml(emptyCommon(), { ...bm01.specificDefaults, disbursementMethod })), 'word/document.xml') ?? '';
    const bang = xml.split('<w:tbl>').find(t => t.includes('Bằng chữ')) ?? '';
    return [...bang.matchAll(/<w:gridCol w:w="(\d+)"\/>/g)].map(m => Number(m[1]));
  };

  it.each(['transfer', 'cash'])('%s', method => {
    expect(luoiBangSoTien(method)).toEqual([
      Math.round(CONTENT_WIDTH * 0.32),
      Math.round(CONTENT_WIDTH * 0.03),
      Math.round(CONTENT_WIDTH * 0.65),
    ]);
  });
});

describe('Word Vận hành tập trung khớp bản gốc TB 2097/2026: Arial, cỡ chữ và lề theo từng mẫu', () => {
  const MAU: Record<string, string> = {
    bm01_de_nghi_giai_ngan: 'BM01', bm02_to_trinh_giai_ngan: 'BM02', bm07_bien_ban_ban_giao: 'BM07',
    bm09_danh_muc_ho_so: 'BM09', bm11_tra_no_truoc_han: 'BM11',
  };

  it.each(Object.entries(MAU))('%s dùng Arial và đúng lề của %s', (id, ma) => {
    const t = TEMPLATE_BY_ID[id];
    const bytes = htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults));
    const doc = zipPart(bytes, 'word/document.xml');
    const ftr = zipPart(bytes, 'word/footer1.xml');
    const p = VHTT_DOCX_PROFILES[ma];
    const m = p.margins;

    expect(doc).toContain('w:ascii="Arial"');
    expect(doc).not.toContain('w:ascii="Times New Roman"');
    expect(doc).toContain(`<w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}" w:header="${m.header}" w:footer="${m.footer}" w:gutter="0"/>`);
    expect(ftr).toContain('w:ascii="Arial"');
    expect(ftr).toContain(`<w:tab w:val="right" w:pos="${PAGE_WIDTH - m.left - m.right}"/>`);
  });

  it('biểu mẫu thẻ tín dụng dùng chung khung vhtt nhưng không bị đổi', () => {
    const t = TEMPLATE_BY_ID.cc_to_trinh;
    const doc = zipPart(htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults)), 'word/document.xml');
    expect(doc).not.toContain('w:ascii="Arial"');
  });
});

describe('Phông và cỡ mặc định của tài liệu theo hồ sơ in, để ô trống trong bảng không kéo cao hàng', () => {
  it.each(['bm01_de_nghi_giai_ngan', 'bm09_danh_muc_ho_so'])('%s: styles.xml mặc định Arial 10pt', id => {
    const t = TEMPLATE_BY_ID[id];
    const styles = zipPart(htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults)), 'word/styles.xml');
    expect(styles).toContain('w:ascii="Arial"');
    expect(styles).toContain('<w:sz w:val="20"/>');
    expect(styles).not.toContain('Times New Roman');
  });

  it('tài liệu không có hồ sơ in vẫn giữ mặc định Times New Roman như cũ', () => {
    const t = TEMPLATE_BY_ID.cc_to_trinh;
    expect(zipPart(htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults)), 'word/styles.xml')).toContain('Times New Roman');
  });
});

describe('Đánh số mục như bản gốc TB 2097/2026 (I. / 1. / a. / - / +)', () => {
  const soCua = (id: string, s: object = {}) => {
    const t = TEMPLATE_BY_ID[id];
    const html = t.buildHtml(emptyCommon(), { ...t.specificDefaults, ...s });
    return [...html.matchAll(/<span class="li-num"[^>]*>([^<]*)<\/span>/g)].map(m => m[1]);
  };

  it('BM02 có đủ đề mục La Mã, số và chữ theo thứ tự', () => {
    const so = soCua('bm02_to_trinh_giai_ngan');
    expect(so.filter(x => /^[IVX]+\.$/.test(x))).toEqual(['I.', 'II.']);
    expect(so.filter(x => /^[a-e]\.$/.test(x))).toEqual(['a.', 'b.', 'c.', 'd.', 'e.', 'a.', 'b.']);
  });

  it('BM11 có ba đề mục I, II, III', () => {
    expect(soCua('bm11_tra_no_truoc_han').filter(x => /^[IVX]+\.$/.test(x))).toEqual(['I.', 'II.', 'III.']);
  });

  it('BM01 các dòng cam kết có gạch đầu dòng', () => {
    expect(soCua('bm01_de_nghi_giai_ngan').filter(x => x === '-').length).toBeGreaterThanOrEqual(4);
  });

  it.each(['single', 'married'])('BM01 KH %s: mọi dòng "Ông/Bà" và "CCCD" đều có gạch đầu dòng', customerType => {
    const t = TEMPLATE_BY_ID.bm01_de_nghi_giai_ngan;
    const html = t.buildHtml(emptyCommon(), { ...t.specificDefaults, customerType });
    const nhan = [...html.matchAll(/<p[^>]*>(.*?)(Ông\/Bà|CCCD\/CC\/Hộ chiếu số)<\/p>/g)];
    expect(nhan).toHaveLength(customerType === 'married' ? 4 : 2);
    for (const m of nhan) expect(m[1]).toContain('<span class="li-num" style="width:12pt">-</span>');
  });

  it('trong Word, số thứ tự đứng trước một tab rồi mới tới nội dung', () => {
    const t = TEMPLATE_BY_ID.bm02_to_trinh_giai_ngan;
    const xml = zipPart(htmlToDocx(t.buildHtml(emptyCommon(), t.specificDefaults)), 'word/document.xml');
    expect(xml).toMatch(/<w:t xml:space="preserve">I\.<\/w:t><\/w:r><w:r><w:tab\/><\/w:r>/);
  });
});

describe('BM02: bảng có độ rộng cột và nền tiêu đề như bản gốc', () => {
  const GOC: number[][] = [
    [6, 20, 14, 14, 13, 13, 20],
    [5, 18, 18, 20, 20, 18],
    [5, 12, 14, 11, 10, 8, 12, 7, 10, 11],
    [5, 43, 7, 7, 9, 12, 17],
    [26, 24, 24, 26],
    [8, 51, 20, 20],
    [33, 31, 36],
  ];
  const bangs = () => {
    const t = TEMPLATE_BY_ID.bm02_to_trinh_giai_ngan;
    return parseDocumentHtml(t.buildHtml(emptyCommon(), t.specificDefaults)).filter(b => b.kind === 'table').slice(1) as DocxTable[];
  };

  it('7 bảng kẻ khung có độ rộng cột hàng đầu đúng bản gốc', () => {
    expect(bangs().map(b => b.rows[0].map(c => c.widthPct))).toEqual(GOC);
  });

  it('hàng tiêu đề mọi bảng kẻ khung tô nền xanh nhạt DEEAF6, hàng dữ liệu không tô', () => {
    for (const b of bangs()) {
      expect(b.rows[0].every(c => c.fill === 'DEEAF6')).toBe(true);
      expect(b.rows[1].every(c => c.fill === undefined)).toBe(true);
    }
  });
});

describe('BM02 có logo Vietbank như bản gốc', () => {
  it('logo nằm ở ô trên cùng bên trái, trước dòng Tên TTKD, và có trong tệp Word', () => {
    const t = TEMPLATE_BY_ID.bm02_to_trinh_giai_ngan;
    const html = t.buildHtml(emptyCommon(), t.specificDefaults);
    const iLogo = html.indexOf('data-docx-image="vietbank-logo"');
    expect(iLogo).toBeGreaterThan(-1);
    expect(iLogo).toBeLessThan(html.indexOf('Tên TTKD'));
    const bytes = htmlToDocx(html);
    expect(zipPart(bytes, 'word/document.xml')).toContain('<w:drawing>');
    expect(zipNames(bytes)).toContain('word/media/logo.png');
  });
});

describe('Bản xem trước và in PDF của 5 mẫu dùng Arial 10pt như bản gốc', () => {
  it('CSS có quy tắc riêng cho mẫu mang data-vhtt-form, mẫu thẻ tín dụng không bị đổi', () => {
    expect(VHTT_STYLES).toMatch(/\.vhtt-doc\[data-vhtt-form\][^{]*\{[^}]*font-family:\s*Arial[^}]*font-size:\s*10pt/);
    expect(VHTT_STYLES).toMatch(/\.vhtt-doc \{[^}]*font-family: 'Times New Roman'/);
  });
});
