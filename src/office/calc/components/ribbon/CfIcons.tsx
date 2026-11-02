import React from 'react';

export const RibbonCfIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="calc-ribbon-cell-icon">
    <rect x="5" y="5" width="22" height="22" rx="1.5" stroke="#444" strokeWidth="1.3" fill="#fff" />
    <line x1="5" y1="12" x2="27" y2="12" stroke="#444" strokeWidth="0.9" />
    <line x1="5" y1="19" x2="27" y2="19" stroke="#444" strokeWidth="0.9" />
    <line x1="12" y1="5" x2="12" y2="27" stroke="#444" strokeWidth="0.9" />
    <line x1="20" y1="5" x2="20" y2="27" stroke="#444" strokeWidth="0.9" />
    {/* Highlighted cells */}
    <rect x="12" y="5" width="8" height="7" fill="#f8696b" opacity="0.85" />
    <rect x="5" y="19" width="7" height="8" fill="#5a8ac6" opacity="0.85" />
    <rect x="20" y="12" width="7" height="7" fill="#f8696b" opacity="0.85" />
  </svg>
);

export const HighlightRulesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* Highlight cell */}
    <rect x="2" y="2" width="9" height="5" fill="#f8cbad" opacity="0.9" />
    {/* <= badge */}
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">≤</text>
  </svg>
);

export const TopBottomRulesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* Highlight row */}
    <rect x="2" y="2" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 9V4M3 5.5L4.5 4L6 5.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    {/* 10 badge */}
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">10</text>
  </svg>
);

export const DataBarsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* Data bar in cells */}
    <rect x="2.5" y="2.5" width="4" height="4" fill="#0078d4" opacity="0.8" />
    <rect x="2.5" y="7.5" width="8" height="3" fill="#0078d4" opacity="0.8" />
    <rect x="2.5" y="11.5" width="6" height="4" fill="#0078d4" opacity="0.8" />
  </svg>
);

export const ColorScalesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* 3 horizontal color bands */}
    <rect x="2.5" y="2.5" width="13" height="4" fill="#5a8ac6" />
    <rect x="2.5" y="7" width="13" height="4" fill="#ffeb84" />
    <rect x="2.5" y="11.5" width="13" height="4" fill="#f8696b" />
  </svg>
);

export const IconSetsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* 3 dots */}
    <circle cx="4.5" cy="4.5" r="1.5" fill="#5a8ac6" />
    <circle cx="4.5" cy="9" r="1.5" fill="#ff5555" />
    <circle cx="4.5" cy="13.5" r="1.5" fill="#5a8ac6" />
  </svg>
);

export const NewRuleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="7" y="7" width="4" height="4" fill="#ffb620" />
    <rect x="11" y="2" width="4" height="5" fill="#ffb620" />
  </svg>
);

export const ClearRulesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="5" height="5" fill="#ffc7ce" />
    {/* Eraser */}
    <path d="M12 9L15 12L13 14L10 11L12 9Z" fill="#b4009e" />
    <path d="M10 11L8 13L9.5 14.5L11.5 12.5L10 11Z" fill="#999" />
  </svg>
);

export const ManageRulesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="5" height="4" fill="#ffb620" />
    <rect x="7" y="11" width="4" height="4" fill="#ffb620" />
  </svg>
);

export const GreaterThanIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="9" height="5" fill="#f8cbad" opacity="0.9" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">&gt;</text>
  </svg>
);

export const LessThanIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="9" height="4" fill="#f8cbad" opacity="0.9" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">&lt;</text>
  </svg>
);

export const BetweenIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="5" height="5" fill="#0078d4" opacity="0.75" />
    <rect x="7" y="7" width="4" height="4" fill="#ffb620" opacity="0.9" />
    <rect x="11" y="2" width="5" height="5" fill="#0078d4" opacity="0.75" />
  </svg>
);

export const EqualToIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="9" height="4" fill="#f8cbad" opacity="0.9" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">=</text>
  </svg>
);

export const TextContainsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="9" height="4" fill="#f8cbad" opacity="0.9" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">a</text>
  </svg>
);

export const DateOccurringIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="5" height="4" fill="#f8cbad" opacity="0.9" />
    {/* Calendar */}
    <rect x="9" y="8" width="7" height="8" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <line x1="9" y1="11" x2="16" y2="11" stroke="#d83b01" strokeWidth="1" />
  </svg>
);

export const DuplicateValuesIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    {/* Two matching duplicate rows/cells */}
    <rect x="2" y="7" width="5" height="4" fill="#ffb620" opacity="0.9" />
    <rect x="2" y="11" width="5" height="5" fill="#ffb620" opacity="0.9" />
  </svg>
);

export const Top10ItemsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 9V4M3 5.5L4.5 4L6 5.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">10</text>
  </svg>
);

export const Top10PercentIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 9V4M3 5.5L4.5 4L6 5.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">%</text>
  </svg>
);

export const Bottom10ItemsIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 7V12M3 10.5L4.5 12L6 10.5" stroke="#0078d4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">10</text>
  </svg>
);

export const Bottom10PercentIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 7V12M3 10.5L4.5 12L6 10.5" stroke="#0078d4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="6.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">%</text>
  </svg>
);

export const AboveAverageIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="2" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 9V4M3 5.5L4.5 4L6 5.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">x̄</text>
  </svg>
);

export const BelowAverageIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="2" y="2" width="14" height="14" stroke="#555" strokeWidth="1" fill="#fff" />
    <line x1="2" y1="7" x2="16" y2="7" stroke="#555" strokeWidth="0.8" />
    <line x1="2" y1="11" x2="16" y2="11" stroke="#555" strokeWidth="0.8" />
    <line x1="7" y1="2" x2="7" y2="16" stroke="#555" strokeWidth="0.8" />
    <line x1="11" y1="2" x2="11" y2="16" stroke="#555" strokeWidth="0.8" />
    <rect x="2" y="7" width="5" height="9" fill="#f8cbad" opacity="0.9" />
    <path d="M4.5 7V12M3 10.5L4.5 12L6 10.5" stroke="#0078d4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="8" y="9" width="8" height="7" rx="0.5" stroke="#333" strokeWidth="0.8" fill="#fff" />
    <text x="12" y="14.5" fontSize="5.5" fontWeight="bold" textAnchor="middle" fill="#333" fontFamily="sans-serif">x̄</text>
  </svg>
);

export const IconSetPreview: React.FC<{ set: string }> = ({ set }) => {
  switch (set) {
    case 'arrows':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M13 7L7 2v3.2H2v3.6h5V12l6-5z" fill="#d83b01"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#c42b1c"/></svg>
        </span>
      );
    case 'arrowsGray':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M13 7L7 2v3.2H2v3.6h5V12l6-5z" fill="#737373"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#737373"/></svg>
        </span>
      );
    case 'triangles':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,2 2,12 12,12" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="2" y="5" width="10" height="4" fill="#d83b01"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,12 2,2 12,2" fill="#c42b1c"/></svg>
        </span>
      );
    case 'arrows4':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14" style={{ transform: 'rotate(45deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14" style={{ transform: 'rotate(135deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#ea580c"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#c42b1c"/></svg>
        </span>
      );
    case 'arrows4Gray':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14" style={{ transform: 'rotate(45deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14" style={{ transform: 'rotate(135deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#737373"/></svg>
        </span>
      );
    case 'arrows5':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#107c41"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14" style={{ transform: 'rotate(45deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#d97706"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M13 7L7 2v3.2H2v3.6h5V12l6-5z" fill="#f59e0b"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14" style={{ transform: 'rotate(135deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#ea580c"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#c42b1c"/></svg>
        </span>
      );
    case 'arrows5Gray':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14" style={{ transform: 'rotate(45deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M13 7L7 2v3.2H2v3.6h5V12l6-5z" fill="#737373"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14" style={{ transform: 'rotate(135deg)' }}><path d="M7 1L2 7h3.2v5h3.6V7H12L7 1z" fill="#737373"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M7 13L2 7h3.2V2h3.6v5H12l-5 6z" fill="#737373"/></svg>
        </span>
      );
    case 'lights':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#c42b1c"/></svg>
        </span>
      );
    case 'lightsRim':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#2d3748"/><circle cx="7" cy="7" r="3.8" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#2d3748"/><circle cx="7" cy="7" r="3.8" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#2d3748"/><circle cx="7" cy="7" r="3.8" fill="#c42b1c"/></svg>
        </span>
      );
    case 'signs':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,2 2,12 12,12" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#c42b1c"/></svg>
        </span>
      );
    case 'lights4':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#ea580c"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#737373"/></svg>
        </span>
      );
    case 'dots4':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#a80000"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#f8696b"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#a6a6a6"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#262626"/></svg>
        </span>
      );
    case 'symbolsCircled':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#107c41"/><path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#d97706"/><line x1="7" y1="4" x2="7" y2="7.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/><circle cx="7" cy="9.8" r="0.8" fill="#fff"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#c42b1c"/><path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </span>
      );
    case 'symbols':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7" stroke="#107c41" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><line x1="7" y1="2" x2="7" y2="8" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round"/><circle cx="7" cy="11.5" r="1.1" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="#c42b1c" strokeWidth="2.2" strokeLinecap="round"/></svg>
        </span>
      );
    case 'flags':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><line x1="3" y1="1" x2="3" y2="13" stroke="#444" strokeWidth="1.4"/><polygon points="3,2 11,5 3,8" fill="#107c41"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><line x1="3" y1="1" x2="3" y2="13" stroke="#444" strokeWidth="1.4"/><polygon points="3,2 11,5 3,8" fill="#d97706"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><line x1="3" y1="1" x2="3" y2="13" stroke="#444" strokeWidth="1.4"/><polygon points="3,2 11,5 3,8" fill="#c42b1c"/></svg>
        </span>
      );
    case 'stars':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,1 8.8,5.2 13.3,5.6 9.9,8.5 10.9,13 7,10.6 3.1,13 4.1,8.5 0.7,5.6 5.2,5.2" fill="#f59e0b" stroke="#d97706" strokeWidth="0.5"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,1 8.8,5.2 13.3,5.6 9.9,8.5 10.9,13 7,10.6 3.1,13 4.1,8.5 0.7,5.6 5.2,5.2" fill="#fff" stroke="#d97706" strokeWidth="0.5"/><path d="M7 1v9.6l-3.9 2.4 1-4.5L0.7 5.6l4.5-.4L7 1z" fill="#f59e0b"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><polygon points="7,1 8.8,5.2 13.3,5.6 9.9,8.5 10.9,13 7,10.6 3.1,13 4.1,8.5 0.7,5.6 5.2,5.2" fill="#fff" stroke="#999" strokeWidth="0.8"/></svg>
        </span>
      );
    case 'bars4':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="9" width="2" height="4" fill="#2b579a"/><rect x="4" y="6" width="2" height="7" fill="#cbd5e1"/><rect x="7" y="3" width="2" height="10" fill="#cbd5e1"/><rect x="10" y="0.5" width="2" height="12.5" fill="#cbd5e1"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="9" width="2" height="4" fill="#2b579a"/><rect x="4" y="6" width="2" height="7" fill="#2b579a"/><rect x="7" y="3" width="2" height="10" fill="#cbd5e1"/><rect x="10" y="0.5" width="2" height="12.5" fill="#cbd5e1"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="9" width="2" height="4" fill="#2b579a"/><rect x="4" y="6" width="2" height="7" fill="#2b579a"/><rect x="7" y="3" width="2" height="10" fill="#2b579a"/><rect x="10" y="0.5" width="2" height="12.5" fill="#cbd5e1"/></svg>
          <svg width="13" height="13" viewBox="0 0 14 14"><rect x="1" y="9" width="2" height="4" fill="#2b579a"/><rect x="4" y="6" width="2" height="7" fill="#2b579a"/><rect x="7" y="3" width="2" height="10" fill="#2b579a"/><rect x="10" y="0.5" width="2" height="12.5" fill="#2b579a"/></svg>
        </span>
      );
    case 'bars5':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="14" height="13" viewBox="0 0 15 14"><rect x="1" y="10" width="1.8" height="3" fill="#2b579a"/><rect x="3.8" y="7.5" width="1.8" height="5.5" fill="#cbd5e1"/><rect x="6.6" y="5" width="1.8" height="8" fill="#cbd5e1"/><rect x="9.4" y="2.5" width="1.8" height="10.5" fill="#cbd5e1"/><rect x="12.2" y="0" width="1.8" height="13" fill="#cbd5e1"/></svg>
          <svg width="14" height="13" viewBox="0 0 15 14"><rect x="1" y="10" width="1.8" height="3" fill="#2b579a"/><rect x="3.8" y="7.5" width="1.8" height="5.5" fill="#2b579a"/><rect x="6.6" y="5" width="1.8" height="8" fill="#cbd5e1"/><rect x="9.4" y="2.5" width="1.8" height="10.5" fill="#cbd5e1"/><rect x="12.2" y="0" width="1.8" height="13" fill="#cbd5e1"/></svg>
          <svg width="14" height="13" viewBox="0 0 15 14"><rect x="1" y="10" width="1.8" height="3" fill="#2b579a"/><rect x="3.8" y="7.5" width="1.8" height="5.5" fill="#2b579a"/><rect x="6.6" y="5" width="1.8" height="8" fill="#2b579a"/><rect x="9.4" y="2.5" width="1.8" height="10.5" fill="#cbd5e1"/><rect x="12.2" y="0" width="1.8" height="13" fill="#cbd5e1"/></svg>
          <svg width="14" height="13" viewBox="0 0 15 14"><rect x="1" y="10" width="1.8" height="3" fill="#2b579a"/><rect x="3.8" y="7.5" width="1.8" height="5.5" fill="#2b579a"/><rect x="6.6" y="5" width="1.8" height="8" fill="#2b579a"/><rect x="9.4" y="2.5" width="1.8" height="10.5" fill="#2b579a"/><rect x="12.2" y="0" width="1.8" height="13" fill="#cbd5e1"/></svg>
          <svg width="14" height="13" viewBox="0 0 15 14"><rect x="1" y="10" width="1.8" height="3" fill="#2b579a"/><rect x="3.8" y="7.5" width="1.8" height="5.5" fill="#2b579a"/><rect x="6.6" y="5" width="1.8" height="8" fill="#2b579a"/><rect x="9.4" y="2.5" width="1.8" height="10.5" fill="#2b579a"/><rect x="12.2" y="0" width="1.8" height="13" fill="#2b579a"/></svg>
        </span>
      );
    case 'pies':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.5" fill="#262626"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke="#262626" strokeWidth="1" fill="#fff"/><path d="M7 2a5 5 0 1 1-5 5H7V2z" fill="#262626"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke="#262626" strokeWidth="1" fill="#fff"/><path d="M7 2a5 5 0 0 1 0 10V2z" fill="#262626"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke="#262626" strokeWidth="1" fill="#fff"/><path d="M7 2a5 5 0 0 1 5 5H7V2z" fill="#262626"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" stroke="#262626" strokeWidth="1" fill="#fff"/></svg>
        </span>
      );
    case 'boxes':
      return (
        <span className="calc-cf-icon-strip">
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="1" y="7.5" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="7.5" width="5.5" height="5.5" fill="#2b579a"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="1" y="7.5" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="1" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="1" y="7.5" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="5.5" height="5.5" fill="#2b579a"/><rect x="7.5" y="1" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="1" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="7.5" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/></svg>
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="1" y="1" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="7.5" y="1" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="1" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/><rect x="7.5" y="7.5" width="5.5" height="5.5" fill="#e2e8f0"/></svg>
        </span>
      );
    default:
      return null;
  }
};

