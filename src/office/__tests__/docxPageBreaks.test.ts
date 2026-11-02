import { describe, expect, it } from 'vitest';
import { wrapBlockImages } from '../writer/utils/docJson';
import { applyPageBreaks, markPageBreaks } from '../writer/utils/docxPageBreaks';

const M = '⁣[pb]⁣';

describe('page breaks of a .docx', () => {
  it('marks a break run and a paragraph that starts a page', () => {
    const marked = markPageBreaks('<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>b</w:t></w:r></w:p><w:p><w:r><w:br/></w:r></w:p>');
    expect(marked.split(M)).toHaveLength(3);
    expect(marked).toContain('<w:r><w:br/></w:r>');
  });

  it('cuts the paragraph at the marker, leaving out an empty part', () => {
    expect(applyPageBreaks(`<p>${M}</p>`)).toBe('<div data-type="page-break"></div>');
    expect(applyPageBreaks(`<p>antes${M}depois</p>`)).toBe('<p>antes</p><div data-type="page-break"></div><p>depois</p>');
    expect(applyPageBreaks(`<p style="x">${M}b</p><p>c</p>`)).toBe('<div data-type="page-break"></div><p style="x">b</p><p>c</p>');
    expect(applyPageBreaks('<p>none</p>')).toBe('<p>none</p>');
  });
});

describe('section breaks of a .docx', () => {
  const section = (type?: string) => `<w:sectPr>${type ? `<w:type w:val="${type}"/>` : ''}</w:sectPr>`;
  const para = (text: string, sect = '') => `<w:p><w:pPr>${sect}</w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;

  it('makes the end of a section a page break, unless the next section is continuous', () => {
    const next = markPageBreaks(`${para('a', section())}${para('b', section('nextPage'))}<w:body>${section()}</w:body>`);
    expect(next.split(M)).toHaveLength(3);
    const continuous = markPageBreaks(`${para('a', section())}${para('b')}<w:body>${section('continuous')}</w:body>`);
    expect(continuous.split(M)).toHaveLength(1);
    expect(markPageBreaks(para('plain'))).toBe(para('plain'));
  });
});

describe('pictures of an older draft', () => {
  it('wraps a picture that stands alone among blocks in a paragraph, wherever the block is', () => {
    const image = { type: 'image', attrs: { src: 'data:x' } };
    const doc = { type: 'doc', content: [image, { type: 'paragraph', content: [image] }, { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [image] }] }] }] };
    const wrapped = wrapBlockImages(doc);
    expect(wrapped.content![0]).toEqual({ type: 'paragraph', content: [image] });
    expect(wrapped.content![1]).toEqual({ type: 'paragraph', content: [image] });
    expect(wrapped.content![2].content![0].content![0].content![0]).toEqual({ type: 'paragraph', content: [image] });
  });
});
