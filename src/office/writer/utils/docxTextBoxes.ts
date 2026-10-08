/**
 * Text boxes of a .docx as boxes on the page.
 *
 * mammoth hands a text box's paragraphs over as ordinary ones after the
 * paragraph that anchors the box, so the frame is gone. A box that has a visible
 * outline or fill is brought back as a one-cell table, which the editor draws
 * with its borders, prints, and writes to .docx again as a table; a box with no
 * line and no fill (the usual way of laying text out in a form) stays plain text.
 *
 * Before mammoth reads the package, every paragraph in the content of a framed
 * box is given a temporary paragraph style (`fx|box`); mammoth maps it to the
 * class `fx-box`, and `boxTextBoxes` wraps each run of such paragraphs in the
 * table. Pure string work, so it runs and is tested in Node.
 */
export const BOX_STYLE_ID = 'fxbox';
export const BOX_STYLE_NAME = 'fx|box';
export const BOX_CLASS = 'fx-box';

const SHAPE = /<wps:wsp\b[\s\S]*?<\/wps:wsp>|<v:(shape|rect|roundrect)\b[^>]*(?<!\/)>[\s\S]*?<\/v:\1>/g;
const CONTENT = /<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g;

/** Whether a drawing shape (DrawingML `wps:wsp` or VML) draws a line or a fill around its text. */
export function isFramed(shapeXml: string): boolean {
  if (shapeXml.startsWith('<wps:wsp')) {
    const properties = /<wps:spPr\b[\s\S]*?<\/wps:spPr>/.exec(shapeXml)?.[0] ?? '';
    const line = /<a:ln\b[^>]*?(?:\/>|>[\s\S]*?<\/a:ln>)/.exec(properties)?.[0] ?? '';
    const lineDrawn = line !== '' && !/<a:noFill\b/.test(line);
    const withoutLine = properties.replace(line, '');
    const filled = /<a:(?:solidFill|gradFill|pattFill)\b/.test(withoutLine);
    return lineDrawn || filled;
  }
  const open = /^<v:\w+\b[^>]*>/.exec(shapeXml)?.[0] ?? '';
  const stroked = !/\bstroked="(?:f|false)"/.test(open);
  const filled = /\bfilled="(?:t|true)"/.test(open) || (/\bfillcolor="/.test(open) && !/\bfilled="(?:f|false)"/.test(open));
  return stroked || filled;
}

function markParagraphs(content: string): string {
  return content.replace(/<w:p(?=[ >])([^>]*)>([\s\S]*?)<\/w:p>/g, (_whole, attributes: string, body: string) => {
    const style = `<w:pStyle w:val="${BOX_STYLE_ID}"/>`;
    if (/^\s*<w:pPr>/.test(body)) {
      return `<w:p${attributes}>${body.replace(/<w:pPr>(\s*<w:pStyle\b[^>]*\/>)?/, `<w:pPr>${style}`)}</w:p>`;
    }
    return `<w:p${attributes}><w:pPr>${style}</w:pPr>${body}</w:p>`;
  });
}

/**
 * Gives the paragraphs of every framed text box the box style, and defines the
 * style. Returns the parts as they came when there is no framed box, or no
 * styles part to define the style in (mammoth could not name it then).
 */
export function markTextBoxes(documentXml: string, stylesXml: string): { documentXml: string; stylesXml: string } {
  if (!documentXml.includes('<w:txbxContent>') || !stylesXml.includes('</w:styles>')) return { documentXml, stylesXml };
  let any = false;
  const marked = documentXml.replace(SHAPE, (shape) => {
    if (!isFramed(shape)) return shape;
    return shape.replace(CONTENT, (content) => {
      any = true;
      return markParagraphs(content);
    });
  });
  if (!any) return { documentXml, stylesXml };
  const definition = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="${BOX_STYLE_ID}"><w:name w:val="${BOX_STYLE_NAME}"/></w:style>`;
  return { documentXml: marked, stylesXml: stylesXml.replace('</w:styles>', `${definition}</w:styles>`) };
}

/** mammoth style-map rules for the box paragraph, alone or carrying an alignment prefix. */
export function boxRules(alignments: readonly string[]): string[] {
  return [
    `p[style-name='${BOX_STYLE_NAME}'] => p.${BOX_CLASS}:fresh`,
    ...alignments.map((align) => `p[style-name^='align-${align}|${BOX_STYLE_NAME}'] => p.${BOX_CLASS}.align-${align}:fresh`),
  ];
}

const BOX_PARAGRAPH = new RegExp(`<p class="${BOX_CLASS}(?: align-(center|right|justify))?">([\\s\\S]*?)</p>`, 'g');

/** Each run of box paragraphs becomes a one-cell table holding them as ordinary paragraphs. */
export function boxTextBoxes(html: string): string {
  if (!html.includes(`class="${BOX_CLASS}`)) return html;
  const run = new RegExp(`(?:<p class="${BOX_CLASS}(?: align-(?:center|right|justify))?">[\\s\\S]*?</p>)+`, 'g');
  return html.replace(run, (group) => {
    const paragraphs = group.replace(BOX_PARAGRAPH, (_whole, align: string | undefined, inner: string) =>
      align ? `<p style="text-align: ${align}">${inner}</p>` : `<p>${inner}</p>`,
    );
    return `<table><tbody><tr><td>${paragraphs}</td></tr></tbody></table>`;
  });
}
