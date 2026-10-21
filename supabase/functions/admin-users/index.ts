// Edge Function admin-users: quản lý tài khoản đăng nhập cho Master Admin và User Admin.
// Giữ khóa service_role ở máy chủ; trình duyệt chỉ gọi hàm này bằng JWT của người đăng nhập.
// Mọi luật phân quyền được kiểm lại ở đây (rules.ts), giao diện chỉ để ẩn nút.
//
// Triển khai: supabase functions deploy admin-users   (verify_jwt phải BẬT, là mặc định)

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkAdminAction, isAdminRole, isRole, type Actor, type AdminAction, type Role } from './rules.ts';
import { normalizeUsername } from '../_shared/username.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (error: string, status = 200) => json({ ok: false, error }, status);

// Khóa vĩnh viễn thực tế (~100 năm); 'none' là mở khóa
const BAN_FOREVER = '876000h';

// Bảng còn tham chiếu tài khoản bằng khóa ngoại NO ACTION: còn dòng thì không xóa hẳn được
const DELETE_BLOCKERS: Array<{ table: string; column: string; label: string }> = [
  { table: 'Customers', column: 'OwnerId', label: 'khách hàng phụ trách' },
  { table: 'CollateralAppraisals', column: 'PerformedBy', label: 'lần thẩm định tài sản' },
  { table: 'PostLoanControlRecords', column: 'PerformedBy', label: 'bản ghi kiểm soát sau vay' },
  { table: 'QuizQuestions', column: 'CreatedBy', label: 'câu hỏi trắc nghiệm' },
  { table: 'TeamMemberships', column: 'UserId', label: 'lịch sử thành viên team' },
  { table: 'MemberKpiTargets', column: 'UserId', label: 'chỉ tiêu KPI' },
  { table: 'KpiObservations', column: 'UserId', label: 'số liệu KPI' },
  { table: 'KpiInputBatches', column: 'PublishedBy', label: 'lần công bố KPI' },
  { table: 'KpiAuditLog', column: 'ChangedBy', label: 'nhật ký KPI' },
];

function describeAuthError(message: string): string {
  if (/already (been )?registered|already exists/i.test(message)) return 'Email này đã được dùng cho một tài khoản khác.';
  if (/password/i.test(message)) return `Mật khẩu bị từ chối: ${message}`;
  return message;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('Chỉ hỗ trợ phương thức POST.', 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return fail('Edge Function chưa có cấu hình Supabase.', 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    // 1. Ai đang gọi: xác minh JWT rồi đọc vai trò từ CSDL, không tin dữ liệu do trình duyệt gửi
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !auth.user) return fail('Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.', 401);

    const { data: roleRow, error: roleErr } = await admin.from('UserRoles').select('Role').eq('UserId', auth.user.id).maybeSingle();
    if (roleErr) return fail(`Không đọc được vai trò của bạn: ${roleErr.message}`, 500);
    const actor: Actor = { id: auth.user.id, role: isRole(roleRow?.Role) ? roleRow.Role : null };
    if (!isAdminRole(actor.role)) return fail('Chỉ Master Admin và User Admin được quản lý người dùng.', 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== 'string') return fail('Yêu cầu không hợp lệ.', 400);

    if (body.action === 'list') return await listUsers(admin);

    const request = body as AdminAction;
    if (request.action !== 'create' && request.action !== 'update' && request.action !== 'delete') return fail('Hành động không hợp lệ.', 400);

    // 2. Tài khoản đích (nếu có) để áp luật
    let target: { role: Role | null; fullName: string | null } | null = null;
    if (request.action !== 'create') {
      const { data: found } = await admin.auth.admin.getUserById(request.userId);
      if (found?.user) {
        const { data: row } = await admin.from('UserRoles').select('Role, FullName').eq('UserId', request.userId).maybeSingle();
        target = { role: isRole(row?.Role) ? row.Role : null, fullName: row?.FullName ?? null };
      }
    }

    const denied = checkAdminAction(actor, request, target);
    if (denied) return fail(denied, 403);

    if (request.action === 'create') return await createUser(admin, request);
    if (request.action === 'update') return await updateUser(admin, request, target!);
    return await deleteUser(admin, request.userId);
  } catch (err) {
    return fail(`Lỗi máy chủ: ${err instanceof Error ? err.message : String(err)}`, 500);
  }
});

type Admin = ReturnType<typeof createClient>;

async function listUsers(admin: Admin) {
  const users: Array<{ id: string; email: string | null; created_at: string; last_sign_in_at?: string | null; banned_until?: string | null }> = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return fail(`Không đọc được danh sách tài khoản: ${error.message}`, 500);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const { data: roles, error } = await admin.from('UserRoles').select('UserId, Role, FullName, Username');
  if (error) return fail(`Không đọc được vai trò: ${error.message}`, 500);
  const byId = new Map((roles ?? []).map((r) => [r.UserId as string, r]));
  const now = Date.now();

  return json({
    ok: true,
    data: users.map((u) => {
      const r = byId.get(u.id);
      return {
        id: u.id,
        email: u.email,
        username: r?.Username ?? null,
        fullName: r?.FullName ?? null,
        role: isRole(r?.Role) ? r.Role : null,
        disabled: Boolean(u.banned_until && Date.parse(u.banned_until) > now),
        lastSignInAt: u.last_sign_in_at ?? null,
        createdAt: u.created_at,
      };
    }),
  });
}

async function createUser(admin: Admin, req: Extract<AdminAction, { action: 'create' }>) {
  const username = normalizeUsername(req.username ?? req.email!.split('@')[0]);
  const email = req.username !== undefined ? `${username}@app.local` : req.email!.trim().toLowerCase();
  const fullName = req.fullName.trim();
  const { data: existing, error: usernameError } = await admin.from('UserRoles').select('UserId').eq('Username', username).maybeSingle();
  if (usernameError) return fail(`Không kiểm tra được tên đăng nhập: ${usernameError.message}`);
  if (existing) return fail('Tên đăng nhập đã được sử dụng.');
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: req.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) return fail(describeAuthError(error?.message ?? 'Không tạo được tài khoản.'));

  const { error: roleErr } = await admin.from('UserRoles').upsert({ UserId: data.user.id, Role: req.role, FullName: fullName, Username: username }, { onConflict: 'UserId' });
  if (roleErr) {
    // Không để lại tài khoản đăng nhập được nhưng chưa có vai trò
    await admin.auth.admin.deleteUser(data.user.id);
    return fail(`Không gán được vai trò nên đã hủy việc tạo tài khoản: ${roleErr.message}`);
  }
  return json({ ok: true, data: { id: data.user.id } });
}

async function updateUser(admin: Admin, req: Extract<AdminAction, { action: 'update' }>, target: { role: Role | null; fullName: string | null }) {
  if (req.username !== undefined) {
    const { data: existing, error } = await admin.from('UserRoles').select('UserId').eq('Username', normalizeUsername(req.username)).neq('UserId', req.userId).maybeSingle();
    if (error) return fail(`Không kiểm tra được tên đăng nhập: ${error.message}`);
    if (existing) return fail('Tên đăng nhập đã được sử dụng.');
  }
  const attrs: { password?: string; ban_duration?: string } = {};
  if (req.newPassword !== undefined) attrs.password = req.newPassword;
  if (req.disabled !== undefined) attrs.ban_duration = req.disabled ? BAN_FOREVER : 'none';
  if (Object.keys(attrs).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(req.userId, attrs);
    if (error) return fail(describeAuthError(error.message));
  }

  if (req.role !== undefined || req.fullName !== undefined || req.username !== undefined) {
    const role = req.role ?? target.role;
    const { error } = await admin
      .from('UserRoles')
      .upsert({
        UserId: req.userId, Role: role, FullName: req.fullName?.trim() ?? target.fullName,
        ...(req.username !== undefined ? { Username: normalizeUsername(req.username) } : {}),
      }, { onConflict: 'UserId' });
    if (error) return fail(`Không lưu được vai trò hoặc họ tên: ${error.message}`);
  }
  return json({ ok: true, data: { id: req.userId } });
}

async function deleteUser(admin: Admin, userId: string) {
  const blockers: string[] = [];
  for (const b of DELETE_BLOCKERS) {
    const { count, error } = await admin.from(b.table).select('*', { count: 'exact', head: true }).eq(b.column, userId);
    if (error) return fail(`Không kiểm tra được dữ liệu của tài khoản (${b.table}): ${error.message}`, 500);
    if (count && count > 0) blockers.push(`${count} ${b.label}`);
  }
  if (blockers.length > 0) {
    return fail(`Không xóa được vì tài khoản còn ${blockers.join(', ')}. Hãy khóa đăng nhập thay vì xóa, hoặc chuyển dữ liệu cho người khác trước.`);
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return fail(`Không xóa được tài khoản: ${error.message}`);
  return json({ ok: true, data: { id: userId } });
}
