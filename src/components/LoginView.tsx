import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Custom Vector Banking Emblem SVG Logo
const BankEmblemLogo: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#1D4ED8" />
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
      fill="#0B132B"
      fillOpacity="0.5"
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
    <div className="min-h-screen w-full flex bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0D1B2A] text-slate-100 antialiased selection:bg-blue-500 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Background Ambient Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[350px] h-[350px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Geometric Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />

      {/* LEFT PANEL - Hero Banking Branding (Visible on Desktop lg+) */}
      <div className="hidden lg:flex lg:w-7/12 relative z-10 p-12 lg:p-16 flex-col justify-between border-r border-slate-800/80">
        
        {/* Top Header Logo */}
        <div className="flex items-center space-x-3.5">
          <BankEmblemLogo className="w-11 h-11" />
          <div>
            <div className="font-extrabold text-xl tracking-wider text-white uppercase font-mono">
              CUSTOMER MANAGER
            </div>
            <div className="text-xs text-blue-200/80 font-medium tracking-wide">
              Hệ thống Quản lý Khách hàng & Tín dụng Ngân hàng
            </div>
          </div>
        </div>

        {/* Center Hero Copy */}
        <div className="space-y-6 max-w-xl my-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-slate-100">Xác thực Bảo mật SSL</div>
                <div className="text-[11px] text-slate-400">Mã hóa Supabase Auth Engine</div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs text-slate-100">Dư nợ & HMTD Thời gian thực</div>
                <div className="text-[11px] text-slate-400">Tự động tính toán hạn mức khả dụng</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-4 flex justify-between items-center">
          <span>© 2026 CustomerManager • Bản quyền Thuộc Ngân hàng</span>
          <span className="font-mono text-[11px]">v2.5.0 • Build Stable</span>
        </div>
      </div>

      {/* RIGHT PANEL - Authentication Form Console Card */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/60 shadow-2xl backdrop-blur-xl rounded-3xl p-8 sm:p-10 space-y-7">
          
          {/* Mobile Logo Branding (Visible only on mobile/tablet) */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex p-3.5 rounded-2xl bg-blue-500/10 border border-blue-400/20 mb-2">
              <BankEmblemLogo className="w-10 h-10" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase font-mono">
              QUẢN LÝ KHÁCH HÀNG
            </h1>
            <p className="text-xs text-blue-200/70">
              Hệ thống Quản lý Khách hàng & Tín dụng Ngân hàng
            </p>
          </div>

          {/* Form Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              Đăng nhập Cán bộ
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhập email công vụ và mật khẩu để truy cập hệ thống.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Email công vụ
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-xs font-medium outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Field with Eye Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-xs font-mono outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors p-1"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/80 border border-red-800/60 text-red-300 text-xs font-semibold animate-in fade-in zoom-in-95">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-blue-900/40"
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

        </div>
      </div>
    </div>
  );
};
