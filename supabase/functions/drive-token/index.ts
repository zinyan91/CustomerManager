// Edge Function drive-token: cấp access token Google Drive (sống 1 giờ) cho người đăng nhập có quyền dùng Kho lưu trữ.
// Thông tin xin token nằm ở secret của Supabase; trình duyệt chỉ nhận token ngắn hạn rồi gọi thẳng Drive,
// nên tệp không đi qua máy chủ nào của ứng dụng.
//
// My Drive của một tài khoản Google (khuyên dùng): GDRIVE_OAUTH_CLIENT_ID, GDRIVE_OAUTH_CLIENT_SECRET,
//   GDRIVE_OAUTH_REFRESH_TOKEN (lấy bằng scripts/google-drive-oauth.mjs), tùy chọn GDRIVE_ROOT_FOLDER_ID (mặc định gốc My Drive).
// Shared Drive qua service account (cách cũ, dùng khi chưa đặt OAuth): GDRIVE_SA_EMAIL, GDRIVE_SA_PRIVATE_KEY, GDRIVE_SHARED_DRIVE_ID
// Triển khai: supabase functions deploy drive-token   (verify_jwt phải BẬT, là mặc định)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  TOKEN_URL, base64UrlEncode, buildJwtClaims, decideDriveAccess, isRole, isTokenFresh, jwtSigningInput, pemToPkcs8,
  refreshTokenBody, resolveDriveCredentials, type DriveAccess, type DriveCredentials,
} from './rules.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 200) => json({ ok: false, error }, status);

interface CachedToken {
  accessToken: string;
  expiresAt: number; // giây Unix
}
// Mỗi mức (ghi, đọc) giữ một token trong bộ nhớ của instance để không xin Google mỗi lần
const cache = new Map<DriveAccess, CachedToken>();
const pending = new Map<DriveAccess, Promise<CachedToken>>();

async function serviceAccountBody(email: string, privateKey: string, access: DriveAccess, now: number): Promise<Record<string, string>> {
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const input = jwtSigningInput(buildJwtClaims(email, access, now));
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input)));
  return { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${input}.${base64UrlEncode(signature)}` };
}

async function requestToken(creds: DriveCredentials, access: DriveAccess): Promise<CachedToken> {
  const now = Math.floor(Date.now() / 1000);
  const form = creds.mode === 'oauth'
    ? refreshTokenBody(creds.clientId, creds.clientSecret, creds.refreshToken, access)
    : await serviceAccountBody(creds.email, creds.privateKey, access, now);

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    // invalid_grant với OAuth: refresh token bị thu hồi, đổi mật khẩu, hoặc ứng dụng còn ở chế độ Testing (hết hạn sau 7 ngày)
    const hint = creds.mode === 'oauth' && body.error === 'invalid_grant' ? ' Lấy lại refresh token bằng scripts/google-drive-oauth.mjs rồi cập nhật secret GDRIVE_OAUTH_REFRESH_TOKEN.' : '';
    throw new Error(`Google từ chối cấp token: ${body.error_description ?? body.error ?? res.statusText}.${hint}`);
  }
  return { accessToken: body.access_token, expiresAt: now + (body.expires_in ?? 3600) };
}

async function tokenFor(creds: DriveCredentials, access: DriveAccess): Promise<CachedToken> {
  const now = Math.floor(Date.now() / 1000);
  const cached = cache.get(access);
  if (cached && isTokenFresh(cached.expiresAt, now)) return cached;
  let inflight = pending.get(access);
  if (!inflight) {
    inflight = requestToken(creds, access)
      .then((t) => {
        cache.set(access, t);
        return t;
      })
      .finally(() => pending.delete(access));
    pending.set(access, inflight);
  }
  return inflight;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('Chỉ hỗ trợ phương thức POST.', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return fail('Edge Function chưa có cấu hình Supabase.', 500);
  const resolved = resolveDriveCredentials((name) => Deno.env.get(name));
  if (!resolved.ok) return fail(`Chưa đặt secret ${resolved.missing.join(', ')} cho Edge Function drive-token.`, 500);
  const creds = resolved.credentials;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // Ai đang gọi: xác minh JWT rồi đọc vai trò và module từ CSDL, không tin dữ liệu do trình duyệt gửi
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !auth.user) return fail('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.', 401);

    const [roleRes, modulesRes] = await Promise.all([
      admin.from('UserRoles').select('Role').eq('UserId', auth.user.id).maybeSingle(),
      admin.from('UserModules').select('Modules').eq('UserId', auth.user.id).maybeSingle(),
    ]);
    if (roleRes.error) return fail(`Không đọc được vai trò: ${roleRes.error.message}`, 500);
    // Bảng UserModules chưa có (chưa áp migration 65) thì không chặn theo module
    const modules = modulesRes.error ? null : (modulesRes.data?.Modules as string[] | null | undefined) ?? null;

    const role = isRole(roleRes.data?.Role) ? roleRes.data.Role : null;
    const banned = Boolean((auth.user as { banned_until?: string | null }).banned_until && new Date((auth.user as { banned_until: string }).banned_until) > new Date());
    const decision = decideDriveAccess({ role, modules, banned });
    if (!decision.allowed) return fail(decision.reason, 403);

    const token = await tokenFor(creds, decision.access);
    const { rootFolderId } = creds;
    // driveId giữ cho bản web cũ còn đang mở trong trình duyệt
    return json({ ok: true, data: { accessToken: token.accessToken, expiresAt: token.expiresAt * 1000, access: decision.access, rootFolderId, driveId: rootFolderId } });
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Lỗi không xác định.', 500);
  }
});
