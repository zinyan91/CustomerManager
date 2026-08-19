import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../appVersion';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const doc = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('APP_VERSION', () => {
  it('có dạng x.y.z', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('khớp version trong package.json', () => {
    expect(JSON.parse(doc('package.json')).version).toBe(APP_VERSION);
  });

  it('Sidebar và LoginView đọc phiên bản từ nguồn chung', () => {
    for (const p of ['src/components/Sidebar.tsx', 'src/components/LoginView.tsx']) {
      expect(doc(p), `${p} không nhập APP_VERSION`).toContain("from '../lib/appVersion'");
      expect(doc(p), `${p} vẫn dùng APP_VERSION trong JSX`).toContain('{APP_VERSION}');
    }
  });

  it('không còn hai chuỗi phiên bản ghi cứng đã mâu thuẫn trước đây', () => {
    expect(doc('src/components/Sidebar.tsx')).not.toContain('2.4.0');
    expect(doc('src/components/LoginView.tsx')).not.toContain('v2.5.0 Stable');
  });
});
