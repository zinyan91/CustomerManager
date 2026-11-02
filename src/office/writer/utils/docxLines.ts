/**
 * A horizontal line drawn as a shape (DrawingML line or connector, or VML v:line) is lost by mammoth. A long one,
 * anchored in a paragraph, becomes a horizontal rule after that paragraph: a marker paragraph the HTML turns into
 * <hr>. Vertical lines, short ones and boxes are left alone (boxes are docxTextBoxes').
 */
const MARK = '⁣';
const MIN_WIDTH_EMU = 2_500_000;
const MIN_WIDTH_PT = 200;

/** True when the paragraph holds a long, horizontal line shape. */
export function hasHorizontalLine(paragraphXml: string): boolean {
  for (const shape of paragraphXml.matchAll(/<wps:wsp\b[\s\S]*?<\/wps:wsp>/g)) {
    const xml = shape[0];
    if (!/prst="(?:line|straightConnector1)"/.test(xml)) continue;
    const extent = /<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/.exec(xml);
    if (extent && Number(extent[1]) >= MIN_WIDTH_EMU && Number(extent[2]) <= 12_700) return true;
  }
  for (const line of paragraphXml.matchAll(/<v:line\b[^>]*>/g)) {
    const from = /\bfrom="([^"]*)"/.exec(line[0])?.[1]?.split(',').map((n) => parseFloat(n));
    const to = /\bto="([^"]*)"/.exec(line[0])?.[1]?.split(',').map((n) => parseFloat(n));
    if (from && to && Math.abs(to[0] - from[0]) >= MIN_WIDTH_PT && Math.abs(to[1] - from[1]) < 2) return true;
  }
  return false;
}

/** The document with a marker paragraph after each paragraph that holds a long horizontal line. */
export function markHorizontalLines(documentXml: string): string {
  return documentXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) =>
    (paragraph.match(/<w:p[\s>]/g) ?? []).length === 1 && hasHorizontalLine(paragraph) ? `${paragraph}<w:p><w:r><w:t>${MARK}[hr]${MARK}</w:t></w:r></w:p>` : paragraph,
  );
}

/** The marker paragraphs as <hr>; run before the paragraph markers are read, which would take this one for theirs. */
export function applyHorizontalLines(html: string): string {
  return html.replace(new RegExp(`<p[^>]*>(?:${MARK}\\[[^\\]]*\\]${MARK})*${MARK}\\[hr]${MARK}</p>`, 'g'), '<hr />');
}
