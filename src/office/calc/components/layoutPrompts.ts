import type { CalcController } from '../controller';

interface Labels {
  columnWidthPrompt: string;
  rowHeightPrompt: string;
}

const asSize = (answer: string | null): number | null => {
  const size = Number(answer);
  return answer !== null && Number.isFinite(size) && size > 0 ? size : null;
};

/** Asks for a width in pixels and gives it to the selected columns. */
export function promptColumnWidth(controller: CalcController, labels: Labels, fallback: number): void {
  const { c1, c2 } = controller.selection;
  const current = controller.wb.sheets[controller.active].colWidths.get(c1) ?? fallback;
  const width = asSize(window.prompt(labels.columnWidthPrompt, String(current)));
  if (width !== null) for (let c = c1; c <= c2; c += 1) controller.setColumnWidth(c, width);
}

/** Asks for a height in pixels and gives it to the selected rows. */
export function promptRowHeight(controller: CalcController, labels: Labels, fallback: number): void {
  const current = controller.wb.sheets[controller.active].rowHeights?.get(controller.selection.r1) ?? fallback;
  const height = asSize(window.prompt(labels.rowHeightPrompt, String(current)));
  if (height !== null) controller.setSelectedRowHeights(height);
}

/** Asks for standard column width in pixels and updates sheet columns. */
export function promptDefaultWidth(controller: CalcController, promptText: string, fallback: number): void {
  const answer = window.prompt(promptText, String(fallback));
  const width = asSize(answer);
  if (width !== null) {
    for (let c = 0; c < 50; c += 1) {
      controller.setColumnWidth(c, width);
    }
  }
}

