import type { CalcController } from '../controller';

interface LinkLabels {
  linkPrompt: string;
}

interface NoteLabels {
  notePrompt: string;
}

/** Only web and mail addresses are followed. */
export function safeAddress(url: string): string | null {
  const text = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(text)) return text;
  return /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text) ? `https://${text}` : null;
}

/** Asks for an address for the selected cells; an empty answer takes the link off. */
export function promptLink(controller: CalcController, labels: LinkLabels): void {
  const { row, col } = controller.activeCell;
  const answer = window.prompt(labels.linkPrompt, controller.linkAt(row, col) ?? 'https://');
  if (answer !== null) controller.setLink(answer.trim() === 'https://' ? '' : answer);
}

/** Asks for the text of the active cell's note; an empty answer takes it off. */
export function promptNote(controller: CalcController, labels: NoteLabels, author = ''): void {
  const { row, col } = controller.activeCell;
  const answer = window.prompt(labels.notePrompt, controller.noteAt(row, col) ?? '');
  if (answer !== null) controller.setNote(answer, author);
}

/** Follows the link of a cell, in a new tab with no link back to this page. */
export function openLink(url: string): void {
  const address = safeAddress(url);
  if (address) window.open(address, '_blank', 'noopener,noreferrer');
}
