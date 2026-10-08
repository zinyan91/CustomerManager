import { PAPER_SIZES_MM, clampMargins, type PageSetup, type PaperSize } from './pageSetup';

/**
 * What a .docx says about its own page and its base text, as the part of a
 * PageSetup it can set: paper, orientation, margins, and the font and size
 * that text without its own formatting uses.
 */
export type DocxDefaults = Partial<Pick<PageSetup, 'paper' | 'orientation' | 'margins' | 'baseFont' | 'baseSize'>>;

const TWIPS_PER_MM = 1440 / 25.4;

function attribute(tag: string, name: string): number | null {
  const match = new RegExp(`\\bw:${name}="(-?\\d+)"`).exec(tag);
  return match ? Number(match[1]) : null;
}

/** The paper whose size is within 3 mm of the given one in both directions. */
export function paperOf(widthMm: number, heightMm: number): PaperSize | null {
  const [short, long] = widthMm <= heightMm ? [widthMm, heightMm] : [heightMm, widthMm];
  for (const [paper, size] of Object.entries(PAPER_SIZES_MM) as Array<[PaperSize, { width: number; height: number }]>) {
    if (Math.abs(size.width - short) <= 3 && Math.abs(size.height - long) <= 3) return paper;
  }
  return null;
}

/** The first typeface a theme names for its minor (body) or major (heading) font. */
function themeFont(themeXml: string, kind: 'minor' | 'major'): string | null {
  const block = new RegExp(`<a:${kind}Font>([\\s\\S]*?)</a:${kind}Font>`).exec(themeXml)?.[1];
  return block ? (/<a:latin\b[^>]*\btypeface="([^"]+)"/.exec(block)?.[1] ?? null) : null;
}

function fontIn(rPr: string, themeXml: string): string | null {
  const fonts = /<w:rFonts\b[^>]*>/.exec(rPr)?.[0];
  if (!fonts) return null;
  const named = /\bw:ascii="([^"]+)"/.exec(fonts)?.[1] ?? /\bw:hAnsi="([^"]+)"/.exec(fonts)?.[1];
  if (named) return named;
  const theme = /\bw:(?:ascii|hAnsi)Theme="(major|minor)/.exec(fonts)?.[1] as 'major' | 'minor' | undefined;
  return theme && themeXml ? themeFont(themeXml, theme) : null;
}

function sizeIn(rPr: string): number | null {
  const half = /<w:sz\b[^>]*\bw:val="(\d+)"/.exec(rPr)?.[1];
  return half ? Number(half) / 2 : null;
}

export function readDocxDefaults(documentXml: string, stylesXml: string, themeXml = ''): DocxDefaults {
  const defaults: DocxDefaults = {};

  // The last section's page: the one a single-section document is all of.
  const pgSz = [...documentXml.matchAll(/<w:pgSz\b[^>]*>/g)].pop()?.[0];
  const pgMar = [...documentXml.matchAll(/<w:pgMar\b[^>]*>/g)].pop()?.[0];
  if (pgSz) {
    const width = attribute(pgSz, 'w');
    const height = attribute(pgSz, 'h');
    if (width && height) {
      const paper = paperOf(width / TWIPS_PER_MM, height / TWIPS_PER_MM);
      if (paper) defaults.paper = paper;
      const landscape = /\bw:orient="landscape"/.test(pgSz) || width > height;
      defaults.orientation = landscape ? 'landscape' : 'portrait';
    }
  }
  if (pgMar && defaults.paper) {
    const side = (name: string) => (attribute(pgMar, name) ?? 1440) / TWIPS_PER_MM;
    defaults.margins = clampMargins(
      { top: side('top'), bottom: side('bottom'), left: side('left'), right: side('right') },
      { paper: defaults.paper, orientation: defaults.orientation ?? 'portrait' },
    );
  }

  // Document defaults, then the default paragraph style on top of them.
  const docDefaults = /<w:docDefaults>([\s\S]*?)<\/w:docDefaults>/.exec(stylesXml)?.[1] ?? '';
  const normal =
    [...stylesXml.matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)]
      .map((m) => m[0])
      .find((style) => /w:type="paragraph"/.test(style) && /w:default="1"/.test(style)) ?? '';
  const font = fontIn(normal, themeXml) ?? fontIn(docDefaults, themeXml);
  const size = sizeIn(normal) ?? sizeIn(docDefaults);
  if (font) defaults.baseFont = font;
  if (size && size >= 6 && size <= 72) defaults.baseSize = size;
  return defaults;
}
