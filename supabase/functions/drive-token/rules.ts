// Phần thuần của Edge Function drive-token: quyết định ai nhận token nào, dựng JWT, đọc khóa PEM.
// Tách riêng khỏi index.ts (cần Deno) để chạy test bằng Vitest, cùng khuôn với admin-users/rules.ts.

export type Role = 'master_admin' | 'user_admin' | 'user';

export const ROLES: readonly Role[] = ['master_admin', 'user_admin', 'user'];

export const isRole = (value: unknown): value is Role => typeof value === 'string' && (ROLES as readonly string[]).includes(value);

export const isAdminRole = (role: Role | null): boolean => role === 'master_admin' || role === 'user_admin';

export const DRIVE_SCOPE_WRITE = 'https://www.googleapis.com/auth/drive';
export const DRIVE_SCOPE_READ = 'https://www.googleapis.com/auth/drive.readonly';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type DriveAccess = 'write' | 'read';

export type DriveDecision = { allowed: true; access: DriveAccess } | { allowed: false; reason: string };

/**
 * Ai được lấy token Drive và ở mức nào.
 * `modules`: danh sách module trong UserModules; null = chưa có dòng (đủ mọi module). Hai vai trò quản trị luôn đủ module.
 * Cần module `storage` hoặc `dispatch`. Ghi được khi là quản trị hoặc có module `storage` (tải lên Kho chung hay kho cá nhân);
 * chỉ có `dispatch` thì chỉ đọc.
 */
export function decideDriveAccess(input: { role: Role | null; modules: readonly string[] | null; banned?: boolean }): DriveDecision {
  if (input.banned) return { allowed: false, reason: 'Tài khoản đã bị khóa.' };
  if (!input.role) return { allowed: false, reason: 'Tài khoản chưa được phân quyền.' };
  if (isAdminRole(input.role)) return { allowed: true, access: 'write' };
  const has = (m: string) => input.modules === null || input.modules.includes(m);
  if (has('storage')) return { allowed: true, access: 'write' };
  if (has('dispatch')) return { allowed: true, access: 'read' };
  return { allowed: false, reason: 'Tài khoản không có module Kho lưu trữ hay Văn thư.' };
}

export const scopeOf = (access: DriveAccess): string => (access === 'write' ? DRIVE_SCOPE_WRITE : DRIVE_SCOPE_READ);

/** Khóa riêng đọc từ biến môi trường hay JSON thường dính dấu nháy, dấu phẩy cuối hay "\\n" chữ thay cho xuống dòng. */
export function cleanPrivateKey(raw: string): string {
  let key = (raw || '').trim();
  if (key.endsWith(',')) key = key.slice(0, -1).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  return key.replace(/\\n/g, '\n').trim();
}

/** PEM PKCS#8 thành byte để nạp vào Web Crypto. Ném lỗi tiếng Việt khi không đúng dạng. */
export function pemToPkcs8(pem: string): Uint8Array {
  const cleaned = cleanPrivateKey(pem);
  const match = cleaned.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/); // secret-scan-ok
  if (!match) throw new Error('Khóa service account phải ở dạng PKCS#8 ("BEGIN PRIVATE KEY").');
  let binary: string;
  try {
    binary = atob(match[1].replace(/\s+/g, ''));
  } catch {
    throw new Error('Khóa service account có ký tự không hợp lệ.');
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function base64UrlEncode(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface JwtClaims {
  iss: string;
  scope: string;
  aud: string;
  iat: number;
  exp: number;
}

/** Nội dung JWT đổi lấy access token (service account, sống tối đa 1 giờ). `nowSeconds` truyền vào để test. */
export function buildJwtClaims(email: string, access: DriveAccess, nowSeconds: number): JwtClaims {
  return { iss: email, scope: scopeOf(access), aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 };
}

/** Phần "header.payload" cần ký của JWT RS256. */
export function jwtSigningInput(claims: JwtClaims): string {
  return `${base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64UrlEncode(JSON.stringify(claims))}`;
}

/** Token còn dùng được đủ lâu (còn trên `marginSeconds`) thì không cần xin lại. */
export function isTokenFresh(expiresAtSeconds: number, nowSeconds: number, marginSeconds = 300): boolean {
  return expiresAtSeconds > nowSeconds + marginSeconds;
}
