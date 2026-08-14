import React, { useState } from 'react';
import { Lock, Mail, LogIn, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Custom Vector Banking Emblem SVG Logo
const BankEmblemLogo: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#2563EB" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#D97706" />
      </linearGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    {/* Outer Shield Outline with Glow */}
    <path
      d="M32 4L8 14V30C8 45.2 18.2 58.4 32 62C45.8 58.4 56 45.2 56 30V14L32 4Z"
      fill="url(#shieldGrad)"
      filter="url(#glow)"
    />
    {/* Inner Shield Overlay */}
    <path
      d="M32 8L12 16.3V30C12 42.8 20.5 53.7 32 56.8C43.5 53.7 52 42.8 52 30V16.3L32 8Z"
      fill="#0F172A"
      fillOpacity="0.6"
    />
    {/* Bank Pillars Architecture */}
    <path d="M20 22H44V25H20V22Z" fill="#FFFFFF" />
    <path d="M22 27H26V43H22V27Z" fill="#E0F2FE" />
    <path d="M30 27H34V43H30V27Z" fill="#FFFFFF" />
    <path d="M38 27H42V43H38V27Z" fill="#E0F2FE" />
    <path d="M18 45H46V49H18V45Z" fill="url(#goldGrad)" />
    {/* Central Star Core */}
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-[#070D1B] via-[#0F172A] to-[#1E1B4B] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      
      {/* RICH DIGITAL GRAPHIC ARTWORK BACKGROUND - Glowing Orbs & Node Network */}
      <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-blue-600/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[35%] right-[20%] w-[450px] h-[450px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[15%] w-[380px] h-[380px] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Vector Digital Banking Circuit & Network SVG Background Graphic */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Network Nodes and Connecting Circuits */}
        <path d="M-100 120 L250 120 L400 300 L900 300" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" strokeDasharray="6 4" />
        <path d="M1200 800 L850 800 L700 600 L100 600" stroke="url(#lineGrad)" strokeWidth="1.5" fill="none" strokeDasharray="6 4" />
        <path d="M-50 450 L300 450 L500 700 L1100 700" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />
        <path d="M800 -50 L800 200 L550 450 L550 900" stroke="url(#lineGrad)" strokeWidth="1" fill="none" />

        {/* Glowing Network Node Dots */}
        <circle cx="250" cy="120" r="4" fill="#3B82F6" className="animate-pulse" />
        <circle cx="400" cy="300" r="5" fill="#06B6D4" className="animate-pulse" />
        <circle cx="850" cy="800" r="4" fill="#8B5CF6" className="animate-pulse" />
        <circle cx="300" cy="450" r="5" fill="#10B981" className="animate-pulse" />
        <circle cx="550" cy="450" r="4" fill="#F59E0B" className="animate-pulse" />
      </svg>

      {/* Geometric Dot Grid Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* SINGLE CENTERED MINIMALIST LUXURY GLASS CARD CONSOLE */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/80 shadow-[0_0_60px_rgba(30,58,138,0.4)] backdrop-blur-2xl rounded-3xl p-8 sm:p-10 relative z-20 space-y-7 transition-all">
        
        {/* Top Centered Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3.5 rounded-2xl bg-blue-500/10 border border-blue-400/20 shadow-inner">
            <BankEmblemLogo className="w-12 h-12" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-wider text-white uppercase font-mono">
              QUẢN LÝ KHÁCH HÀNG
            </h1>
            <p className="text-xs text-cyan-200/80 font-medium tracking-wide">
              Hệ thống Tín dụng & Quản trị Hạn mức Ngân hàng
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          
          {/* Email Input Field */}
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-xs font-medium outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Password Input Field with Eye Toggle */}
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
                className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white text-xs font-mono outline-none transition-all focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-60"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-400 transition-colors p-1"
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

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-cyan-900/40"
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

        {/* Footer Version Info */}
        <div className="pt-2 text-center">
          <span className="text-[11px] text-slate-500 font-mono">
            © 2026 CustomerManager • v2.5.0 Stable
          </span>
        </div>

      </div>
    </div>
  );
};
