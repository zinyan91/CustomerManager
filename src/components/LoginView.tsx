import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Custom Custom Vector Banking Emblem SVG Logo
const BankEmblemLogo: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4F46E5" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#0284C7" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer Shield Outline */}
    <path
      d="M32 4L8 14V30C8 45.2 18.2 58.4 32 62C45.8 58.4 56 45.2 56 30V14L32 4Z"
      fill="url(#shieldGrad)"
      filter="url(#glow)"
    />
    {/* Inner Shield Overlay */}
    <path
      d="M32 8L12 16.3V30C12 42.8 20.5 53.7 32 56.8C43.5 53.7 52 42.8 52 30V16.3L32 8Z"
      fill="#0F172A"
      fillOpacity="0.4"
    />
    {/* Bank Pillars Architecture */}
    <path d="M20 22H44V25H20V22Z" fill="#FFFFFF" />
    <path d="M22 27H26V43H22V27Z" fill="#E0F2FE" />
    <path d="M30 27H34V43H30V27Z" fill="#FFFFFF" />
    <path d="M38 27H42V43H38V27Z" fill="#E0F2FE" />
    <path d="M18 45H46V49H18V45Z" fill="url(#goldGrad)" />
    {/* Central Glowing Star Core */}
    <circle cx="32" cy="17" r="2.5" fill="#F59E0B" />
  </svg>
);

export const LoginView: React.FC = () => {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu công vụ.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-surface text-ink antialiased selection:bg-accent selection:text-accent-ink">
      {/* LEFT PANEL - Hero Banking Branding (Visible on Desktop lg+) */}
      <div className="hidden lg:flex lg:w-7/12 relative overflow-hidden bg-slate-950 p-12 flex-col justify-between border-r border-line">
        {/* Background Decorative Mesh & Glow Orbs */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))]" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-pos/15 rounded-full blur-3xl" />
        
        {/* Geometric Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center space-x-3">
          <BankEmblemLogo className="w-10 h-10" />
          <div>
            <div className="font-extrabold text-lg tracking-wider text-white uppercase font-mono">
              CUSTOMER MANAGER
            </div>
            <div className="text-[11px] text-slate-400 font-medium tracking-wide">
              Hệ thống Quản lý Khách hàng & Tín dụng Ngân hàng
            </div>
          </div>
        </div>

        {/* Center Hero Copy */}
        <div className="relative z-10 space-y-6 max-w-xl my-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Nền tảng Thẩm định & Giám sát Tín dụng Chuẩn Quốc tế</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Quản trị Hạn mức Tín dụng & Danh mục Khoản vay Thông minh
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Hệ thống hỗ trợ Cán bộ Tín dụng tra cứu hạn mức, quản lý hợp đồng KUNN, 
            tính toán lịch thu nợ, định giá tài sản bảo đảm và theo dõi kiểm soát sau vay thời gian thực.
          </p>

          {/* Key Platform Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs">
              <CheckCircle2 className="w-5 h-5 text-pos shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-slate-200">Xác thực Bảo mật SSL</div>
                <div className="text-[11px] text-slate-400">Mã hóa Supabase Auth Engine</div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xs">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-slate-200">Dư nợ & HMTD Thời gian thực</div>
                <div className="text-[11px] text-slate-400">Tự động tính toán hạn mức khả dụng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 text-xs text-slate-500 border-t border-slate-800/80 pt-4 flex justify-between items-center">
          <span>© 2026 CustomerManager • Bản quyền Thuộc Ngân hàng</span>
          <span className="font-mono text-[11px]">v2.5.0 • Build Stable</span>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form Console */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 sm:p-12 bg-surface relative">
        <div className="w-full max-w-md space-y-8">
          
          {/* Mobile Logo Branding (Visible only on mobile/tablet) */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-accent-soft border border-accent/20 mb-2">
              <BankEmblemLogo className="w-10 h-10" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ink uppercase">
              QUẢN LÝ KHÁCH HÀNG
            </h1>
            <p className="text-xs text-ink-faint">
              Hệ thống Quản lý Khách hàng & Tín dụng Ngân hàng
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Đăng nhập Cán bộ
            </h2>
            <p className="text-xs text-ink-faint leading-relaxed">
              Nhập email công vụ và mật khẩu được cấp để truy cập hệ thống nghiệp vụ.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-muted">
                Email công vụ
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint transition-colors" />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="canbo@bank.com.vn"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-line bg-panel text-ink text-xs font-medium placeholder-ink-faint outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-muted">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-line bg-panel text-ink text-xs font-mono placeholder-ink-faint outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-accent transition-colors p-1"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-neg-soft/80 border border-neg/40 text-neg text-xs font-semibold animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-accent hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-accent-ink text-xs font-bold transition-all shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực tài khoản...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Warning & Security Notice */}
          <div className="pt-4 border-t border-line text-center space-y-2">
            <p className="text-[11px] text-ink-faint leading-relaxed">
              🔒 Tài khoản công vụ được cấp và phân quyền bởi Quản trị viên Ngân hàng. 
              Mọi hành vi truy cập trái phép đều được ghi vết nhật ký.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
