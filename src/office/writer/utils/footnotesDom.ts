import type { PageNote } from './pagination';

/** The footnotes of a page as DOM: a short rule, then each note under its number. `rule` is left out when measuring, where its height is known. */
export function renderNotes(notes: readonly PageNote[], rule: boolean, doc: Document = document): HTMLElement {
  const box = doc.createElement('div');
  box.className = 'writer-notes';
  if (rule) {
    const line = doc.createElement('div');
    line.className = 'writer-notes-rule';
    box.append(line);
  }
  for (const note of notes) {
    const item = doc.createElement('div');
    item.className = 'writer-note';
    const number = doc.createElement('sup');
    number.textContent = String(note.n);
    item.append(number, ` ${note.text}`);
    box.append(item);
  }
  return box;
}

/** How the notes look, shared by the page view and the printed page. */
export const NOTES_CSS = `
.writer-notes { font-size: 9pt; line-height: 1.25; }
.writer-notes-rule { width: 30%; border-top: 1px solid currentColor; margin-bottom: 7px; }
.writer-note { margin: 0 0 2px; }
`;
