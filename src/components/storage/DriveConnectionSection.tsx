import { useCallback, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { driveContext } from '../../lib/drive/driveToken';
import { runDriveSelfTest, selfTestPassed, type SelfTestStep } from '../../lib/drive/driveSelfTest';

/** Chạy thử toàn bộ chuỗi thao tác với Shared Drive và hiện từng bước. Tạo rồi xóa một thư mục thử, không đụng dữ liệu thật. */
export function DriveConnectionSection() {
  const [steps, setSteps] = useState<SelfTestStep[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setFinished(false);
    setSteps([]);
    try {
      await runDriveSelfTest(driveContext, (step) => setSteps((prev) => [...prev, step]));
    } finally {
      setRunning(false);
      setFinished(true);
    }
  }, []);

  const passed = finished && selfTestPassed(steps);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void run()}
        disabled={running}
        className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
      >
        {running && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>Kiểm tra kết nối Google Drive</span>
      </button>

      {steps.length > 0 && (
        <ol aria-label="Kết quả kiểm tra kết nối" className="space-y-1.5 text-sm">
          {steps.map((s, i) => (
            <li key={`${s.label}_${i}`} className="flex items-start gap-2">
              {s.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-label="Đạt" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-label="Không đạt" />
              )}
              <span className={s.ok ? 'text-slate-800 dark:text-slate-200' : 'text-rose-700 dark:text-rose-300'}>
                {s.label}
                {s.detail ? `: ${s.detail}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}

      {finished && (
        <p role="status" className={`text-sm font-medium ${passed ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
          {passed ? 'Kết nối Google Drive hoạt động đầy đủ.' : 'Kết nối chưa đạt. Xem bước lỗi ở trên.'}
        </p>
      )}
    </div>
  );
}
