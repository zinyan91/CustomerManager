import { describe, it, expect } from 'vitest';
import { zipNames, zipPart } from './zipRead';
import {
  buildPptx, slideXml, tableXml, paragraphXml, presentationXml, contentTypesXml,
  MIME_PPTX, SLIDE_WIDE, SLIDE_CLASSIC, MARGIN_X, TITLE_SIZE, BODY_SIZE, TABLE_SIZE,
  type PptxDeck,
} from '../pptxWriter';
import { PPTX_FONT } from '../pptxTheme';

const deck: PptxDeck = {
  slides: [
    { title: 'Phương án kinh doanh', subtitle: 'Trình ngày 10/08/2026' },
    {
      title: 'Ba giới hạn của vay từng lần',
      bullets: [
        { text: 'Nhu cầu vốn của phương án', bold: true },
        { text: 'Tỷ lệ cho vay theo sản phẩm', level: 1 },
        { text: 'Khả năng bảo đảm của tài sản', level: 1 },
      ],
    },
    {
      title: 'Bảng dự toán',
      table: {
        headerRow: true,
        rows: [
          ['STT', 'Hạng mục', 'Thành tiền'],
          ['1', 'Sửa chữa tường', '219.000.000'],
          ['2', 'Thay gạch lát nền', '219.000.000'],
        ],
        colWidths: [10, 60, 30],
      },
    },
  ],
};

describe('paragraphXml', () => {
  it('đặt cỡ chữ theo phần trăm điểm và ghim phông Times', () => {
    const xml = paragraphXml('Xin chào', 18);
    expect(xml).toContain('sz="1800"');
    expect(xml).toContain(`<a:latin typeface="${PPTX_FONT}"/>`);
    expect(xml).toContain('<a:t>Xin chào</a:t>');
  });

  it('mặc định không dấu đầu dòng, bật lên thì có buChar', () => {
    expect(paragraphXml('A', 18)).toContain('<a:buNone/>');
    expect(paragraphXml('A', 18, { bullet: true })).toContain('<a:buChar char="•"/>');
  });

  it('cấp bậc và canh lề vào pPr', () => {
    const xml = paragraphXml('A', 18, { level: 2, align: 'ctr' });
    expect(xml).toContain('lvl="2"');
    expect(xml).toContain('algn="ctr"');
  });

  it('in đậm bằng b="1"', () => {
    expect(paragraphXml('A', 18, { bold: true })).toContain('b="1"');
    expect(paragraphXml('A', 18)).not.toContain('b="1"');
  });

  it('thoát ký tự XML trong nội dung', () => {
    expect(paragraphXml('A & B < C', 18)).toContain('A &amp; B &lt; C');
  });

  it('đoạn rỗng không sinh run', () => {
    expect(paragraphXml('', 18)).not.toContain('<a:r>');
  });
});

describe('slideXml', () => {
  it('slide tiêu đề dùng cỡ 32, căn giữa, hộp chữ neo giữa', () => {
    const xml = slideXml(deck.slides[0], SLIDE_WIDE);
    expect(xml).toContain(`sz="${TITLE_SIZE * 100}"`);
    expect(xml).toContain('anchor="ctr"');
    expect(xml).toContain('Trình ngày 10/08/2026');
  });

  it('gạch đầu dòng giữ đúng cấp bậc', () => {
    const xml = slideXml(deck.slides[1], SLIDE_WIDE);
    expect(xml).toContain(`sz="${BODY_SIZE * 100}"`);
    expect(xml).toContain('lvl="1"');
    expect((xml.match(/<a:buChar/g) || []).length).toBe(3);
  });

  it('hộp chữ thụt lề hai bên theo MARGIN_X', () => {
    const xml = slideXml(deck.slides[1], SLIDE_WIDE);
    expect(xml).toContain(`<a:off x="${MARGIN_X}"`);
    expect(xml).toContain(`<a:ext cx="${SLIDE_WIDE.cx - MARGIN_X * 2}"`);
  });

  it('slide bảng sinh graphicFrame với đúng số cột và hàng', () => {
    const xml = slideXml(deck.slides[2], SLIDE_WIDE);
    expect((xml.match(/<a:gridCol /g) || []).length).toBe(3);
    expect((xml.match(/<a:tr /g) || []).length).toBe(3);
    expect((xml.match(/<a:tc>/g) || []).length).toBe(9);
  });

  it('mã hình trong một slide không lặp — PowerPoint đòi id duy nhất', () => {
    const xml = slideXml(
      { title: 'T', bullets: [{ text: 'B' }], table: { rows: [['x']] } },
      SLIDE_WIDE
    );
    const ids = [...xml.matchAll(/<p:cNvPr id="(\d+)"/g)].map(m => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('slide không tiêu đề thì nội dung dồn lên trên', () => {
    const withTitle = slideXml({ title: 'T', bullets: [{ text: 'B' }] }, SLIDE_WIDE);
    const without = slideXml({ bullets: [{ text: 'B' }] }, SLIDE_WIDE);
    expect(without).not.toContain('Tiêu đề');
    expect(without.length).toBeLessThan(withTitle.length);
  });
});

describe('tableXml', () => {
  const box = { x: 0, y: 0, cx: 9000000, cy: 3000000 };

  it('chia cột theo tỷ lệ colWidths, tổng bằng bề rộng hộp', () => {
    const xml = tableXml(5, box, { rows: [['a', 'b']], colWidths: [25, 75] });
    const widths = [...xml.matchAll(/<a:gridCol w="(\d+)"\/>/g)].map(m => Number(m[1]));
    expect(widths).toEqual([2250000, 6750000]);
    expect(widths.reduce((s, w) => s + w, 0)).toBe(box.cx);
  });

  it('không khai colWidths thì chia đều', () => {
    const xml = tableXml(5, box, { rows: [['a', 'b', 'c']] });
    const widths = [...xml.matchAll(/<a:gridCol w="(\d+)"\/>/g)].map(m => Number(m[1]));
    expect(new Set(widths).size).toBe(1);
  });

  it('hàng thiếu ô thì bù ô rỗng — bảng lệch cột là bảng Word/PowerPoint từ chối', () => {
    const xml = tableXml(5, box, { rows: [['a', 'b', 'c'], ['x']] });
    expect((xml.match(/<a:tc>/g) || []).length).toBe(6);
  });

  it('hàng đầu in đậm khi bật headerRow', () => {
    const withHeader = tableXml(5, box, { rows: [['a'], ['b']], headerRow: true });
    expect((withHeader.match(/b="1"/g) || []).length).toBe(1);
    const plain = tableXml(5, box, { rows: [['a'], ['b']] });
    expect(plain).not.toContain('b="1"');
  });

  it('ô bảng dùng cỡ 12 và kẻ khung bốn phía', () => {
    const xml = tableXml(5, box, { rows: [['a']] });
    expect(xml).toContain(`sz="${TABLE_SIZE * 100}"`);
    for (const side of ['lnL', 'lnR', 'lnT', 'lnB']) {
      expect(xml).toContain(`<a:${side} w="12700">`);
    }
  });
});

describe('presentationXml', () => {
  it('khai đủ sldId, mỗi slide một quan hệ, bắt đầu từ rId2', () => {
    const xml = presentationXml(3, SLIDE_WIDE);
    expect(xml).toContain('<p:sldId id="256" r:id="rId2"/>');
    expect(xml).toContain('<p:sldId id="258" r:id="rId4"/>');
    expect(xml).toContain('<p:sldMasterId id="2147483648" r:id="rId1"/>');
  });

  it('khổ 16:9 mặc định, 4:3 khi tắt widescreen', () => {
    expect(presentationXml(1, SLIDE_WIDE)).toContain('cx="12192000" cy="6858000"');
    expect(presentationXml(1, SLIDE_CLASSIC)).toContain('cx="9144000" cy="6858000"');
  });
});

describe('buildPptx', () => {
  it('gói đủ thành phần bắt buộc của một tệp PowerPoint', () => {
    const names = zipNames(buildPptx(deck));
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'ppt/presentation.xml',
      'ppt/_rels/presentation.xml.rels',
      'ppt/theme/theme1.xml',
      'ppt/slideMasters/slideMaster1.xml',
      'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      'ppt/slideLayouts/slideLayout1.xml',
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      'ppt/slides/slide1.xml',
      'ppt/slides/_rels/slide1.xml.rels',
      'ppt/slides/slide3.xml',
    ]) {
      expect(names).toContain(part);
    }
  });

  it('mỗi slide có đúng một tệp và một tệp quan hệ', () => {
    const names = zipNames(buildPptx(deck));
    expect(names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(3);
    expect(names.filter(n => /^ppt\/slides\/_rels\//.test(n))).toHaveLength(3);
  });

  it('content types khai từng slide một dòng Override', () => {
    const types = contentTypesXml(3);
    expect((types.match(/presentationml\.slide\+xml/g) || []).length).toBe(3);
    expect(types).toContain('presentationml.presentation.main+xml');
    expect(types).toContain('openxmlformats-officedocument.theme+xml');
  });

  it('slideMaster trỏ tới layout và theme, layout trỏ ngược về master', () => {
    const zip = buildPptx(deck);
    const masterRels = zipPart(zip, 'ppt/slideMasters/_rels/slideMaster1.xml.rels');
    expect(masterRels).toContain('../slideLayouts/slideLayout1.xml');
    expect(masterRels).toContain('../theme/theme1.xml');
    expect(zipPart(zip, 'ppt/slideLayouts/_rels/slideLayout1.xml.rels'))
      .toContain('../slideMasters/slideMaster1.xml');
  });

  it('theme khai đủ 12 màu, hai phông và ba nhóm định dạng', () => {
    const theme = zipPart(buildPptx(deck), 'ppt/theme/theme1.xml');
    expect((theme.match(/<a:(dk1|lt1|dk2|lt2|accent[1-6]|hlink|folHlink)>/g) || []).length).toBe(12);
    expect(theme).toContain('<a:majorFont>');
    expect(theme).toContain('<a:minorFont>');
    for (const list of ['fillStyleLst', 'lnStyleLst', 'effectStyleLst', 'bgFillStyleLst']) {
      expect(theme).toContain(`<a:${list}>`);
    }
  });

  it('bộ slide rỗng vẫn ra tệp mở được — một slide trắng', () => {
    const names = zipNames(buildPptx({ slides: [] }));
    expect(names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))).toHaveLength(1);
  });

  it('mọi thành phần mở đầu bằng khai báo XML', () => {
    const zip = buildPptx(deck);
    for (const name of zipNames(zip)) {
      expect(zipPart(zip, name).startsWith('<?xml version="1.0"')).toBe(true);
    }
  });

  it('MIME đúng của .pptx', () => {
    expect(MIME_PPTX).toBe(
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
  });

  it('nội dung slide đi vào đúng tệp slide', () => {
    const zip = buildPptx(deck);
    expect(zipPart(zip, 'ppt/slides/slide1.xml')).toContain('Phương án kinh doanh');
    expect(zipPart(zip, 'ppt/slides/slide2.xml')).toContain('Khả năng bảo đảm của tài sản');
    expect(zipPart(zip, 'ppt/slides/slide3.xml')).toContain('219.000.000');
  });
});
