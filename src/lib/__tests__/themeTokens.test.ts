import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_TOKENS, type ThemeName } from '../themeTokens';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../index.css');
const css = readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

function tokensInBlockStartingAt(marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Không tìm thấy khối "${marker}" trong index.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*--t-([a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim().toUpperCase();
  }
  return out;
}

const CSS_BLOCK: Record<ThemeName, string> = {
  dark: ':root,\n:root.dark',
  light: ':root.light',
};

describe('index.css và themeTokens.ts phải khớp nhau', () => {
  for (const theme of ['dark', 'light'] as ThemeName[]) {
    it(`${theme}: mọi token khai trong TypeScript đều có trong CSS, cùng giá trị`, () => {
      const fromCss = tokensInBlockStartingAt(CSS_BLOCK[theme]);
      for (const [name, value] of Object.entries(THEME_TOKENS[theme])) {
        expect(fromCss[name], `index.css thiếu --t-${name} ở giao diện ${theme}`).toBeTruthy();
        expect(fromCss[name]).toBe(value.toUpperCase());
      }
    });

    it(`${theme}: CSS không có token thừa nào chưa khai trong TypeScript`, () => {
      const fromCss = tokensInBlockStartingAt(CSS_BLOCK[theme]);
      const known = new Set(Object.keys(THEME_TOKENS[theme]));
      const thua = Object.keys(fromCss).filter(k => !known.has(k));
      expect(thua, `token có trong CSS mà thiếu trong themeTokens.ts: ${thua.join(', ')}`).toEqual([]);
    });
  }
});
