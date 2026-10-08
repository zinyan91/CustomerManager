import { describe, expect, it } from 'vitest';
import { applyDrawingMarkers, markDrawings, readDrawing } from '../writer/utils/docxDrawings';

const anchor = (wrap: string, horizontal: string, extra = '') =>
  `<wp:anchor behindDoc="0" ${extra}><wp:positionH relativeFrom="column">${horizontal}</wp:positionH><wp:extent cx="1905000" cy="952500"/>${wrap}<wp:docPr id="1" name="P"/></wp:anchor>`;

describe('how a drawing in a .docx sits in the text', () => {
  it('reads its size in pixels', () => {
    expect(readDrawing('inline', '<wp:extent cx="952500" cy="476250"/>')).toEqual({ width: 100, height: 50, float: null });
  });

  it('floats an anchored picture with square, tight or through wrapping to the side Word aligns it to', () => {
    for (const wrap of ['<wp:wrapSquare wrapText="bothSides"/>', '<wp:wrapTight wrapText="left"/>', '<wp:wrapThrough/>']) {
      expect(readDrawing('anchor', anchor(wrap, '<wp:align>left</wp:align>'))?.float).toBe('left');
      expect(readDrawing('anchor', anchor(wrap, '<wp:align>right</wp:align>'))?.float).toBe('right');
    }
  });

  it('puts an offset picture on the side its centre is on', () => {
    const wrap = '<wp:wrapSquare wrapText="bothSides"/>';
    expect(readDrawing('anchor', anchor(wrap, '<wp:posOffset>95250</wp:posOffset>'))?.float).toBe('left');
    expect(readDrawing('anchor', anchor(wrap, '<wp:posOffset>4000000</wp:posOffset>'))?.float).toBe('right');
  });

  it('leaves a picture that does not wrap beside text as a block of its own', () => {
    const left = '<wp:align>left</wp:align>';
    expect(readDrawing('anchor', anchor('<wp:wrapTopAndBottom/>', left))?.float).toBeNull();
    expect(readDrawing('anchor', anchor('<wp:wrapNone/>', left))?.float).toBeNull();
    expect(readDrawing('anchor', anchor('<wp:wrapSquare wrapText="bothSides"/>', left, 'x="1"').replace('behindDoc="0"', 'behindDoc="1"'))?.float).toBeNull();
    expect(readDrawing('anchor', anchor('<wp:wrapSquare wrapText="bothSides"/>', '<wp:align>center</wp:align>'))?.float).toBeNull();
  });
});

describe('the marker that carries it through mammoth', () => {
  const xml = `<w:p><w:r><w:drawing>${anchor('<wp:wrapSquare wrapText="bothSides"/>', '<wp:align>right</wp:align>')}</w:drawing></w:r></w:p>`;

  it('is added to the description and read back as attributes, restoring the alt text', () => {
    const marked = markDrawings(xml);
    expect(marked).toContain('descr="felix-img:w=200,h=100,f=right|"');
    expect(applyDrawingMarkers('<p><img src="data:x" alt="felix-img:w=200,h=100,f=right|"/></p>')).toBe('<p><img width="200" data-float="right" src="data:x"/></p>');
    expect(applyDrawingMarkers('<img src="data:x" alt="felix-img:w=64,h=64|Logo | công ty"/>')).toBe('<img width="64" src="data:x" alt="Logo | công ty"/>');
  });

  it('keeps a description the picture already had', () => {
    const described = xml.replace('<wp:docPr id="1" name="P"/>', '<wp:docPr id="1" name="P" descr="Logo"/>');
    expect(markDrawings(described)).toContain('descr="felix-img:w=200,h=100,f=right|Logo"');
  });

  it('leaves other images and XML without drawings alone', () => {
    expect(applyDrawingMarkers('<img src="data:x" alt="A cat"/>')).toBe('<img src="data:x" alt="A cat"/>');
    expect(markDrawings('<w:p><w:r><w:t>text</w:t></w:r></w:p>')).toBe('<w:p><w:r><w:t>text</w:t></w:r></w:p>');
  });
});
