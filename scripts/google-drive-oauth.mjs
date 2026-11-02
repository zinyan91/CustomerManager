// Lấy refresh token Google Drive cho Edge Function drive-token (chạy một lần trên máy, đăng nhập bằng Gmail giữ kho).
//
//   node scripts/google-drive-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>
//
// OAuth client phải là loại "Desktop app". Màn hình đồng ý phải ở trạng thái "In production",
// ở "Testing" Google thu hồi refresh token sau 7 ngày.
// Script chỉ in refresh token ra màn hình, không ghi vào tệp nào.

import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';

const [clientId, clientSecret] = process.argv.slice(2);
if (!clientId || !clientSecret) {
  console.error('Cách dùng: node scripts/google-drive-oauth.mjs <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}

// Xin cả hai phạm vi để Edge Function cấp được token chỉ đọc cho người chỉ dùng Văn thư
const SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.readonly'];
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('hex');

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname !== '/') {
    res.writeHead(404).end();
    return;
  }
  const finish = (status, text) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }).end(text);
    server.close();
  };
  if (url.searchParams.get('state') !== state) return finish(400, 'Sai state, chạy lại script.');
  const error = url.searchParams.get('error');
  if (error) {
    console.error(`Google trả lỗi: ${error}`);
    return finish(400, `Google trả lỗi: ${error}`);
  }

  const { port } = server.address();
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: url.searchParams.get('code') ?? '',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `http://127.0.0.1:${port}`,
      code_verifier: verifier,
    }),
  });
  const body = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !body.refresh_token) {
    console.error('Không nhận được refresh token:', body.error_description ?? body.error ?? tokenRes.statusText);
    console.error('Nếu đã cấp quyền trước đó: vào myaccount.google.com/permissions gỡ ứng dụng rồi chạy lại.');
    return finish(500, 'Không nhận được refresh token, xem cửa sổ dòng lệnh.');
  }
  console.log('\nRefresh token (đặt vào secret GDRIVE_OAUTH_REFRESH_TOKEN):\n');
  console.log(body.refresh_token);
  console.log('');
  finish(200, 'Xong. Quay lại cửa sổ dòng lệnh để lấy refresh token, rồi đóng trang này.');
});

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `http://127.0.0.1:${port}`,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  }).toString();
  console.log('Mở liên kết này trong trình duyệt, đăng nhập bằng Gmail giữ kho và bấm Cho phép:\n');
  console.log(auth.toString());
});
