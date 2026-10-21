import { describe, expect, it, vi } from 'vitest';
import { createUsernameLoginHandler } from '../../../supabase/functions/username-login/handler';
import { isValidUsername, normalizeUsername } from '../../../supabase/functions/_shared/username';
import { checkAdminAction } from '../../../supabase/functions/admin-users/rules';

const request = (body: unknown) => new Request('https://fixture.local/login', {
  method: 'POST', body: JSON.stringify(body),
});

describe('username', () => {
  it('chuẩn hoá và kiểm tra tên, không chấp nhận email hoặc ký tự đặc biệt', () => {
    expect(normalizeUsername('  Thanh.Tung  ')).toBe('thanh.tung');
    for (const value of ['a', 'thanh.tung', 'nhu_01', 'cong-bang', 'Admin']) expect(isValidUsername(value)).toBe(true);
    for (const value of ['', ' ', 'tùng', 'a@b.vn', 'a b', '_abc', 'a'.repeat(65), null, {}]) expect(isValidUsername(value)).toBe(false);
  });

  it('admin tạo và đổi username phải kiểm tra ở server', () => {
    const actor = { id: 'admin', role: 'master_admin' as const };
    expect(checkAdminAction(actor, { action: 'create', username: 'Thanh.Tung', fullName: 'Tùng', role: 'user', password: 'fixture-password' }, null)).toBeNull();
    expect(checkAdminAction(actor, { action: 'update', userId: 'user', username: 'x@y.vn' }, { role: 'user' })).toMatch(/Tên đăng nhập/);
    expect(checkAdminAction({ id: 'user', role: 'user' }, { action: 'update', userId: 'other', username: 'abc' }, { role: 'user' })).toMatch(/Chỉ Master Admin/);
  });
});

describe('username-login handler', () => {
  const setup = () => {
    const deps = {
      consumeAttempt: vi.fn().mockResolvedValue(true),
      resolveEmail: vi.fn().mockResolvedValue('internal@fixture.local'),
      authenticate: vi.fn().mockResolvedValue({ access_token: 'fixture-access', refresh_token: 'fixture-refresh' }),
    };
    return { deps, handle: createUsernameLoginHandler(deps) };
  };

  it('xác thực mật khẩu ở server rồi mới trả phiên, không trả bản đồ email', async () => {
    const { deps, handle } = setup();
    const res = await handle(request({ username: ' Test.User ', password: 'fixture-password' }));
    expect(res.status).toBe(200);
    expect(deps.resolveEmail).toHaveBeenCalledWith('test.user');
    expect(deps.authenticate).toHaveBeenCalledWith('internal@fixture.local', 'fixture-password');
    expect(await res.json()).toEqual({ session: { access_token: 'fixture-access', refresh_token: 'fixture-refresh' } });
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('sai mật khẩu và không có username trả cùng lỗi, đều thực hiện xác thực', async () => {
    const { deps, handle } = setup();
    deps.authenticate.mockResolvedValue(null);
    const wrong = await handle(request({ username: 'test', password: 'wrong' }));
    deps.resolveEmail.mockResolvedValue(null);
    const missing = await handle(request({ username: 'missing', password: 'wrong' }));
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(await wrong.json()).toEqual(await missing.json());
    expect(deps.authenticate).toHaveBeenCalledTimes(2);
  });

  it('quá giới hạn không tra tài khoản và không gọi Auth', async () => {
    const { deps, handle } = setup();
    deps.consumeAttempt.mockResolvedValue(false);
    const res = await handle(request({ username: 'test', password: 'fixture' }));
    expect(res.status).toBe(429);
    expect(deps.resolveEmail).not.toHaveBeenCalled();
    expect(deps.authenticate).not.toHaveBeenCalled();
  });

  it('không cho request lỗi hoặc mật khẩu quá dài đi tới DB', async () => {
    const { deps, handle } = setup();
    for (const body of [null, {}, { username: 'x@y.vn', password: 'x' }, { username: 'x', password: 'a'.repeat(1025) }]) {
      expect((await handle(request(body))).status).toBe(400);
    }
    expect(deps.consumeAttempt).not.toHaveBeenCalled();
  });

  it('lỗi hạ tầng không lộ thông tin server và không tạo phiên', async () => {
    const { deps, handle } = setup();
    deps.resolveEmail.mockRejectedValue(new Error('secret internal detail'));
    const res = await handle(request({ username: 'test', password: 'fixture' }));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
    expect(deps.authenticate).not.toHaveBeenCalled();
  });
});
