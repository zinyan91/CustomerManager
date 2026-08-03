import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { theme } = useTheme();
  const { signIn } = useAuth();
  const isLight = theme === 'light';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
      // Không cần điều hướng: AuthProvider phát session mới và App tự render lại.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-colors ${
    isLight
      ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
      : 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500'
  }`;

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 font-sans antialiased ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border shadow-xl p-6 md:p-8 ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏦</div>
          <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight">
            QUẢN LÝ DƯ NỢ KHÁCH HÀNG
          </h1>
          <p className={`text-xs mt-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Đăng nhập để truy cập hệ thống
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <Mail
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            />
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email công vụ"
              className={inputClass}
              disabled={submitting}
            />
          </div>

          <div className="relative">
            <Lock
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isLight ? 'text-slate-400' : 'text-slate-500'
              }`}
            />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              className={inputClass}
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </>
            )}
          </button>
        </form>

        <p className={`text-[11px] text-center mt-5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
          Tài khoản do quản trị hệ thống cấp. Không hỗ trợ tự đăng ký.
        </p>
      </div>
    </div>
  );
};
