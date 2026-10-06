export interface FelixAiAvatarProps {
  status?: 'idle' | 'thinking' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

export function FelixAiAvatar({
  status = 'idle',
  size = 'md',
  className = '',
  showGlow = true,
}: FelixAiAvatarProps) {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const glowColor =
    status === 'auto'
      ? 'from-amber-500/20 to-orange-500/10 shadow-amber-500/10'
      : status === 'thinking'
      ? 'from-teal-400/30 to-cyan-500/20 shadow-teal-500/20 animate-pulse'
      : 'from-slate-400/10 to-teal-500/10 shadow-teal-500/5';

  const visorColor =
    status === 'auto'
      ? 'url(#visor-auto)'
      : status === 'thinking'
      ? 'url(#visor-thinking)'
      : 'url(#visor-idle)';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl select-none transition-transform duration-300 ${sizeMap[size]} ${className}`}
    >
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-tr blur-sm transition-all duration-500 -z-10 ${glowColor}`}
        />
      )}

      {/* SVG Robot Cyber Avatar */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="robot-body" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e293b" />
            <stop offset="0.5" stopColor="#0f172a" />
            <stop offset="1" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="robot-frame" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.5" stopColor="#14b8a6" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>

          <linearGradient id="visor-idle" x1="12" y1="18" x2="36" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06b6d4" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>

          <linearGradient id="visor-thinking" x1="12" y1="18" x2="36" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#818cf8" />
          </linearGradient>

          <linearGradient id="visor-auto" x1="12" y1="18" x2="36" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fbbf24" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Antennas */}
        <rect x="2" y="18" width="4" height="12" rx="2" fill="url(#robot-body)" stroke="#334155" strokeWidth="1" />
        <rect x="3" y="21" width="2" height="6" rx="1" fill={status === 'auto' ? '#f59e0b' : '#14b8a6'} />
        
        <rect x="42" y="18" width="4" height="12" rx="2" fill="url(#robot-body)" stroke="#334155" strokeWidth="1" />
        <rect x="43" y="21" width="2" height="6" rx="1" fill={status === 'auto' ? '#f59e0b' : '#14b8a6'} />

        {/* Head Shell */}
        <rect
          x="6"
          y="8"
          width="36"
          height="32"
          rx="10"
          fill="url(#robot-body)"
          stroke="url(#robot-frame)"
          strokeWidth="1.8"
        />

        {/* Top Node */}
        <path d="M24 8V3" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
        <circle
          cx="24"
          cy="3"
          r="2.5"
          fill={status === 'auto' ? '#fbbf24' : status === 'thinking' ? '#38bdf8' : '#14b8a6'}
          className={status === 'thinking' ? 'animate-ping' : ''}
        />
        <circle
          cx="24"
          cy="3"
          r="1.8"
          fill={status === 'auto' ? '#f59e0b' : '#0d9488'}
        />

        {/* Visor Area */}
        <rect
          x="11"
          y="15"
          width="26"
          height="14"
          rx="6"
          fill="#050b14"
          stroke="#1e293b"
          strokeWidth="1"
        />

        {/* Visor Content */}
        {status === 'thinking' ? (
          <g>
            <rect x="14" y="20.5" width="20" height="3" rx="1.5" fill={visorColor} />
            <circle cx="18" cy="22" r="1.5" fill="#ffffff" className="animate-pulse" />
            <circle cx="24" cy="22" r="1.5" fill="#ffffff" className="animate-pulse" />
            <circle cx="30" cy="22" r="1.5" fill="#ffffff" className="animate-pulse" />
          </g>
        ) : status === 'auto' ? (
          <g>
            <path
              d="M15 22L21 20L20 22.5L25 21L23 23.5L33 21"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="22" r="1.8" fill="#fef08a" />
            <circle cx="32" cy="21" r="1.8" fill="#fef08a" />
          </g>
        ) : (
          <g>
            <rect x="15" y="19.5" width="6" height="5" rx="2.5" fill={visorColor} />
            <circle cx="17.5" cy="21.5" r="1" fill="#ffffff" />
            <rect x="27" y="19.5" width="6" height="5" rx="2.5" fill={visorColor} />
            <circle cx="29.5" cy="21.5" r="1" fill="#ffffff" />
          </g>
        )}

        {/* Lower Lines */}
        <g stroke="#334155" strokeWidth="1.2" strokeLinecap="round">
          <line x1="20" y1="33" x2="28" y2="33" />
          <line x1="22" y1="36" x2="26" y2="36" />
        </g>
      </svg>
    </div>
  );
}
