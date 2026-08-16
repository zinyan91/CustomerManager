import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/index.css', 'utf-8');

function khoiToken(selector: string): Record<string, string> {
  const i = css.indexOf(selector);
  const j = css.indexOf('}', i);
  const out: Record<string, string> = {};
  for (const m of css.slice(i, j).matchAll(/--t-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function doSang(hex: string): number {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(v[0]) + 0.7152 * f(v[1]) + 0.0722 * f(v[2]);
}

export function tuongPhan(a: string, b: string): number {
  const la = doSang(a);
  const lb = doSang(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const AA = 4.5;
const NEN = ['panel', 'surface', 'panel-muted'];
const CHU = ['ink', 'ink-muted', 'ink-faint', 'accent', 'pos', 'neg', 'warn',
  'g1', 'g2', 'g3', 'g4', 'g5'];
const BADGE = ['pos', 'neg', 'warn', 'accent'];

describe.each([
  ['nền tối', ':root.dark'],
  ['nền sáng', ':root.light'],
])('tương phản token — %s', (_ten, selector) => {
  const t = khoiToken(selector);

  it('đọc được đủ token', () => {
    expect(Object.keys(t).length).toBeGreaterThan(20);
  });

  it.each(CHU)('%s đạt AA trên mọi nền', chu => {
    for (const nen of NEN) {
      expect(
        Number(tuongPhan(t[chu], t[nen]).toFixed(2)),
        `${chu} trên ${nen}`
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it.each(BADGE)('%s đạt AA trên nền nhạt cùng nghĩa', c => {
    expect(
      Number(tuongPhan(t[c], t[`${c}-soft`]).toFixed(2)),
      `${c} trên ${c}-soft`
    ).toBeGreaterThanOrEqual(AA);
  });

  it('chữ trên nút nhấn chính đạt AA', () => {
    expect(Number(tuongPhan(t['accent-ink'], t.accent).toFixed(2))).toBeGreaterThanOrEqual(AA);
  });
});
