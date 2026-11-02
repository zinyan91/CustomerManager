/** Khoảng thời gian dạng "45 giây", "5 phút 03 giây", "1 giờ 02 phút 05 giây"; làm tròn xuống tới giây. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h} giờ ${pad(m)} phút ${pad(s)} giây`;
  if (m > 0) return `${m} phút ${pad(s)} giây`;
  return `${s} giây`;
}
