/**
 * Cloudflare R2 Object Storage Client Helper
 * Hoạt động song song cùng Supabase:
 * - Supabase: Quản lý Auth, RLS và bảng Metadata (file_key, file_name, size, owner_id)
 * - Cloudflare R2: Lưu trữ dữ liệu nhị phân (Binary Objects), hình ảnh TSĐB, tài liệu scan
 *                 với ưu điểm 0 USD Egress Fee và phân phối siêu tốc qua Cloudflare CDN.
 */

export interface R2Config {
  publicUrl: string;
  bucketName: string;
}

export function getR2Config(): R2Config {
  const publicUrl = (import.meta.env.VITE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
  const bucketName = import.meta.env.VITE_R2_BUCKET_NAME || 'customer-manager-assets';
  return { publicUrl, bucketName };
}

export function isR2Configured(): boolean {
  const { publicUrl } = getR2Config();
  return Boolean(publicUrl && !publicUrl.includes('your-r2-public-domain'));
}

/**
 * Tạo Object Key có cấu trúc phân cấp theo từng thực thể nghiệp vụ
 */
export function buildR2ObjectKey(
  entity: 'customers' | 'contracts' | 'collaterals' | 'checklists' | 'documents',
  entityId: string,
  filename: string
): string {
  const normalized = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const timestamp = Date.now();
  return `${entity}/${entityId}/${timestamp}_${normalized}`;
}

/**
 * Trả về URL đầy đủ qua Cloudflare R2 CDN / Custom Domain
 */
export function getR2PublicUrl(objectKey: string): string {
  const { publicUrl } = getR2Config();
  if (!publicUrl) return '';
  const cleanKey = objectKey.replace(/^\/+/, '');
  return `${publicUrl}/${cleanKey}`;
}

/**
 * Upload tệp nhị phân lên Cloudflare R2 qua Presigned URL hoặc Worker endpoint
 */
export async function uploadToR2(
  uploadUrl: string,
  file: File | Blob,
  contentType?: string
): Promise<boolean> {
  try {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType || file.type || 'application/octet-stream',
      },
      body: file,
    });
    return res.ok;
  } catch (error) {
    console.error('R2 upload failed:', error);
    return false;
  }
}
