import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const nguon = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../Header.tsx'),
  'utf8'
);

describe('Header không tự truy vấn cơ sở dữ liệu', () => {
  it('không nhập supabase', () => {
    expect(nguon).not.toContain("from '../lib/supabase'");
  });

  it('không đặt vòng lặp định kỳ', () => {
    expect(nguon).not.toContain('setInterval');
  });

  it('trạng thái kết nối đọc từ trình duyệt', () => {
    expect(nguon).toContain('navigator.onLine');
  });
});
