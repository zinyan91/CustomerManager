import type { CalcController } from '../controller';
import { currentRegion } from '../engine/chartData';

export interface TableStylePreset {
  id: string;
  name: string;
  category: 'light' | 'medium' | 'dark';
  header: string;
  headerColor?: string;
  band: string;
  bandAlt?: string;
  borderColor?: string;
}

// 7 primary Excel color columns:
// 1. None/Gray/Black, 2. Blue, 3. Orange, 4. Gray, 5. Gold/Yellow, 6. Light Blue, 7. Green

export const TABLE_STYLE_PRESETS: TableStylePreset[] = [
  // --- LIGHT (21 styles: 3 rows x 7 cols) ---
  // Row 1 (Light 1 - 7): subtle headers, white body
  { id: 'light-1', name: 'Table Style Light 1', category: 'light', header: '#f2f2f2', headerColor: '#000', band: '#ffffff', borderColor: '#d9d9d9' },
  { id: 'light-2', name: 'Table Style Light 2', category: 'light', header: '#deebf7', headerColor: '#000', band: '#ffffff', borderColor: '#bdd7ee' },
  { id: 'light-3', name: 'Table Style Light 3', category: 'light', header: '#fce4d6', headerColor: '#000', band: '#ffffff', borderColor: '#f8cbad' },
  { id: 'light-4', name: 'Table Style Light 4', category: 'light', header: '#ededed', headerColor: '#000', band: '#ffffff', borderColor: '#dbdbdb' },
  { id: 'light-5', name: 'Table Style Light 5', category: 'light', header: '#fff2cc', headerColor: '#000', band: '#ffffff', borderColor: '#ffe699' },
  { id: 'light-6', name: 'Table Style Light 6', category: 'light', header: '#e1f5f2', headerColor: '#000', band: '#ffffff', borderColor: '#b2dfdb' },
  { id: 'light-7', name: 'Table Style Light 7', category: 'light', header: '#e2efda', headerColor: '#000', band: '#ffffff', borderColor: '#c6e0b4' },

  // Row 2 (Light 8 - 14): banded rows, white header
  { id: 'light-8', name: 'Table Style Light 8', category: 'light', header: '#ffffff', headerColor: '#000', band: '#f2f2f2', borderColor: '#d9d9d9' },
  { id: 'light-9', name: 'Table Style Light 9', category: 'light', header: '#ffffff', headerColor: '#000', band: '#deebf7', borderColor: '#bdd7ee' },
  { id: 'light-10', name: 'Table Style Light 10', category: 'light', header: '#ffffff', headerColor: '#000', band: '#fce4d6', borderColor: '#f8cbad' },
  { id: 'light-11', name: 'Table Style Light 11', category: 'light', header: '#ffffff', headerColor: '#000', band: '#ededed', borderColor: '#dbdbdb' },
  { id: 'light-12', name: 'Table Style Light 12', category: 'light', header: '#ffffff', headerColor: '#000', band: '#fff2cc', borderColor: '#ffe699' },
  { id: 'light-13', name: 'Table Style Light 13', category: 'light', header: '#ffffff', headerColor: '#000', band: '#e1f5f2', borderColor: '#b2dfdb' },
  { id: 'light-14', name: 'Table Style Light 14', category: 'light', header: '#ffffff', headerColor: '#000', band: '#e2efda', borderColor: '#c6e0b4' },

  // Row 3 (Light 15 - 21): borders with alternating row bands
  { id: 'light-15', name: 'Table Style Light 15', category: 'light', header: '#e7e6e6', headerColor: '#000', band: '#f2f2f2', borderColor: '#bfbfbf' },
  { id: 'light-16', name: 'Table Style Light 16', category: 'light', header: '#bdd7ee', headerColor: '#000', band: '#deebf7', borderColor: '#9bc2e6' },
  { id: 'light-17', name: 'Table Style Light 17', category: 'light', header: '#f8cbad', headerColor: '#000', band: '#fce4d6', borderColor: '#f4b084' },
  { id: 'light-18', name: 'Table Style Light 18', category: 'light', header: '#dbdbdb', headerColor: '#000', band: '#ededed', borderColor: '#c9c9c9' },
  { id: 'light-19', name: 'Table Style Light 19', category: 'light', header: '#ffe699', headerColor: '#000', band: '#fff2cc', borderColor: '#ffd966' },
  { id: 'light-20', name: 'Table Style Light 20', category: 'light', header: '#b2dfdb', headerColor: '#000', band: '#e1f5f2', borderColor: '#80cbc4' },
  { id: 'light-21', name: 'Table Style Light 21', category: 'light', header: '#c6e0b4', headerColor: '#000', band: '#e2efda', borderColor: '#a9d08e' },

  // --- MEDIUM (28 styles: 4 rows x 7 cols) ---
  // Row 1 (Medium 1 - 7): solid header, white/tint band
  { id: 'medium-1', name: 'Table Style Medium 1', category: 'medium', header: '#595959', headerColor: '#fff', band: '#f2f2f2', borderColor: '#d9d9d9' },
  { id: 'medium-2', name: 'Table Style Medium 2', category: 'medium', header: '#4472c4', headerColor: '#fff', band: '#deebf7', borderColor: '#bdd7ee' },
  { id: 'medium-3', name: 'Table Style Medium 3', category: 'medium', header: '#ed7d31', headerColor: '#fff', band: '#fce4d6', borderColor: '#f8cbad' },
  { id: 'medium-4', name: 'Table Style Medium 4', category: 'medium', header: '#a5a5a5', headerColor: '#fff', band: '#ededed', borderColor: '#dbdbdb' },
  { id: 'medium-5', name: 'Table Style Medium 5', category: 'medium', header: '#ffc000', headerColor: '#fff', band: '#fff2cc', borderColor: '#ffe699' },
  { id: 'medium-6', name: 'Table Style Medium 6', category: 'medium', header: '#5b9bd5', headerColor: '#fff', band: '#deebf7', borderColor: '#bdd7ee' },
  { id: 'medium-7', name: 'Table Style Medium 7', category: 'medium', header: '#70ad47', headerColor: '#fff', band: '#e2efda', borderColor: '#c6e0b4' },

  // Row 2 (Medium 8 - 14): darker header, striped bands
  { id: 'medium-8', name: 'Table Style Medium 8', category: 'medium', header: '#404040', headerColor: '#fff', band: '#e7e6e6', borderColor: '#bfbfbf' },
  { id: 'medium-9', name: 'Table Style Medium 9', category: 'medium', header: '#2f5597', headerColor: '#fff', band: '#bdd7ee', borderColor: '#8ea9db' },
  { id: 'medium-10', name: 'Table Style Medium 10', category: 'medium', header: '#c65911', headerColor: '#fff', band: '#f8cbad', borderColor: '#f4b084' },
  { id: 'medium-11', name: 'Table Style Medium 11', category: 'medium', header: '#7f7f7f', headerColor: '#fff', band: '#dbdbdb', borderColor: '#c9c9c9' },
  { id: 'medium-12', name: 'Table Style Medium 12', category: 'medium', header: '#bf8f00', headerColor: '#fff', band: '#ffe699', borderColor: '#ffd966' },
  { id: 'medium-13', name: 'Table Style Medium 13', category: 'medium', header: '#2e75b6', headerColor: '#fff', band: '#bdd7ee', borderColor: '#9bc2e6' },
  { id: 'medium-14', name: 'Table Style Medium 14', category: 'medium', header: '#548235', headerColor: '#fff', band: '#c6e0b4', borderColor: '#a9d08e' },

  // Row 3 (Medium 15 - 21): solid header, white alternating rows
  { id: 'medium-15', name: 'Table Style Medium 15', category: 'medium', header: '#262626', headerColor: '#fff', band: '#ffffff', borderColor: '#d9d9d9' },
  { id: 'medium-16', name: 'Table Style Medium 16', category: 'medium', header: '#1f4e78', headerColor: '#fff', band: '#ffffff', borderColor: '#bdd7ee' },
  { id: 'medium-17', name: 'Table Style Medium 17', category: 'medium', header: '#833c0c', headerColor: '#fff', band: '#ffffff', borderColor: '#f8cbad' },
  { id: 'medium-18', name: 'Table Style Medium 18', category: 'medium', header: '#595959', headerColor: '#fff', band: '#ffffff', borderColor: '#dbdbdb' },
  { id: 'medium-19', name: 'Table Style Medium 19', category: 'medium', header: '#806000', headerColor: '#fff', band: '#ffffff', borderColor: '#ffe699' },
  { id: 'medium-20', name: 'Table Style Medium 20', category: 'medium', header: '#1f4e79', headerColor: '#fff', band: '#ffffff', borderColor: '#b2dfdb' },
  { id: 'medium-21', name: 'Table Style Medium 21', category: 'medium', header: '#375623', headerColor: '#fff', band: '#ffffff', borderColor: '#c6e0b4' },

  // Row 4 (Medium 22 - 28): full borders with theme color accents
  { id: 'medium-22', name: 'Table Style Medium 22', category: 'medium', header: '#000000', headerColor: '#fff', band: '#f2f2f2', borderColor: '#000000' },
  { id: 'medium-23', name: 'Table Style Medium 23', category: 'medium', header: '#203764', headerColor: '#fff', band: '#deebf7', borderColor: '#203764' },
  { id: 'medium-24', name: 'Table Style Medium 24', category: 'medium', header: '#c65911', headerColor: '#fff', band: '#fce4d6', borderColor: '#c65911' },
  { id: 'medium-25', name: 'Table Style Medium 25', category: 'medium', header: '#595959', headerColor: '#fff', band: '#ededed', borderColor: '#595959' },
  { id: 'medium-26', name: 'Table Style Medium 26', category: 'medium', header: '#bf8f00', headerColor: '#fff', band: '#fff2cc', borderColor: '#bf8f00' },
  { id: 'medium-27', name: 'Table Style Medium 27', category: 'medium', header: '#1f4e79', headerColor: '#fff', band: '#e1f5f2', borderColor: '#1f4e79' },
  { id: 'medium-28', name: 'Table Style Medium 28', category: 'medium', header: '#375623', headerColor: '#fff', band: '#e2efda', borderColor: '#375623' },

  // --- DARK (11 styles) ---
  // Row 1 (Dark 1 - 7): rich dark themes
  { id: 'dark-1', name: 'Table Style Dark 1', category: 'dark', header: '#000000', headerColor: '#fff', band: '#595959', borderColor: '#262626' },
  { id: 'dark-2', name: 'Table Style Dark 2', category: 'dark', header: '#1f4e78', headerColor: '#fff', band: '#2f5597', borderColor: '#1b365d' },
  { id: 'dark-3', name: 'Table Style Dark 3', category: 'dark', header: '#c65911', headerColor: '#fff', band: '#ed7d31', borderColor: '#833c0c' },
  { id: 'dark-4', name: 'Table Style Dark 4', category: 'dark', header: '#595959', headerColor: '#fff', band: '#7f7f7f', borderColor: '#404040' },
  { id: 'dark-5', name: 'Table Style Dark 5', category: 'dark', header: '#bf8f00', headerColor: '#fff', band: '#ffc000', borderColor: '#806000' },
  { id: 'dark-6', name: 'Table Style Dark 6', category: 'dark', header: '#1f4e79', headerColor: '#fff', band: '#2e75b6', borderColor: '#16365c' },
  { id: 'dark-7', name: 'Table Style Dark 7', category: 'dark', header: '#375623', headerColor: '#fff', band: '#548235', borderColor: '#273c18' },

  // Row 2 (Dark 8 - 11)
  { id: 'dark-8', name: 'Table Style Dark 8', category: 'dark', header: '#1a1a1a', headerColor: '#fff', band: '#333333', borderColor: '#000000' },
  { id: 'dark-9', name: 'Table Style Dark 9', category: 'dark', header: '#833c0c', headerColor: '#fff', band: '#a64d14', borderColor: '#5e2605' },
  { id: 'dark-10', name: 'Table Style Dark 10', category: 'dark', header: '#806000', headerColor: '#fff', band: '#a67c00', borderColor: '#4d3900' },
  { id: 'dark-11', name: 'Table Style Dark 11', category: 'dark', header: '#273c18', headerColor: '#fff', band: '#375623', borderColor: '#16240d' },
];

export function applyTableStylePreset(controller: CalcController, preset: TableStylePreset): void {
  const table = controller.activeTable();
  if (table) {
    table.style = preset.id;
    const hasHeaders = table.headerRow !== false;
    const r1 = table.range.r1;
    controller.selectRange(table.range);
    controller.restyle((style, row) => {
      const isHeader = hasHeaders && row === r1;
      const banded = !isHeader && ((row - r1 - (hasHeaders ? 1 : 0)) % 2 === 0);
      return {
        ...style,
        bold: isHeader ? true : style.bold,
        color: isHeader ? (preset.headerColor ?? '#ffffff') : '#000000',
        fill: isHeader ? preset.header : banded ? preset.band : (preset.bandAlt ?? '#ffffff'),
        borders: { top: true, right: true, bottom: true, left: true },
      };
    });
    controller.wb.touch();
    controller.emit();
  } else {
    const sel = controller.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (controller.wb.getCell(controller.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : { ...sel };
    const tbl = controller.createTable(range, true);
    tbl.style = preset.id;
    controller.selectRange(range);
    controller.restyle((style, row) => {
      const isHeader = row === range.r1;
      const banded = !isHeader && ((row - range.r1 - 1) % 2 === 0);
      return {
        ...style,
        bold: isHeader ? true : style.bold,
        color: isHeader ? (preset.headerColor ?? '#ffffff') : '#000000',
        fill: isHeader ? preset.header : banded ? preset.band : (preset.bandAlt ?? '#ffffff'),
        borders: { top: true, right: true, bottom: true, left: true },
      };
    });
    controller.wb.touch();
    controller.emit();
  }
}

