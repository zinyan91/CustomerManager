import { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Database, KeyRound, ExternalLink } from 'lucide-react';
import { getHfConfig, saveHfConfig, validateHfToken } from '../../lib/huggingface/hfClient';
import type { HfConfig } from '../../types/huggingface';

interface HfConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: (config: HfConfig) => void;
}

export function HfConfigModal({ isOpen, onClose, onConfigSaved }: HfConfigModalProps) {
  const [token, setToken] = useState('');
  const [repoId, setRepoId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid?: boolean;
    username?: string;
    avatarUrl?: string;
    role?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getHfConfig();
      setToken(cfg.token || '');
      setRepoId(cfg.repoId || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!token.trim()) {
      setTestResult({ valid: false, error: 'Vui lòng nhập Access Token từ Hugging Face.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await validateHfToken(token.trim());
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: HfConfig = {
      token: token.trim(),
      repoId: repoId.trim(),
      username: testResult?.username || undefined,
      isPrivate: true,
    };
    saveHfConfig(newConfig);
    onConfigSaved(newConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cấu hình Hugging Face Dataset
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kho lưu trữ tệp văn thư & đồng bộ đám mây
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Hugging Face Access Token (Quyền Write)
            </label>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-slate-500"
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Tạo token tại mục Settings &gt; Access Tokens</span>
              <a
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="text-slate-700 dark:text-slate-300 underline flex items-center gap-0.5"
              >
                Mở Hugging Face <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dataset Repository ID (Ví dụ: username/van-thu-tin-dung)
            </label>
            <input
              type="text"
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              placeholder="username/repo-name"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:border-slate-500"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Khuyến nghị tạo Dataset ở chế độ <b>Private</b> để bảo mật hồ sơ ngân hàng.
            </p>
          </div>

          {/* Nút kiểm tra kết nối */}
          <div className="pt-1">
            <button
              type="button"
              disabled={isTesting || !token.trim()}
              onClick={handleTestConnection}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kiểm tra kết nối...</span>
                </>
              ) : (
                <span>Kiểm tra kết nối Token</span>
              )}
            </button>
          </div>

          {/* Kết quả kiểm tra */}
          {testResult && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                testResult.valid
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.valid ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <div>
                {testResult.valid ? (
                  <div>
                    <div className="font-semibold">Kết nối Hugging Face thành công!</div>
                    <div className="text-[11px] opacity-90">
                      Tài khoản: <b>{testResult.username}</b> (Quyền: {testResult.role})
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold">Kết nối không thành công</div>
                    <div className="text-[11px] opacity-90">{testResult.error}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer nút hành động */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white"
            >
              Lưu cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
