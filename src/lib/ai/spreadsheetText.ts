import type { AiAttachment } from '../../types/ai';

/** Tổng số ký tự bảng tính đưa cho AI mỗi tệp: đủ cho một bộ báo cáo tài chính, không làm tràn giới hạn của mô hình. */
export const MAX_SHEET_CHARS = 60_000;

export const SPREADSHEET_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const isSpreadsheetFile = (file: { name: string }): boolean => /\.(xlsx|xlsm|xls|csv)$/i.test(file.name);

export interface SheetText {
  text: string;
  truncated: boolean;
  sheetCount: number;
}

/** Mỗi sheet thành một khối CSV có tiêu đề; sheet trống bị bỏ; quá giới hạn thì cắt và báo. Dùng giá trị đã tính của ô, không dùng công thức. */
export async function spreadsheetToText(buffer: ArrayBuffer, maxChars: number = MAX_SHEET_CHARS): Promise<SheetText> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (workbook.SheetNames.length === 0) throw new Error('Tệp bảng tính không có sheet nào.');

  const blocks: string[] = [];
  let total = 0;
  let truncated = false;
  for (const name of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false }).trim();
    if (!csv) continue;
    const header = `### Sheet "${name}"`;
    const room = maxChars - total - header.length - 2;
    if (room <= 0) {
      truncated = true;
      break;
    }
    const body = csv.length > room ? csv.slice(0, room) : csv;
    if (body.length < csv.length) truncated = true;
    blocks.push(`${header}\n${body}`);
    total += header.length + body.length + 2;
    if (truncated) break;
  }
  if (blocks.length === 0) throw new Error('Tệp bảng tính không có dữ liệu.');
  return { text: blocks.join('\n\n'), truncated, sheetCount: blocks.length };
}

/** Bảng tính thành tệp đính kèm dạng chữ cho AI. Ném lỗi tiếng Việt khi tệp quá lớn hoặc không đọc được. */
export async function fileToSpreadsheetAttachment(file: File): Promise<AiAttachment> {
  let sheet: SheetText;
  try {
    sheet = await spreadsheetToText(await file.arrayBuffer());
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Không đọc được bảng tính "${file.name}": ${reason}`);
  }
  const note = sheet.truncated ? `\n\n(Đã cắt bớt vì quá dài: chỉ đọc ${MAX_SHEET_CHARS} ký tự đầu. Nói rõ điều này với người dùng.)` : '';
  return {
    id: `sheet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    mimeType: SPREADSHEET_MIME,
    size: file.size,
    base64Data: '',
    textData: sheet.text + note,
  };
}
