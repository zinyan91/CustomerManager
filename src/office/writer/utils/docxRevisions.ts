/**
 * Tracked changes in a .docx. mammoth keeps what was inserted as plain text and drops what was deleted, so a
 * marker run is put in front of and behind each change in the document XML (a deletion is renamed to an
 * insertion, with its text made ordinary text, so that mammoth keeps it) and the markers become the editor's
 * `ins` and `del` in the HTML.
 */
const MARK = '⁣';

const run = (text: string): string => `<w:r><w:t xml:space="preserve">${MARK}${text}${MARK}</w:t></w:r>`;
const clean = (value: string): string => value.replace(/[|\]⁣]/g, '');

function opening(attrs: string, kind: 'ins' | 'del'): string {
  const author = clean(/\bw:author="([^"]*)"/.exec(attrs)?.[1] ?? '');
  const date = clean((/\bw:date="([^"]*)"/.exec(attrs)?.[1] ?? '').slice(0, 16));
  return run(`[${kind}:${author}|${date}]`);
}

export function markRevisions(documentXml: string): string {
  if (!/<w:(?:ins|del)[ >]/.test(documentXml)) return documentXml;
  const deleted = documentXml.replace(/<w:del\b([^>]*)>([\s\S]*?)<\/w:del>/g, (_m, attrs: string, body: string) => {
    const text = body.replace(/<w:delText\b/g, '<w:t').replace(/<\/w:delText>/g, '</w:t>');
    return `<w:ins${attrs} data-was-deleted="1">${text}</w:ins>`;
  });
  return deleted.replace(/<w:ins\b([^>]*)>([\s\S]*?)<\/w:ins>/g, (_m, attrs: string, body: string) => {
    const kind = attrs.includes('data-was-deleted') ? 'del' : 'ins';
    return `<w:ins${attrs}>${opening(attrs, kind)}${body}${run(`[/${kind}]`)}</w:ins>`;
  });
}

const OPEN = new RegExp(`${MARK}\\[(ins|del):([^|\\]]*)\\|([^\\]]*)\\]${MARK}`, 'g');
const CLOSE = new RegExp(`${MARK}\\[/(ins|del)\\]${MARK}`, 'g');
const attribute = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** The editor's tracked-change marks from the markers in mammoth's HTML. */
export function applyRevisionMarkers(html: string): string {
  return html
    .replace(OPEN, (_m, kind: string, author: string, date: string) => `<${kind} data-track="${kind === 'ins' ? 'insertion' : 'deletion'}" data-author="${attribute(author)}" data-date="${attribute(date)}">`)
    .replace(CLOSE, (_m, kind: string) => `</${kind}>`);
}
