// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
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
    expect(FILES.length).toBeGreaterThan(60);
  });

  it('thư viện tệp (exceljs, jszip, docx, mammoth) chỉ được nạp lười, không nhập tĩnh vào gói chính', () => {
    for (const { path, text } of FILES) {
      expect(/^\s*import(?!\s+type)[^'"\n]*from\s+['"](exceljs|jszip|docx|mammoth)['"]/m.test(text), `${path} nhập tĩnh thư viện tệp`).toBe(false);
    }
  });

  it('trình soạn Tiptap chỉ nằm trong writer/, không lan sang Bảng tính hay khung', () => {
    for (const { path, text } of FILES) {
      if (path.includes('src/office/writer/')) continue;
      expect(text.includes('@tiptap/'), `${path} dùng Tiptap ngoài writer/`).toBe(false);
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

  it('chỉ chạm vào ứng dụng ở vài điểm: đăng nhập, ngôn ngữ, tuyến, module, khung và Kho lưu trữ', () => {
    // Đường dẫn tính từ src/. Mã Office nhập gì ngoài src/office thì phải nằm trong danh sách này.
    const allowed = [
      'context/AuthContext', 'context/LanguageContext', 'lib/i18n', 'lib/routes',
      'components/LoginView', 'components/ErrorBoundary', 'components/ModuleGate',
      // Lưu vào và mở từ Kho lưu trữ (Google Drive)
      'hooks/useArchive', 'lib/archivePath', 'lib/archiveStatus', 'lib/dispatch/folderBrowse', 'lib/formatBytes', 'lib/storageRepos',
      'lib/drive/driveClient', 'lib/drive/driveDocuments', 'lib/drive/driveOps', 'lib/drive/driveToken', 'lib/drive/driveTypes', 'lib/drive/driveUpload',
      'types/dispatch',
    ];
    const SRC = resolve(process.cwd(), 'src');
    for (const { path, text } of FILES) {
      for (const m of text.matchAll(/from\s+['"](\.{1,2}\/[^'"]*)['"]/g)) {
        const target = resolve(dirname(resolve(process.cwd(), path)), m[1]);
        if (target.startsWith(ROOT)) continue;
        const fromSrc = relative(SRC, target).split('\\').join('/');
        expect(allowed.includes(fromSrc), `${path} nhập ${m[1]} (src/${fromSrc})`).toBe(true);
      }
    }
  });
});
