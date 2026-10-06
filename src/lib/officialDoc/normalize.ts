/** Chữ thường, bỏ dấu tiếng Việt (đ thành d), gộp khoảng trắng. Giữ nguyên / và - của số hiệu. */
export function normalizeSearch(input: string): string {
  return input
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchTokens(input: string): string[] {
  const normalized = normalizeSearch(input);
  return normalized ? normalized.split(' ') : [];
}

/** Thoát ký tự đại diện của LIKE để từ khóa được hiểu đúng nghĩa đen. */
export function escapeLike(token: string): string {
  return token.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Nội dung cột SearchText: số hiệu và tiêu đề đã chuẩn hóa. */
export function buildSearchText(docNumber: string, title: string): string {
  return normalizeSearch(`${docNumber} ${title}`);
}
