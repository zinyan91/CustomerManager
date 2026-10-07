import { supabase } from '../supabase';
import type { DriveAccess, DriveContext } from './driveTypes';

const FUNCTION_NAME = 'drive-token';
/** Xin token mới khi còn ít hơn ngần này mili giây. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const MSG_NOT_DEPLOYED =
  'Chưa triển khai Edge Function "drive-token" trên Supabase nên chưa dùng được Google Drive. Liên hệ người phụ trách kỹ thuật (xem docs/superpowers/specs/2026-10-08-kho-luu-tru-google-drive-design.md).';

interface InvokeError {
  message?: string;
  context?: { status?: number; json?: () => Promise<unknown> };
}

async function describeInvokeError(error: InvokeError): Promise<string> {
  const status = error.context?.status;
  if (status === 404) return MSG_NOT_DEPLOYED;
  try {
    const body = (await error.context?.json?.()) as { error?: string } | undefined;
    if (body?.error) return body.error;
  } catch {
    // Phản hồi không phải JSON: dùng thông điệp chung bên dưới
  }
  if (status === 401) return 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.';
  return `Không lấy được quyền truy cập Google Drive: ${error.message ?? 'lỗi không rõ'}`;
}

/** Đọc phản hồi của drive-token. Thiếu trường nào thì báo lỗi, không đoán. */
export function parseDriveAccess(raw: unknown): DriveAccess {
  const d = raw as Partial<DriveAccess> | null;
  if (
    !d || typeof d.accessToken !== 'string' || !d.accessToken || typeof d.expiresAt !== 'number' || !Number.isFinite(d.expiresAt) ||
    (d.access !== 'write' && d.access !== 'read') || typeof d.driveId !== 'string' || !d.driveId
  ) {
    throw new Error('Máy chủ trả về quyền truy cập Google Drive không hợp lệ.');
  }
  return { accessToken: d.accessToken, expiresAt: d.expiresAt, access: d.access, driveId: d.driveId };
}

export const isAccessFresh = (access: DriveAccess, now = Date.now()): boolean => access.expiresAt > now + REFRESH_MARGIN_MS;

type Fetcher = () => Promise<DriveAccess>;

/** Giữ token trong bộ nhớ, dùng chung một lần xin cho nhiều lời gọi cùng lúc, xin lại khi gần hết hạn hoặc sau `invalidate`. */
export function createAccessCache(fetcher: Fetcher, now: () => number = Date.now): Pick<DriveContext, 'getAccess' | 'invalidate'> {
  let current: DriveAccess | null = null;
  let inflight: Promise<DriveAccess> | null = null;
  return {
    getAccess: async () => {
      if (current && isAccessFresh(current, now())) return current;
      inflight ??= fetcher()
        .then((a) => {
          current = a;
          return a;
        })
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    invalidate: () => {
      current = null;
    },
  };
}

async function fetchAccessFromFunction(): Promise<DriveAccess> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, { body: {} });
  if (error) throw new Error(await describeInvokeError(error as InvokeError));
  const res = data as { ok?: boolean; error?: string; data?: unknown } | null;
  if (!res?.ok) throw new Error(res?.error ?? 'Máy chủ trả về phản hồi không hợp lệ.');
  return parseDriveAccess(res.data);
}

const shared = createAccessCache(fetchAccessFromFunction);

/** Ngữ cảnh dùng chung cho cả ứng dụng: một token cho mọi lời gọi. */
export const driveContext: DriveContext = { getAccess: shared.getAccess, invalidate: shared.invalidate };
