export interface SpeedMeter {
  /** Ghi nhận thêm `bytes` byte vừa truyền xong. */
  add(bytes: number): void;
  /** Byte mỗi giây, tính trên cửa sổ gần nhất. */
  bytesPerSecond(): number;
}

/**
 * Tốc độ trung bình trong cửa sổ trượt `windowMs` gần nhất. Mẫu cũ hơn cửa sổ bị bỏ nên ngừng truyền thì về 0 sau cửa sổ đó.
 * Khoảng tính tối thiểu 1 giây để vài byte đầu tiên không cho con số vọt lên bất thường.
 */
export function createSpeedMeter(windowMs = 5000, now: () => number = Date.now): SpeedMeter {
  const samples: Array<{ t: number; bytes: number }> = [];
  const prune = (t: number) => {
    while (samples.length > 0 && samples[0].t < t - windowMs) samples.shift();
  };
  return {
    add(bytes) {
      if (!(bytes > 0)) return;
      const t = now();
      samples.push({ t, bytes });
      prune(t);
    },
    bytesPerSecond() {
      const t = now();
      prune(t);
      if (samples.length === 0) return 0;
      const total = samples.reduce((n, s) => n + s.bytes, 0);
      const spanMs = Math.max(Math.min(windowMs, t - samples[0].t), 1000);
      return (total / spanMs) * 1000;
    },
  };
}

/** Thời gian còn lại ước tính (ms); null khi chưa có tốc độ để ước tính. */
export function estimateRemainingMs(remainingBytes: number, bytesPerSecond: number): number | null {
  if (remainingBytes <= 0) return 0;
  if (!(bytesPerSecond > 0)) return null;
  return (remainingBytes / bytesPerSecond) * 1000;
}

/** "m:ss" hoặc "h:mm:ss"; null hay giá trị không hợp lệ là "—". */
export function formatDuration(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms) || ms < 0) return '—';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
