// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';
import { emptyCommon } from '../types';
import { htmlToDocx, CONTENT_WIDTH } from '../../../../lib/docxWriter';
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
