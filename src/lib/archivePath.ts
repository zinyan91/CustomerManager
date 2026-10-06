/** Nối các đoạn đường dẫn, bỏ đoạn rỗng và dấu gạch chéo thừa. */
export function joinArchivePath(...parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? '').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}
