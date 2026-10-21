import { isValidUsername, normalizeUsername } from '../_shared/username.ts';

export interface UsernameLoginDependencies {
  consumeAttempt: (username: string) => Promise<boolean>;
  resolveEmail: (username: string) => Promise<string | null>;
  authenticate: (email: string, password: string) => Promise<unknown | null>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const INVALID = 'Tên đăng nhập hoặc mật khẩu không chính xác.';

export function createUsernameLoginHandler(deps: UsernameLoginDependencies) {
  return async (req: Request): Promise<Response> => {
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return json({ error: 'Chỉ hỗ trợ phương thức POST.' }, 405);
    try {
      const text = await req.text();
      if (text.length > 4096) return json({ error: 'Yêu cầu quá dài.' }, 413);
      let body: Record<string, unknown>;
      try { body = JSON.parse(text); } catch { return json({ error: INVALID }, 400); }
      if (!body || !isValidUsername(body.username) || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
        return json({ error: INVALID }, 400);
      }
      const username = normalizeUsername(body.username);
      if (!await deps.consumeAttempt(username)) {
        return json({ error: 'Đăng nhập quá nhiều lần. Vui lòng thử lại sau 5 phút.' }, 429);
      }
      const email = await deps.resolveEmail(username);
      const session = await deps.authenticate(email ?? `${username}@invalid.local`, body.password);
      if (!email || !session) return json({ error: INVALID }, 401);
      return json({ session });
    } catch {
      return json({ error: 'Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại.' }, 503);
    }
  };
}
