import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

describe('username migration', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, email text, encrypted_password text);
      create table public."UserRoles"("UserId" uuid primary key, "Role" text);
      insert into auth.users values
        ('11111111-1111-4111-8111-111111111111','same@one.local','unchanged'),
        ('22222222-2222-4222-8222-222222222222','same@two.local','unchanged'),
        ('33333333-3333-4333-8333-333333333333','admin@app.local','unchanged');
      insert into public."UserRoles" select id,'user' from auth.users;
    `);
    await db.exec(readFileSync('supabase/migrations/20261021071942_username_login.sql', 'utf8'));
  }, 20000);
  afterAll(async () => { await db?.close(); });

  it('backfill không đổi email, mật khẩu, UUID và không trùng username', async () => {
    const { rows } = await db.query<{ Username: string; email: string; encrypted_password: string }>(`
      select r."Username",u.email,u.encrypted_password from public."UserRoles" r join auth.users u on u.id=r."UserId" order by u.id
    `);
    expect(rows.map(r => r.Username)).toEqual(['same', 'same_222222222222', 'admin']);
    expect(rows.map(r => r.email)).toEqual(['same@one.local', 'same@two.local', 'admin@app.local']);
    expect(rows.every(r => r.encrypted_password === 'unchanged')).toBe(true);
  });

  it('tên trùng và không đúng định dạng bị từ chối', async () => {
    await expect(db.exec(`update public."UserRoles" set "Username"='same' where "Username"='admin'`)).rejects.toThrow(/unique/);
    await expect(db.exec(`update public."UserRoles" set "Username"='Name With Spaces' where "Username"='admin'`)).rejects.toThrow(/check constraint/);
  });

  it('giới hạn nguyên tử theo username và trả lại lượt sau 5 phút', async () => {
    for (let i = 0; i < 10; i++) {
      expect((await db.query<{ allowed: boolean }>(`select public.consume_username_login_attempt('admin') as allowed`)).rows[0].allowed).toBe(true);
    }
    expect((await db.query<{ allowed: boolean }>(`select public.consume_username_login_attempt('ADMIN') as allowed`)).rows[0].allowed).toBe(false);
    await db.exec(`update app_auth.login_attempts set window_start=statement_timestamp()-interval '6 minutes'`);
    expect((await db.query<{ allowed: boolean }>(`select public.consume_username_login_attempt('admin') as allowed`)).rows[0].allowed).toBe(true);
  });

  it('anon/authenticated không gọi limiter hoặc đọc bảng giới hạn', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await expect(db.exec(`select public.consume_username_login_attempt('admin')`)).rejects.toThrow(/permission denied/);
      await expect(db.exec('select * from app_auth.login_attempts')).rejects.toThrow(/permission denied/);
      await db.exec('reset role');
    }
  });
});
