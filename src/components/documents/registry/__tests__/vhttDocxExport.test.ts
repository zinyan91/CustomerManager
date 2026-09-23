// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';
import { emptyCommon } from '../types';
import { htmlToDocx, CONTENT_WIDTH, PAGE_WIDTH } from '../../../../lib/docxWriter';
import { VHTT_DOCX_PROFILES } from '../../../../lib/vhttDocxProfiles';
import { zipPart } from '../../../../lib/__tests__/zipRead';

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

  it.each(['single', 'married'])('KH %s: cột nhãn chiếm 26%% khổ', type => {
    expect(luoi(type)[0]).toBe(Math.round(CONTENT_WIDTH * 0.26));
  });

  it('KH tổ chức: cột nhãn chiếm 30% khổ', () => {
    expect(luoi('org')[0]).toBe(Math.round(CONTENT_WIDTH * 0.3));
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
