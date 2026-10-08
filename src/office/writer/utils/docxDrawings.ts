/**
 * Size and text wrapping of pictures in a .docx, carried through mammoth (which
 * keeps neither) in the picture's alt text.
 *
 * Before mammoth reads the package, each `wp:inline` / `wp:anchor` drawing gets
 * its `wp:docPr` description prefixed with `felix-img:w=<px>,h=<px>[,f=left|right]|`;
 * mammoth copies the description into the `<img>`'s `alt`, and `applyDrawingMarkers`
 * turns the prefix back into the `width` and `data-float` attributes the editor
 * reads. Pure string work, so it runs and is tested in Node.
 *
 * A picture is "floating" when it is anchored with square, tight or through
 * wrapping, in front of the text, and sits to one side: Word's own alignment, or
 * (for an offset) the half of the column its centre is in. Anything else
 * (wrapped above and below, behind the text, centred) stays a block of its own.
 */
const EMU_PER_PX = 9525;
/** About the width of an A4 column; only decides which side an offset picture is on. */
const COLUMN_PX = 600;

const MARKER = 'felix-img:';

export type FloatSide = 'left' | 'right';

export interface DrawingInfo {
  width: number;
  height: number;
  float: FloatSide | null;
}

/** What one `wp:inline` or `wp:anchor` element says about size and wrapping. */
export function readDrawing(kind: 'inline' | 'anchor', xml: string): DrawingInfo | null {
  const extent = /<wp:extent\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/.exec(xml);
  if (!extent) return null;
  const width = Math.round(Number(extent[1]) / EMU_PER_PX);
  const height = Math.round(Number(extent[2]) / EMU_PER_PX);
  if (!(width > 0) || !(height > 0)) return null;
  if (kind === 'inline') return { width, height, float: null };

  const wraps = /<wp:wrap(Square|Tight|Through)\b/.test(xml);
  const behind = /\bbehindDoc="(?:1|true)"/.test(xml);
  if (!wraps || behind) return { width, height, float: null };

  const horizontal = /<wp:positionH\b[^>]*>([\s\S]*?)<\/wp:positionH>/.exec(xml);
  const body = horizontal ? horizontal[1] : '';
  const align = /<wp:align>(\w+)<\/wp:align>/.exec(body)?.[1];
  if (align === 'left' || align === 'inside') return { width, height, float: 'left' };
  if (align === 'right' || align === 'outside') return { width, height, float: 'right' };
  if (align === 'center') return { width, height, float: null };
  const offset = /<wp:posOffset>(-?\d+)<\/wp:posOffset>/.exec(body);
  if (offset) {
    const centre = Number(offset[1]) / EMU_PER_PX + width / 2;
    return { width, height, float: centre > COLUMN_PX / 2 ? 'right' : 'left' };
  }
  return { width, height, float: 'left' };
}

/** Adds the marker to every drawing's description. Returns the XML as it came when there is nothing to add. */
export function markDrawings(documentXml: string): string {
  return documentXml.replace(/<wp:(inline|anchor)\b[\s\S]*?<\/wp:\1>/g, (drawing, kind: 'inline' | 'anchor') => {
    const info = readDrawing(kind, drawing);
    if (!info) return drawing;
    const marker = `${MARKER}w=${info.width},h=${info.height}${info.float ? `,f=${info.float}` : ''}|`;
    return drawing.replace(/<wp:docPr\b([^>]*?)(\/?)>/, (_tag, attributes: string, close: string) => {
      const existing = /\sdescr="([^"]*)"/.exec(attributes);
      const rest = existing ? attributes.replace(existing[0], '') : attributes;
      return `<wp:docPr${rest} descr="${marker}${existing ? existing[1] : ''}"${close}>`;
    });
  });
}

/** `<img … alt="felix-img:w=96,h=96,f=left|text">` back to the attributes the editor reads, restoring the alt text. */
export function applyDrawingMarkers(html: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const alt = /\salt="felix-img:([^"|]*)\|([^"]*)"/.exec(tag);
    if (!alt) return tag;
    const parts = Object.fromEntries(alt[1].split(',').map((part) => part.split('=')));
    const extra = [parts.w ? ` width="${parts.w}"` : '', parts.f ? ` data-float="${parts.f}"` : ''].join('');
    return tag.replace(alt[0], alt[2] ? ` alt="${alt[2]}"` : '').replace(/^<img\b/, `<img${extra}`);
  });
}
