import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ROUTE_OF } from '../../routes';
import { ADMIN_NAV } from '../../adminNav';
import { taiKhoTriThuc } from '../triThuc/khoTriThuc';
import { GIOI_HAN_BAN_DO, GIOI_HAN_TEP, dungBanDo } from '../triThuc/phanTichTriThuc';

const THU_MUC = fileURLToPath(new URL('../triThuc/noi-dung/', import.meta.url));
const tepMd = existsSync(THU_MUC) ? readdirSync(THU_MUC).filter((t) => t.endsWith('.md')) : [];

const TAT_CA_TRANG = new Set([...Object.values(ROUTE_OF), ...ADMIN_NAV.map((i) => i.path)]);

/** Trang chưa có tri thức. Chỉ được GIẢM: viết xong chủ đề nào thì xóa trang đó khỏi danh sách. */
const CHUA_VIET: string[] = [
  '/dashboard', '/hub',
  '/dispatches',
  '/tools/business-plan', '/tools/inventory', '/tools/shopping-checklist',
  '/tools/purchase-statement', '/tools/retail-invoice', '/tools/rate-quote', '/tools/cost-of-funds',
  '/tools/reports', '/office', '/reference/loan-purpose', '/reference/card-policies',
  '/reference/templates', '/reference/quiz', '/admin', '/settings',
  '/admin/users', '/admin/transfer',
];

const GIONG_BI_MAT: [string, RegExp][] = [
  ['khóa Google API', /AIza[0-9A-Za-z_-]{35}/],
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/],
  ['khóa kiểu sk-', /\bsk-[A-Za-z0-9]{20,}/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['khóa riêng', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['URL kèm tài khoản:mật khẩu', /https?:\/\/[^/\s:@]+:[^/\s@]+@/],
  ['gán bí mật', /(secret|token|password|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-/+=]{12,}/i],
];

describe('kho tri thức AI', () => {
  it('mọi tệp: không BOM, đúng cỡ, tên tệp trùng id', async () => {
    const kho = await taiKhoTriThuc();
    expect(kho).toHaveLength(tepMd.length);
    for (const ten of tepMd) {
      const raw = readFileSync(resolve(THU_MUC, ten));
      expect(raw[0] === 0xef && raw[1] === 0xbb, `${ten} có BOM`).toBe(false);
      expect(raw.length, `${ten} vượt ${GIOI_HAN_TEP} byte`).toBeLessThanOrEqual(GIOI_HAN_TEP);
    }
    expect(kho.map((c) => `${c.id}.md`).sort()).toEqual([...tepMd].sort());
  });

  it('bản đồ chủ đề không vượt giới hạn', async () => {
    const kho = await taiKhoTriThuc();
    expect(Buffer.byteLength(dungBanDo(kho)), 'bản đồ quá lớn: gộp chủ đề hoặc rút tiêu đề').toBeLessThanOrEqual(GIOI_HAN_BAN_DO);
  });

  it('mọi tệp trong `nguon` còn tồn tại trong src', async () => {
    const kho = await taiKhoTriThuc();
    const mat = kho.flatMap((c) => c.nguon.filter((n) => !existsSync(resolve(process.cwd(), n))).map((n) => `${c.id}: ${n}`));
    expect(mat, 'tệp nguồn đã đổi tên hoặc bị xóa: cập nhật tri thức').toEqual([]);
  });

  it('mọi đường dẫn trong `trang` là đường dẫn có thật', async () => {
    const kho = await taiKhoTriThuc();
    const la = kho.flatMap((c) => c.trang.filter((p) => !TAT_CA_TRANG.has(p)).map((p) => `${c.id}: ${p}`));
    expect(la).toEqual([]);
  });

  it('không chứa chuỗi giống bí mật', () => {
    const vang: string[] = [];
    for (const ten of tepMd) {
      const text = readFileSync(resolve(THU_MUC, ten), 'utf8');
      for (const [nhan, mau] of GIONG_BI_MAT) if (mau.test(text)) vang.push(`${ten}: ${nhan}`);
    }
    expect(vang).toEqual([]);
  });

  it('mọi trang đều có tri thức, trừ các trang còn nợ trong CHUA_VIET (danh sách chỉ giảm)', async () => {
    const kho = await taiKhoTriThuc();
    const daPhu = new Set(kho.flatMap((c) => c.trang));
    const thieu = [...TAT_CA_TRANG].filter((p) => !daPhu.has(p));
    expect(thieu.filter((p) => !CHUA_VIET.includes(p)), 'trang chưa có tri thức và chưa nằm trong CHUA_VIET').toEqual([]);
    expect(CHUA_VIET.filter((p) => daPhu.has(p)), 'trang đã có tri thức: xóa khỏi CHUA_VIET').toEqual([]);
    expect(CHUA_VIET.filter((p) => !TAT_CA_TRANG.has(p)), 'CHUA_VIET có đường dẫn không tồn tại').toEqual([]);
  });
});
