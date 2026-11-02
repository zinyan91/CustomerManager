import type JSZip from 'jszip';

/**
 * A header or footer of an imported .docx, kept as it was so that exporting the document again does not flatten
 * it: its logo, tabs, fields and formatting stay. It is dropped when the header or footer is edited in the
 * page setup, so the edit takes effect.
 */
export interface KeptPart {
  /** The part's XML. */
  xml: string;
  /** Its relationships, the pictures' targets already under `media/kept-<name>`. */
  rels: string;
  /** The pictures it uses, by file name under word/media, as base64. */
  media: Record<string, string>;
}

const MAX_XML = 400_000;
const MAX_MEDIA_TOTAL = 6_000_000;

/** A stored part made safe: strings of a sensible size, and nothing else. */
export function sanitiseKeptPart(value: unknown): KeptPart | null {
  if (!value || typeof value !== 'object') return null;
  const part = value as Partial<KeptPart>;
  if (typeof part.xml !== 'string' || part.xml.length === 0 || part.xml.length > MAX_XML || typeof part.rels !== 'string') return null;
  const media: Record<string, string> = {};
  let total = 0;
  for (const [name, data] of Object.entries(part.media && typeof part.media === 'object' ? part.media : {})) {
    if (typeof data !== 'string' || !/^[\w.-]+$/.test(name) || !/^[A-Za-z0-9+/=]*$/.test(data)) continue;
    total += data.length;
    if (total > MAX_MEDIA_TOTAL) break;
    media[name] = data;
  }
  return { xml: part.xml, rels: part.rels.length <= MAX_XML ? part.rels : '', media };
}

const IMAGE_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', emf: 'image/x-emf', wmf: 'image/x-wmf' };

/** Reads a header or footer part and the pictures it points at; null when it is missing or has nothing in it. */
export async function readKeptPart(zip: JSZip, path: string | null, name: 'header' | 'footer'): Promise<KeptPart | null> {
  if (!path) return null;
  const xml = await zip.file(path)?.async('string');
  if (!xml || !/<w:t[ >]|<w:drawing|<w:pict|<w:fldChar|<w:fldSimple/.test(xml)) return null;
  const file = path.slice(path.lastIndexOf('/') + 1);
  const relsXml = (await zip.file(`word/_rels/${file}.rels`)?.async('string')) ?? '';
  const pictures: Array<{ name: string; path: string }> = [];
  const rels = relsXml.replace(/<Relationship\b[^>]*>/g, (tag) => {
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1] ?? '';
    const source = target.replace(/^\.?\//, '').replace(/^\.\.\//, '');
    if (/\bTargetMode="External"/.test(tag) || !source.startsWith('media/')) return tag;
    const kept = `kept-${name}-${source.slice(source.lastIndexOf('/') + 1)}`;
    pictures.push({ name: kept, path: `word/${source}` });
    return tag.replace(target, `media/${kept}`);
  });
  const media: Record<string, string> = {};
  for (const { name: kept, path: source } of pictures) media[kept] = (await zip.file(source)?.async('base64')) ?? '';
  return sanitiseKeptPart({ xml, rels, media });
}

/** The package with the kept header and footer put in the section, in place of the ones the writer made. */
export async function injectKeptParts(blob: Blob, kept: { header: KeptPart | null; footer: KeptPart | null }): Promise<Blob> {
  if (!kept.header && !kept.footer) return blob;
  const { default: JSZipClass } = await import('jszip');
  const zip = await JSZipClass.loadAsync(await blob.arrayBuffer());
  let contentTypes = (await zip.file('[Content_Types].xml')?.async('string')) ?? '';
  let documentRels = (await zip.file('word/_rels/document.xml.rels')?.async('string')) ?? '';
  let documentXml = (await zip.file('word/document.xml')?.async('string')) ?? '';
  if (!contentTypes || !documentRels || !documentXml) return blob;

  const references: string[] = [];
  for (const [kind, part] of [['header', kept.header], ['footer', kept.footer]] as const) {
    if (!part) continue;
    const file = `kept${kind === 'header' ? 'Header' : 'Footer'}.xml`;
    const id = `rIdKept${kind === 'header' ? 'Header' : 'Footer'}`;
    zip.file(`word/${file}`, part.xml);
    if (part.rels) zip.file(`word/_rels/${file}.rels`, part.rels);
    for (const [name, data] of Object.entries(part.media)) {
      if (!data) continue;
      zip.file(`word/media/${name}`, data, { base64: true });
      const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
      if (IMAGE_TYPES[extension] && !new RegExp(`<Default\\b[^>]*Extension="${extension}"`, 'i').test(contentTypes)) {
        contentTypes = contentTypes.replace('<Override', `<Default Extension="${extension}" ContentType="${IMAGE_TYPES[extension]}"/><Override`);
      }
    }
    contentTypes = contentTypes.replace('</Types>', `<Override PartName="/word/${file}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${kind}+xml"/></Types>`);
    documentRels = documentRels.replace('</Relationships>', `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${kind}" Target="${file}"/></Relationships>`);
    references.push(`<w:${kind}Reference w:type="default" r:id="${id}"/>`);
  }
  // The references come first among the section's properties.
  documentXml = documentXml.replace(/<w:sectPr\b[^>]*>/, (open) => `${open}${references.join('')}`);
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('word/_rels/document.xml.rels', documentRels);
  zip.file('word/document.xml', documentXml);
  return zip.generateAsync({ type: 'blob', mimeType: blob.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
