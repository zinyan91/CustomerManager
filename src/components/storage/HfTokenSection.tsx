import { useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateHfToken } from '../../lib/huggingface/hfClient';
import { saveHfAuth, readLegacyLocalHfAuth, clearLegacyLocalHfConfig } from '../../lib/huggingface/hfConfigApi';
import type { HfAuth } from '../../types/huggingface';

interface HfTokenSectionProps {
  auth: HfAuth | null;
  onSaved: () => void | Promise<void>;
}

export function HfTokenSection({ auth, onSaved }: HfTokenSectionProps) {
  const { user } = useAuth();
  // Chưa có token trên hệ thống: điền sẵn token cũ còn trong trình duyệt này (nếu có)
  const [legacy] = useState(() => (auth ? null : readLegacyLocalHfAuth()));
  const [token, setToken] = useState(auth?.token ?? legacy?.token ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      // Kiểm tra token và lấy tên tài khoản HF (dùng đặt tên repo mới)
      const check = await validateHfToken(token);
      if (!check.valid) throw new Error(check.error || 'Token không hợp lệ.');
      await saveHfAuth({ token, username: check.username }, user?.id ?? null);
      clearLegacyLocalHfConfig();
      setOkMsg(`Đã lưu. Tài khoản Hugging Face: ${check.username}.`);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được token.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <div>
        <label htmlFor="hf-token" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Access Token Hugging Face
        </label>
        <div className="relative">
          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="hf-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
            autoComplete="off"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-slate-500"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500 flex flex-wrap items-center gap-x-2">
          <span>Cần quyền Write và quyền tạo repo. Mọi tài khoản đăng nhập đều dùng chung token này.</span>
          <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">
            Mở Hugging Face <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      {legacy && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
          Đã điền sẵn từ cấu hình cũ lưu trong trình duyệt này. Bấm Lưu token để áp dụng cho mọi tài khoản.
        </div>
      )}
      {error && (
        <div role="alert" className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {okMsg && (
        <div role="status" className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{okMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !token.trim()}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-50 flex items-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>{busy ? 'Đang kiểm tra và lưu...' : 'Lưu token'}</span>
      </button>
    </form>
  );
}
