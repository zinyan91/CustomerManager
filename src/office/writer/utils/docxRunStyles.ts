/**
 * Font, size, colour and highlight of text runs in a .docx, carried through
 * mammoth (which drops them) by naming them.
 *
 * Every run with such a property gets a temporary character style whose name
 * encodes nothing but an index; mammoth maps that style to a class, and the
 * class is turned back into inline CSS afterwards. The editor's text-style
 * extensions read the CSS (`color`, `font-size`, `font-family`,
 * `background-color`) as marks. Pure string work, so it runs and is tested in
 * Node.
 */
export interface RunStyleResult {
  documentXml: string;
  stylesXml: string;
  /** class name → inline CSS declarations. */
  css: Map<string, string>;
  /** mammoth style-map rules, one per class. */
  rules: string[];
}

const HIGHLIGHTS: Record<string, string> = {
  yellow: '#ffff00',
  green: '#00ff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  blue: '#0000ff',
  red: '#ff0000',
  darkBlue: '#000080',
  darkCyan: '#008080',
  darkGreen: '#008000',
  darkMagenta: '#800080',
  darkRed: '#800000',
  darkYellow: '#808000',
  darkGray: '#808080',
  lightGray: '#c0c0c0',
};

const RUN_WITH_PROPS = /<w:r(?=[ >])([^>]*)>(\s*)<w:rPr>([\s\S]*?)<\/w:rPr>/g;

/** The CSS a run's properties amount to, or '' when they hold nothing worth keeping. */
export function runCss(rPr: string): string {
  const declarations: string[] = [];
  const color = /<w:color\b[^>]*\bw:val="([0-9A-Fa-f]{6})"/.exec(rPr)?.[1];
  if (color && color.toLowerCase() !== '000000') declarations.push(`color: #${color.toLowerCase()}`);
  const size = /<w:sz\b[^>]*\bw:val="(\d+)"/.exec(rPr)?.[1];
  if (size && Number(size) > 0) declarations.push(`font-size: ${Number(size) / 2}pt`);
  const font = /<w:rFonts\b[^>]*\bw:ascii="([^"]+)"/.exec(rPr)?.[1];
  if (font) declarations.push(`font-family: '${font.replace(/['"&<>]/g, '')}'`);
  const highlight = /<w:highlight\b[^>]*\bw:val="(\w+)"/.exec(rPr)?.[1];
  const shade = /<w:shd\b[^>]*\bw:fill="([0-9A-Fa-f]{6})"/.exec(rPr)?.[1];
  const background = highlight ? HIGHLIGHTS[highlight] : shade && shade.toLowerCase() !== 'ffffff' ? `#${shade.toLowerCase()}` : undefined;
  if (background) declarations.push(`background-color: ${background}`);
  return declarations.join('; ');
}

export function extractRunStyles(documentXml: string, stylesXml: string): RunStyleResult {
  const classes = new Map<string, string>(); // css → class name
  const css = new Map<string, string>(); // class name → css
  const rules: string[] = [];

  const rewritten = documentXml.replace(RUN_WITH_PROPS, (whole, attributes: string, space: string, rPr: string) => {
    // A run that already has a character style keeps it: two cannot be combined.
    if (/<w:rStyle\b/.test(rPr)) return whole;
    const declarations = runCss(rPr);
    if (!declarations) return whole;
    let className = classes.get(declarations);
    if (!className) {
      className = `fxrun${classes.size + 1}`;
      classes.set(declarations, className);
      css.set(className, declarations);
      rules.push(`r[style-name='fx|${className}'] => span.${className}`);
    }
    return `<w:r${attributes}>${space}<w:rPr><w:rStyle w:val="${className}"/>${rPr}</w:rPr>`;
  });

  if (classes.size === 0) return { documentXml, stylesXml, css, rules };

  const definitions = [...css.keys()]
    .map(
      (className) =>
        `<w:style w:type="character" w:customStyle="1" w:styleId="${className}"><w:name w:val="fx|${className}"/></w:style>`,
    )
    .join('');
  const withStyles = stylesXml.includes('</w:styles>')
    ? stylesXml.replace('</w:styles>', `${definitions}</w:styles>`)
    : stylesXml;
  // Without a styles part to hold the definitions, mammoth could not name the styles.
  if (withStyles === stylesXml) return { documentXml, stylesXml, css: new Map(), rules: [] };
  return { documentXml: rewritten, stylesXml: withStyles, css, rules };
}

/** `<span class="fxrun3">` as `<span style="color: #ff0000">`. */
export function classesToInlineStyle(html: string, css: Map<string, string>): string {
  if (css.size === 0) return html;
  return html.replace(/<span class="(fxrun\d+)"/g, (whole, className: string) => {
    const declarations = css.get(className);
    return declarations ? `<span style="${declarations}"` : whole;
  });
}
