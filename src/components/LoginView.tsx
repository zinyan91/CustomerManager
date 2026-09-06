import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UI, PANEL, BTN_PRIMARY, RADIUS_CONTROL } from '../lib/uiClasses';
import { APP_VERSION } from '../lib/appVersion';
import { Logo } from './Logo';

export const LoginView: React.FC = () => {
  const { signIn } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!usernameOrEmail.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập / email và mật khẩu công vụ.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(usernameOrEmail, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 bg-surface text-ink antialiased">
      <div className={`w-full max-w-sm ${PANEL} p-6 sm:p-8 space-y-6`}>

        <div className="flex items-center gap-3 border-b border-line pb-4">
          <Logo className="w-9 h-9 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-ink uppercase">
              Quản lý khách hàng
            </h1>
            <p className="text-[11px] text-ink-muted">
              Hệ thống Tín dụng &amp; Quản trị Hạn mức Ngân hàng
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="dangnhap-tk" className={`block text-[11px] ${UI.labelStyle}`}>
              Tên đăng nhập / Email công vụ
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input
                id="dangnhap-tk"
                type="text"
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className={`w-full pl-9 pr-3 py-2.5 border text-xs ${RADIUS_CONTROL} ${UI.inputStyle} outline-none disabled:opacity-60`}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dangnhap-mk" className={`block text-[11px] ${UI.labelStyle}`}>
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input
                id="dangnhap-mk"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-9 pr-10 py-2.5 border text-xs font-mono ${RADIUS_CONTROL} ${UI.inputStyle} outline-none disabled:opacity-60`}
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-accent transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className={`flex items-start gap-2 p-3 border border-neg/40 bg-neg-soft text-neg text-[11px] font-semibold ${RADIUS_CONTROL}`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${BTN_PRIMARY} w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs active:translate-y-px`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực…</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập hệ thống</span>
              </>
            )}
          </button>
        </form>

        <div className="border-t border-line pt-3 text-center">
          <span className="text-[10px] text-ink-faint font-mono">
            © 2026 CustomerManager · v{APP_VERSION}
          </span>
        </div>

      </div>
    </div>
  );
};
