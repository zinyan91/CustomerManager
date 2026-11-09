export interface AiTiming {
  prepareMs: number;
  firstChunkMs: number | null;
  totalMs: number;
  files: number;
  usedTools: boolean;
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} giây`;

/** Một dòng console cho mỗi câu hỏi, để biết chậm ở bước chuẩn bị trong app hay ở Gemini. */
export function describeAiTiming(t: AiTiming): string {
  return [
    `[AI] chuẩn bị ${seconds(t.prepareMs)}`,
    `Gemini trả chữ đầu sau ${t.firstChunkMs === null ? '—' : seconds(t.firstChunkMs)}`,
    `tổng ${seconds(t.totalMs)}`,
    `${t.files} tệp đính kèm`,
    t.usedTools ? 'có gọi công cụ tri thức' : 'không gọi công cụ',
  ].join(' · ');
}
