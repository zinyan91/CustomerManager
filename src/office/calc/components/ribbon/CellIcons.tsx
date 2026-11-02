import React from 'react';

export const RibbonInsertIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="calc-ribbon-cell-icon">
    {/* 3x3 Table Grid */}
    <rect x="4.5" y="4.5" width="23" height="23" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="var(--bg-surface)" />
    <line x1="4.5" y1="12" x2="27.5" y2="12" stroke="currentColor" strokeWidth="1" />
    <line x1="4.5" y1="20" x2="27.5" y2="20" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="4.5" x2="12" y2="27.5" stroke="currentColor" strokeWidth="1" />
    <line x1="20" y1="4.5" x2="20" y2="27.5" stroke="currentColor" strokeWidth="1" />
    {/* Blue Row Insert Highlight */}
    <rect x="4.5" y="12" width="23" height="8" fill="var(--fl-accent)" opacity="0.3" />
    {/* Blue Arrow pointing in */}
    <path d="M1 16H8M5 13L8 16L5 19" stroke="var(--fl-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RibbonDeleteIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="calc-ribbon-cell-icon">
    {/* 3x3 Table Grid */}
    <rect x="4.5" y="4.5" width="23" height="23" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="var(--bg-surface)" />
    <line x1="4.5" y1="12" x2="27.5" y2="12" stroke="currentColor" strokeWidth="1" />
    <line x1="4.5" y1="20" x2="27.5" y2="20" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="4.5" x2="12" y2="27.5" stroke="currentColor" strokeWidth="1" />
    <line x1="20" y1="4.5" x2="20" y2="27.5" stroke="currentColor" strokeWidth="1" />
    {/* Red Row Delete Highlight */}
    <rect x="12" y="12" width="8" height="8" fill="var(--fl-accent)" opacity="0.3" />
    {/* Red Cross */}
    <path d="M19 13L26 20M26 13L19 20" stroke="#d83b01" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const RibbonFormatIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="calc-ribbon-cell-icon">
    {/* Top measurement dimension line */}
    <line x1="7" y1="2.5" x2="25" y2="2.5" stroke="var(--fl-accent)" strokeWidth="1.6" />
    <line x1="7" y1="1" x2="7" y2="4" stroke="var(--fl-accent)" strokeWidth="1.4" />
    <line x1="25" y1="1" x2="25" y2="4" stroke="var(--fl-accent)" strokeWidth="1.4" />
    {/* 3x3 Table Grid */}
    <rect x="4.5" y="6.5" width="23" height="21" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="var(--bg-surface)" />
    <line x1="4.5" y1="13.5" x2="27.5" y2="13.5" stroke="currentColor" strokeWidth="1" />
    <line x1="4.5" y1="20.5" x2="27.5" y2="20.5" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="6.5" x2="12" y2="27.5" stroke="currentColor" strokeWidth="1" />
    <line x1="20" y1="6.5" x2="20" y2="27.5" stroke="currentColor" strokeWidth="1" />
    {/* Highlighted cell */}
    <rect x="12" y="13.5" width="8" height="7" fill="var(--fl-accent)" opacity="0.3" />
  </svg>
);

export const RibbonCellStylesIcon: React.FC = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="calc-ribbon-cell-icon">
    {/* Frame */}
    <rect x="4.5" y="4.5" width="23" height="23" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="var(--bg-surface)" />
    <line x1="4.5" y1="16" x2="27.5" y2="16" stroke="currentColor" strokeWidth="1" />
    <line x1="16" y1="4.5" x2="16" y2="27.5" stroke="currentColor" strokeWidth="1" />
    {/* Top-left: Good / green cell */}
    <rect x="5.5" y="5.5" width="9.5" height="9.5" fill="#c6efce" />
    <path d="M7.5 10.5H13" stroke="#006100" strokeWidth="1.6" strokeLinecap="round" />
    {/* Top-right: Bad / red cell */}
    <rect x="17" y="5.5" width="9.5" height="9.5" fill="#ffc7ce" />
    <path d="M19 10.5H24.5" stroke="#9c0006" strokeWidth="1.6" strokeLinecap="round" />
    {/* Bottom-left: Neutral / yellow cell */}
    <rect x="5.5" y="17" width="9.5" height="9.5" fill="#ffeb9c" />
    <path d="M7.5 22H13" stroke="#9c6500" strokeWidth="1.6" strokeLinecap="round" />
    {/* Bottom-right: Accent / blue cell */}
    <rect x="17" y="17" width="9.5" height="9.5" fill="#bdd7ee" />
    <path d="M19 22H24.5" stroke="#1f4e79" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const InsertCellIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="0.8" />
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <rect x="2" y="6" width="4" height="4" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M1 8H5M3 6L5 8L3 10" stroke="var(--fl-accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InsertRowIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="0.8" />
    <rect x="2" y="6" width="12" height="4" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M1 8H5M3 6L5 8L3 10" stroke="var(--fl-accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InsertColIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <rect x="6" y="2" width="4" height="12" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M8 1V5M6 3L8 5L10 3" stroke="var(--fl-accent)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const InsertSheetIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="0.8" />
    <line x1="6" y1="6.5" x2="6" y2="13" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="6.5" x2="10" y2="13" stroke="currentColor" strokeWidth="0.8" />
    <path d="M10 10H14M12 8V12" stroke="var(--fl-accent)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DeleteCellIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="0.8" />
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <rect x="6" y="6" width="4" height="4" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M9 5L14 10M14 5L9 10" stroke="#d83b01" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const DeleteRowIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="0.8" />
    <rect x="2" y="6" width="12" height="4" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M11 6L15 10M15 6L11 10" stroke="#d83b01" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const DeleteColIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="6" y1="2" x2="6" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="2" x2="10" y2="14" stroke="currentColor" strokeWidth="0.8" />
    <rect x="6" y="2" width="4" height="12" fill="var(--fl-accent)" opacity="0.35" />
    <path d="M7 10L11 14M11 10L7 14" stroke="#d83b01" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const DeleteSheetIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="0.8" />
    <line x1="6" y1="6.5" x2="6" y2="13" stroke="currentColor" strokeWidth="0.8" />
    <line x1="10" y1="6.5" x2="10" y2="13" stroke="currentColor" strokeWidth="0.8" />
    <path d="M10 7L14 11M14 7L10 11" stroke="#d83b01" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const RowHeightIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <line x1="1" y1="2.5" x2="7" y2="2.5" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <line x1="1" y1="13.5" x2="7" y2="13.5" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <path d="M4 2.5V13.5M2 4.5L4 2.5L6 4.5M2 11.5L4 13.5L6 11.5" stroke="var(--fl-accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="9" y="3.5" width="6" height="9" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="9" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

export const ColWidthIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <line x1="2.5" y1="1" x2="2.5" y2="7" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <line x1="13.5" y1="1" x2="13.5" y2="7" stroke="var(--fl-accent)" strokeWidth="1.2" />
    <path d="M2.5 4H13.5M4.5 2L2.5 4L4.5 6M11.5 2L13.5 4L11.5 6" stroke="var(--fl-accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3.5" y="9" width="9" height="6" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="8" y1="9" x2="8" y2="15" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

export const RenameSheetIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <path d="M8 12L13.5 6.5L14.5 7.5L9 13H8V12Z" fill="var(--fl-accent)" stroke="var(--fl-accent)" strokeWidth="0.6" />
  </svg>
);

export const ProtectSheetIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1" fill="var(--bg-surface)" />
    <line x1="2" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="0.8" />
    <rect x="9" y="8" width="5.5" height="4.5" rx="0.5" fill="#d83b01" />
    <path d="M10.2 8V6.8C10.2 6 10.9 5.3 11.75 5.3C12.6 5.3 13.3 6 13.3 6.8V8" stroke="#d83b01" strokeWidth="1.1" fill="none" />
  </svg>
);

export const LockCellIcon: React.FC<{ isLocked?: boolean }> = ({ isLocked }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3.5" y="7" width="9" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" fill={isLocked ? '#fce4d6' : 'var(--bg-surface)'} />
    <path d="M5.5 7V4.5C5.5 3.1 6.6 2 8 2C9.4 2 10.5 3.1 10.5 4.5V7" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <circle cx="8" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

export const FormatCellsIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="var(--fl-accent)" strokeWidth="1.2" fill="var(--bg-surface)" />
    <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" stroke="var(--fl-accent)" strokeWidth="0.8" strokeDasharray="1 1" />
    <line x1="6.5" y1="2.5" x2="6.5" y2="13.5" stroke="var(--fl-accent)" strokeWidth="0.8" strokeDasharray="1 1" />
    <circle cx="10" cy="10" r="1.5" fill="var(--fl-accent)" />
  </svg>
);
