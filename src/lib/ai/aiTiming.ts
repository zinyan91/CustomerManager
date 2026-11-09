import type { ModelAttempt } from './geminiClient';

export interface AiTiming {
  prepareMs: number;
  firstChunkMs: number | null;
  totalMs: number;
  files: number;
  usedTools: boolean;
  attempts?: ModelAttempt[];
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} giây`;

const OUTCOME_LABELS: Record<ModelAttempt['outcome'], string> = {
  ok: 'trả lời',
  timeout: 'quá hạn chờ',
  error: 'lỗi',
};

function describeAttempt(a: ModelAttempt): string {
  const note = a.note ? ` (${a.note})` : '';
  return `${a.model} ${OUTCOME_LABELS[a.outcome]} sau ${seconds(a.ms)}${note}`;
}

/** Một dòng console cho mỗi câu hỏi, để biết chậm ở bước chuẩn bị trong app, ở model nào, hay ở khâu viết câu trả lời. */
export function describeAiTiming(t: AiTiming): string {
  const parts = [
    `[AI] chuẩn bị ${seconds(t.prepareMs)}`,
    `Gemini trả chữ đầu sau ${t.firstChunkMs === null ? '—' : seconds(t.firstChunkMs)}`,
    `tổng ${seconds(t.totalMs)}`,
    `${t.files} tệp đính kèm`,
    t.usedTools ? 'có gọi công cụ tri thức' : 'không gọi công cụ',
  ];
  if (t.attempts?.length) parts.push(`model: ${t.attempts.map(describeAttempt).join(' → ')}`);
  return parts.join(' · ');
}
