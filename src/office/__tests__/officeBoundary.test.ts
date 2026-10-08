// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd(), 'src/office');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const FILES = sources(ROOT).map((path) => ({ path: relative(process.cwd(), path).replace(/\\/g, '/'), text: readFileSync(path, 'utf8') }));

describe('ranh giới của khối Office (src/office)', () => {
  it('có mã để kiểm tra', () => {
    expect(FILES.length).toBeGreaterThan(30);
  });

  it('thư viện tệp (exceljs, jszip) chỉ được nạp lười, không nhập tĩnh vào gói chính', () => {
    for (const { path, text } of FILES) {
      expect(/^\s*import(?!\s+type)[^'"\n]*from\s+['"](exceljs|jszip)['"]/m.test(text), `${path} nhập tĩnh exceljs/jszip`).toBe(false);
    }
  });

  it('không dính phần dành cho ứng dụng Windows (Tauri) của bản gốc', () => {
    for (const { path, text } of FILES) {
      expect(/@tauri-apps|VITE_PLATFORM|VITE_OFFICE_APP/.test(text), `${path} còn mã Tauri hoặc chế độ nhiều ứng dụng`).toBe(false);
    }
  });

  it('tải xuống tệp chỉ đi qua shared/files.ts', () => {
    for (const { path, text } of FILES) {
      if (path.endsWith('shared/files.ts')) continue;
      expect(/createObjectURL/.test(text), `${path} tự tạo liên kết tải xuống`).toBe(false);
    }
  });

  it('chỉ chạm vào ứng dụng ở vài điểm: ngữ cảnh đăng nhập, ngôn ngữ, tuyến, module và vài thành phần khung', () => {
    const allowed = [
      '../../context/AuthContext', '../context/AuthContext', '../../context/LanguageContext', '../../lib/i18n',
      '../../lib/routes', '../lib/routes', '../components/LoginView', '../components/ErrorBoundary', '../components/ModuleGate',
    ];
    for (const { path, text } of FILES) {
      for (const m of text.matchAll(/from\s+['"](\.\.\/[^'"]*(?:context|lib|components)\/[^'"]*)['"]/g)) {
        const target = m[1];
        // Đường dẫn trong nội bộ src/office (calc/, shared/, i18n/) luôn hợp lệ
        if (/^\.\.\/(\.\.\/)?(calc|shared|i18n|model|engine|services|utils|components|styles)\b/.test(target) && !target.includes('context/') && !target.includes('lib/')) continue;
        expect(allowed.some((a) => target.startsWith(a)), `${path} nhập ${target}`).toBe(true);
      }
    }
  });
});
