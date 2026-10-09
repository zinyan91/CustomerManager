/**
 * Đo tốc độ truyền (byte/giây) từ các lần báo "đã truyền tới đâu", làm mượt để số không nhảy theo từng gói tin.
 * Gọi `sample(đã truyền, thời điểm)` mỗi lần có tiến độ; trả tốc độ hiện tại, hoặc 0 khi chưa đủ dữ liệu.
 */
export interface SpeedMeter {
  sample: (loadedBytes: number, nowMs: number) => number;
}

/** Hệ số làm mượt: càng gần 1 thì càng theo sát lần đo mới. */
const SMOOTHING = 0.4;
/** Khoảng đo ngắn hơn mức này thì gộp vào lần sau, tránh chia cho thời gian gần bằng 0. */
const MIN_WINDOW_MS = 250;

export function createSpeedMeter(): SpeedMeter {
  let lastLoaded = 0;
  let lastAt: number | null = null;
  let speed = 0;
  return {
    sample(loadedBytes, nowMs) {
      if (lastAt === null || loadedBytes < lastLoaded) {
        // Lần đầu, hoặc đếm lại từ đầu (thử lại): chưa có gì để so
        lastLoaded = loadedBytes;
        lastAt = nowMs;
        speed = 0;
        return 0;
      }
      const elapsed = nowMs - lastAt;
      if (elapsed < MIN_WINDOW_MS) return speed;
      const instant = ((loadedBytes - lastLoaded) * 1000) / elapsed;
      speed = speed === 0 ? instant : speed + SMOOTHING * (instant - speed);
      lastLoaded = loadedBytes;
      lastAt = nowMs;
      return speed;
    },
  };
}
