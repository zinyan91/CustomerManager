import { wrapCommentRanges } from './docxCommentRanges';

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const plain = (html: string): string =>
  html
    .replace(/<a\b[^>]*href="#footnote-ref-[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * mammoth writes a footnote as a bracketed link in the text and a list of notes at the end of the page. The
 * editor keeps the note in the reference itself, so each link takes its note's text and the list goes.
 */
export function footnotesToReferences(html: string): string {
  const notes = new Map<string, string>();
  for (const item of html.matchAll(/<li id="footnote-(\d+)">([\s\S]*?)<\/li>/g)) notes.set(item[1], plain(item[2]));
  if (notes.size === 0) return html;
  const withRefs = html.replace(/<sup><a href="#footnote-(\d+)" id="footnote-ref-\d+">\[\d+\]<\/a><\/sup>/g, (_m, id: string) =>
    notes.has(id) ? `<sup data-footnote="${escape(notes.get(id) ?? '')}" title="${escape(notes.get(id) ?? '')}"></sup>` : '',
  );
  return withRefs.replace(/<ol>(?:<li id="footnote-\d+">[\s\S]*?<\/li>)+<\/ol>/g, '');
}

/**
 * mammoth writes a comment as a bracketed link at the place it was made and a list of the comments at the end.
 * Each link becomes a comment marker holding its text, and the list goes.
 */
export function commentsToMarkers(html: string): string {
  const comments = new Map<string, string>();
  for (const item of html.matchAll(/<dt id="comment-(\d+)">[\s\S]*?<\/dt><dd>([\s\S]*?)<\/dd>/g)) {
    comments.set(item[1], plain(item[2].replace(/<a\b[^>]*href="#comment-ref-[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')));
  }
  if (comments.size === 0) return html;
  const ranged = wrapCommentRanges(html, comments, escape);
  const withMarkers = ranged.html.replace(/<sup><a href="#comment-(\d+)" id="comment-ref-\d+">\[[^\]]*\]<\/a><\/sup>/g, (_m, id: string) => {
    const text = comments.get(id);
    return text && !ranged.placed.has(id) ? `<span data-comment="${escape(text)}" title="${escape(text)}"></span>` : '';
  });
  return withMarkers.replace(/<dl>(?:<dt id="comment-\d+">[\s\S]*?<\/dt><dd>[\s\S]*?<\/dd>)+<\/dl>/g, '');
}
