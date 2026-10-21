import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ invoke: vi.fn(), setSession: vi.fn() }));
vi.mock('../../supabase', () => ({
  supabase: { functions: { invoke: h.invoke }, auth: { setSession: h.setSession } },
}));
import { signInWithUsername } from '../usernameLogin';

beforeEach(() => {
  vi.resetAllMocks();
  h.setSession.mockResolvedValue({ error: null });
});

describe('signInWithUsername', () => {
  it('chuẩn hoá username, nhận phiên từ server rồi cài phiên vào client', async () => {
    const session = { access_token: 'fixture-access', refresh_token: 'fixture-refresh' };
    h.invoke.mockResolvedValue({ data: { session }, error: null });
    await signInWithUsername(' Test.User ', 'fixture-password');
    expect(h.invoke).toHaveBeenCalledWith('username-login', { body: { username: 'test.user', password: 'fixture-password' } });
    expect(h.setSession).toHaveBeenCalledWith(session);
  });
  it('hiện nguyên lỗi mật khẩu và giới hạn của server, không cài phiên', async () => {
    h.invoke.mockResolvedValue({ error: { context: { json: async () => ({ error: 'Đăng nhập quá nhiều lần.' }) } } });
    await expect(signInWithUsername('test', 'fixture')).rejects.toThrow('Đăng nhập quá nhiều lần.');
    expect(h.setSession).not.toHaveBeenCalled();
  });
  it('từ chối phản hồi thiếu token', async () => {
    h.invoke.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(signInWithUsername('test', 'fixture')).rejects.toThrow(/phiên không hợp lệ/);
    expect(h.setSession).not.toHaveBeenCalled();
  });
});
