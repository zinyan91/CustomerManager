/**
 * mammoth drops a Word page break, `<w:br w:type="page"/>` or a paragraph that starts a page. Each becomes a marker
 * run in the document XML, and in the HTML the paragraph holding a marker is cut there into the text before it, a
 * page-break block, and the text after it; an empty part is left out.
 */
const MARK = '⁣';
const MARKER = `${MARK}[pb]${MARK}`;

/** The document with a marker run for every page break. */
export function markPageBreaks(documentXml: string): string {
  const run = `<w:r><w:t xml:space="preserve">${MARKER}</w:t></w:r>`;
  const withBreaks = documentXml.replace(/<w:r(?:\s[^>]*)?>(?:(?!<\/w:r>)[\s\S])*?<w:br\b[^>]*\bw:type="page"[^>]*\/>(?:(?!<\/w:r>)[\s\S])*?<\/w:r>/g, run);
  return markSectionBreaks(markPageBreakBefore(withBreaks, run), run);
}

/** A paragraph that says it starts a page: the marker goes first. */
function markPageBreakBefore(documentXml: string, run: string): string {
  return documentXml.replace(/<w:p(?:\s[^>]*)?>(?:<w:pPr>(?:(?!<\/w:pPr>)[\s\S])*?<w:pageBreakBefore\b[^>]*\/>(?:(?!<\/w:pPr>)[\s\S])*?<\/w:pPr>)/g, (open) => `${open}${run}`);
}

/**
 * A section break inside the text ends the paragraph that carries its properties, and the next section starts on a
 * new page unless it says it is continuous. The editor keeps one page setup (the last section's), so what survives
 * of such a break is the new page: the marker goes at the end of that paragraph.
 */
function markSectionBreaks(documentXml: string, run: string): string {
  const continuous = [...documentXml.matchAll(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/g)].map((m) => /<w:type\b[^>]*\bw:val="continuous"/.test(m[0]));
  let seen = 0;
  return documentXml.replace(/<w:p(?:\s[^>]*)?>(?:(?!<\/w:p>)[\s\S])*?<\/w:p>/g, (paragraph) => {
    if (!/<w:pPr>(?:(?!<\/w:pPr>)[\s\S])*<w:sectPr\b/.test(paragraph)) return paragraph;
    const next = continuous[seen + 1];
    seen += 1;
    return next ? paragraph : paragraph.replace(/<\/w:p>$/, `${run}</w:p>`);
  });
}

/** The marker paragraphs as page-break blocks. */
export function applyPageBreaks(html: string): string {
  if (!html.includes(MARKER)) return html;
  const split = (open: string, inner: string, tag: string): string => {
    const parts = inner.split(MARKER);
    const out: string[] = [];
    parts.forEach((part, i) => {
      if (i > 0) out.push('<div data-type="page-break"></div>');
      if (part.replace(/<[^>]*>/g, '').trim() !== '') out.push(`${open}${part}</${tag}>`);
    });
    return out.join('');
  };
  return html.replace(/<(p|h[1-6])\b([^>]*)>((?:(?!<\/\1>)[\s\S])*?)<\/\1>/g, (all, tag: string, attrs: string, inner: string) => (inner.includes(MARKER) ? split(`<${tag}${attrs}>`, inner, tag) : all));
}
