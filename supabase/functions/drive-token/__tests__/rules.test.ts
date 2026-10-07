import { generateKeyPairSync, createVerify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DRIVE_SCOPE_READ, DRIVE_SCOPE_WRITE, TOKEN_URL, base64UrlEncode, buildJwtClaims, cleanPrivateKey, decideDriveAccess,
  isTokenFresh, jwtSigningInput, pemToPkcs8, scopeOf,
} from '../rules';

describe('decideDriveAccess', () => {
  it('hai vai trò quản trị luôn nhận token ghi, kể cả khi dòng module rỗng', () => {
    for (const role of ['master_admin', 'user_admin'] as const) {
      expect(decideDriveAccess({ role, modules: [] })).toEqual({ allowed: true, access: 'write' });
      expect(decideDriveAccess({ role, modules: null })).toEqual({ allowed: true, access: 'write' });
    }
  });

  it('User chưa có dòng module (đủ module) nhận token ghi', () => {
    expect(decideDriveAccess({ role: 'user', modules: null })).toEqual({ allowed: true, access: 'write' });
  });

  it('User có module Kho lưu trữ nhận token ghi', () => {
    expect(decideDriveAccess({ role: 'user', modules: ['storage'] })).toEqual({ allowed: true, access: 'write' });
    expect(decideDriveAccess({ role: 'user', modules: ['credit', 'storage'] })).toEqual({ allowed: true, access: 'write' });
  });

  it('User chỉ có module Văn thư chỉ nhận token đọc', () => {
    expect(decideDriveAccess({ role: 'user', modules: ['dispatch'] })).toEqual({ allowed: true, access: 'read' });
  });

  it('User không có module Kho lưu trữ hay Văn thư thì bị từ chối', () => {
    for (const modules of [[], ['credit'], ['rates', 'quiz']]) {
      const d = decideDriveAccess({ role: 'user', modules });
      expect(d.allowed).toBe(false);
      expect((d as { reason: string }).reason).toMatch(/module/);
    }
  });

  it('chưa phân quyền hoặc bị khóa thì bị từ chối, kể cả khi là vai trò quản trị', () => {
    expect(decideDriveAccess({ role: null, modules: null })).toMatchObject({ allowed: false, reason: expect.stringMatching(/chưa được phân quyền/) });
    expect(decideDriveAccess({ role: 'master_admin', modules: null, banned: true })).toMatchObject({ allowed: false, reason: expect.stringMatching(/bị khóa/) });
  });
});

describe('scopeOf', () => {
  it('ghi dùng quyền drive, đọc dùng drive.readonly', () => {
    expect(scopeOf('write')).toBe(DRIVE_SCOPE_WRITE);
    expect(scopeOf('read')).toBe(DRIVE_SCOPE_READ);
    expect(DRIVE_SCOPE_READ).toContain('readonly');
  });
});

describe('cleanPrivateKey', () => {
  const body = '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----'; // secret-scan-ok
  it('bỏ nháy, dấu phẩy cuối, đổi "\\n" chữ thành xuống dòng', () => {
    expect(cleanPrivateKey(`"${body.replace(/\n/g, '\\n')}",`)).toBe(body);
    expect(cleanPrivateKey(`'${body}'`)).toBe(body);
    expect(cleanPrivateKey(`  ${body}  `)).toBe(body);
  });
  it('chuỗi rỗng thì rỗng', () => {
    expect(cleanPrivateKey('')).toBe('');
  });
});

describe('pemToPkcs8', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });

  it('đọc PEM PKCS#8 thật, kể cả khi viết "\\n" chữ như trong JSON', () => {
    const der = pemToPkcs8(privateKey);
    expect(der.length).toBeGreaterThan(1000);
    expect(der[0]).toBe(0x30);
    expect(Buffer.from(pemToPkcs8(privateKey.replace(/\n/g, '\\n'))).equals(Buffer.from(der))).toBe(true);
  });

  it('khóa không đúng dạng thì báo lỗi rõ', () => {
    expect(() => pemToPkcs8('khong-phai-khoa')).toThrow(/PKCS#8/);
    expect(() => pemToPkcs8('-----BEGIN RSA PRIVATE KEY-----\nAAAA\n-----END RSA PRIVATE KEY-----')).toThrow(/PKCS#8/); // secret-scan-ok
    expect(() => pemToPkcs8('-----BEGIN PRIVATE KEY-----\n!!!\n-----END PRIVATE KEY-----')).toThrow(/ký tự không hợp lệ/); // secret-scan-ok
  });
});

describe('base64UrlEncode', () => {
  it('không có +, /, =', () => {
    expect(base64UrlEncode(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(base64UrlEncode('a')).toBe('YQ');
  });
  it('mã hóa UTF-8 đúng', () => {
    expect(base64UrlEncode('Đ')).toBe(Buffer.from('Đ').toString('base64url'));
  });
});

describe('JWT', () => {
  const claims = buildJwtClaims('sa@du-an.iam.gserviceaccount.com', 'read', 1_000_000);

  it('claim đúng mẫu service account: iss, scope, aud, hạn 1 giờ', () => {
    expect(claims).toEqual({
      iss: 'sa@du-an.iam.gserviceaccount.com', scope: DRIVE_SCOPE_READ, aud: TOKEN_URL, iat: 1_000_000, exp: 1_003_600,
    });
  });

  it('phần cần ký là header.payload RS256, giải ra đúng claim', () => {
    const [h, p, extra] = jwtSigningInput(claims).split('.');
    expect(extra).toBeUndefined();
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(p, 'base64url').toString())).toEqual(claims);
  });

  it('ký bằng Web Crypto với khóa PKCS#8 thì xác minh được bằng khóa công khai (đúng cách index.ts ký)', async () => {
    const pair = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
    const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(pair.privateKey), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
    const input = jwtSigningInput(claims);
    const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input)));
    const verifier = createVerify('RSA-SHA256');
    verifier.update(input);
    expect(verifier.verify(pair.publicKey, Buffer.from(base64UrlEncode(sig), 'base64url'))).toBe(true);
  });
});

describe('isTokenFresh', () => {
  it('còn trên 5 phút thì dùng lại, sát hạn thì xin lại', () => {
    expect(isTokenFresh(1000 + 301, 1000)).toBe(true);
    expect(isTokenFresh(1000 + 300, 1000)).toBe(false);
    expect(isTokenFresh(900, 1000)).toBe(false);
  });
});
