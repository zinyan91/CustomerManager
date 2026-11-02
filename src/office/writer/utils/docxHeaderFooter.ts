/** The text of a header or footer part, and whether it shows the page number. */
export interface HeaderFooterText {
  text: string;
  pageNumber: boolean;
}

/** The file (under word/) a section's default header or footer is in, from the document and its relationships. */
export function defaultPartPath(documentXml: string, relsXml: string, kind: 'header' | 'footer'): string | null {
  const reference = [...documentXml.matchAll(new RegExp(`<w:${kind}Reference\\b[^>]*>`, 'g'))]
    .map((m) => m[0])
    .find((tag) => /\bw:type="default"/.test(tag));
  const id = reference ? /\br:id="([^"]+)"/.exec(reference)?.[1] : null;
  if (!id) return null;
  for (const rel of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    if (new RegExp(`\\bId="${id}"`).test(rel[0])) {
      const target = /\bTarget="([^"]+)"/.exec(rel[0])?.[1];
      return target ? `word/${target.replace(/^\.?\//, '')}` : null;
    }
  }
  return null;
}

const decode = (text: string): string => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/**
 * What a header or footer says, one line per paragraph. A field (the page number) is not text: what it
 * shows is left out and, if it is PAGE, `pageNumber` is set.
 */
export function readHeaderFooter(xml: string): HeaderFooterText {
  let pageNumber = false;
  const lines: string[] = [];
  for (const paragraph of xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) ?? []) {
    let depth = 0;
    let inInstruction = false;
    let text = '';
    const simple = paragraph.replace(/<w:fldSimple\b[^>]*\bw:instr="([^"]*)"[^>]*>[\s\S]*?<\/w:fldSimple>/g, (_m, instr: string) => {
      if (/\bPAGE\b/i.test(instr)) pageNumber = true;
      return '';
    });
    for (const token of simple.match(/<w:fldChar\b[^>]*>|<w:instrText\b[^>]*>[\s\S]*?<\/w:instrText>|<w:t\b[^>]*>[\s\S]*?<\/w:t>|<w:tab\s*\/>/g) ?? []) {
      if (token.startsWith('<w:fldChar')) {
        const type = /w:fldCharType="(\w+)"/.exec(token)?.[1];
        if (type === 'begin') {
          depth += 1;
          inInstruction = true;
        } else if (type === 'separate') inInstruction = false;
        else if (type === 'end') depth = Math.max(0, depth - 1);
      } else if (token.startsWith('<w:instrText')) {
        if (/\bPAGE\b/i.test(token)) pageNumber = true;
      } else if (token.startsWith('<w:tab')) {
        if (depth === 0) text += ' ';
      } else if (depth === 0 && !inInstruction) {
        text += decode(token.replace(/<[^>]+>/g, ''));
      }
    }
    lines.push(text.replace(/\s+/g, ' ').trim());
  }
  return { text: lines.filter(Boolean).join(' '), pageNumber };
}
