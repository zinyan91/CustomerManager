// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';
import { emptyCommon } from '../types';
import { htmlToDocx } from '../../../../lib/docxWriter';
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
