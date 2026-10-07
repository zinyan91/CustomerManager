import { docFolderSlug, uniqueFileName } from './docPaths';

export interface ZipInput {
  name: string;
  blob: Blob;
}

/** Nén nhiều tệp thành một ZIP ngay trên trình duyệt (không nén lại: biểu mẫu thường đã là docx/xlsx/pdf). Trùng tên thì thêm hậu tố. */
export async function zipBlobs(inputs: ZipInput[]): Promise<Blob> {
  const { ZipWriter, BlobWriter, BlobReader } = await import('@zip.js/zip.js');
  const writer = new ZipWriter(new BlobWriter('application/zip'), { level: 0, useWebWorkers: false });
  const used = new Set<string>();
  for (const input of inputs) {
    const name = uniqueFileName(input.name, used);
    used.add(name);
    await writer.add(name, new BlobReader(input.blob));
  }
  return writer.close();
}

/** Tên ZIP bộ biểu mẫu của một văn bản. */
export const bundleFileName = (docNumber: string) => `${docFolderSlug(docNumber)}-bieu-mau.zip`;

/**
 * Bộ biểu mẫu thành đúng một tệp để đưa lên kho Biểu mẫu: một tệp thì giữ nguyên, nhiều tệp
 * (tờ trình, hợp đồng đính kèm...) thì nén thành một ZIP. Không có tệp thì null.
 */
export async function prepareFormUpload(files: File[], docNumber: string): Promise<File | null> {
  if (files.length === 0) return null;
  if (files.length === 1) return files[0];
  const blob = await zipBlobs(files.map((f) => ({ name: f.name, blob: f })));
  return new File([blob], bundleFileName(docNumber), { type: 'application/zip' });
}
