import type { BorderLine, BorderLineStyle } from '../model/workbook';

/** Excel's border styles that this draws, as the width in pixels and the CSS style they take. */
const LOOK: Record<BorderLineStyle, { width: number; css: string }> = {
  hair: { width: 1, css: 'dotted' },
  thin: { width: 1, css: 'solid' },
  dotted: { width: 1, css: 'dotted' },
  dashed: { width: 1, css: 'dashed' },
  medium: { width: 2, css: 'solid' },
  thick: { width: 3, css: 'solid' },
  double: { width: 3, css: 'double' },
};

export const BORDER_STYLES = Object.keys(LOOK) as BorderLineStyle[];

/** A border edge as CSS (`1px solid ink`); undefined when the edge is off. `true` is a thin line in the ink colour. */
export function borderCss(edge: boolean | BorderLine | undefined, ink: string): string | undefined {
  if (!edge) return undefined;
  const line: BorderLine = edge === true ? { style: 'thin' } : edge;
  const look = LOOK[line.style] ?? LOOK.thin;
  return `${look.width}px ${look.css} ${line.color ?? ink}`;
}

/** A cell's diagonals as CSS background images (one gradient line each), for the grid and for print. */
export function diagonalBackground(borders: { diagonalUp?: boolean | BorderLine; diagonalDown?: boolean | BorderLine } | undefined, ink: string): string | undefined {
  const layers: string[] = [];
  const layer = (edge: boolean | BorderLine | undefined, direction: string) => {
    if (!edge) return;
    const line: BorderLine = edge === true ? { style: 'thin' } : edge;
    const half = (LOOK[line.style] ?? LOOK.thin).width / 2 + 0.5;
    const color = line.color ?? ink;
    layers.push(`linear-gradient(${direction}, transparent calc(50% - ${half}px), ${color} calc(50% - ${half - 0.5}px), ${color} calc(50% + ${half - 0.5}px), transparent calc(50% + ${half}px))`);
  };
  layer(borders?.diagonalDown, 'to top right');
  layer(borders?.diagonalUp, 'to bottom right');
  return layers.length ? layers.join(', ') : undefined;
}

/** What to keep of an edge: a plain thin line in the default colour is just `true`. */
export function simpleEdge(line: BorderLine | undefined): boolean | BorderLine | undefined {
  if (!line) return undefined;
  return line.style === 'thin' && !line.color ? true : line;
}

/** The edge as a line (a plain `true` being thin). */
export function edgeLine(edge: boolean | BorderLine | undefined): BorderLine | undefined {
  return !edge ? undefined : edge === true ? { style: 'thin' } : edge;
}
